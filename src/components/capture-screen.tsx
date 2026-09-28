"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { dedupeFiles } from "@/lib/dedupe-files";
import { createLimiter } from "@/lib/concurrency-limit";
import { commitLabelPhotoGroups, uploadBusInvoice } from "@/app/actions";
import { suggestTerminalName, suggestBusInvoiceInfo } from "@/app/vision-actions";
import { Button } from "@/components/ui/button";
import { ContinuousCamera } from "@/components/continuous-camera";

const UNRECOGNIZED = "미확인";

// Claude 호출을 한 번에 너무 많이 동시에 보내면 API 속도 제한에 걸려 재시도로 오히려 더
// 느려진다 — 라벨·버스송장 업로드가 겹쳐도 하나의 한도를 같이 쓰도록 모듈 스코프에 둔다.
const visionLimit = createLimiter(4);

// AI는 글자만 읽으면 되므로 사람이 확대해서 보는 저장용 사진보다 훨씬 작게 보내도 된다.
// 원본에서 바로 이 크기로 축소하면(저장용을 다시 축소하는 이중 압축이 아니라) 전송량이
// 줄면서도 화질은 오히려 덜 손실된다.
const VISION_MAX_DIMENSION = 1280;
const VISION_QUALITY = 0.7;

export function CaptureScreen({ knownTerminals, defaultDate }: { knownTerminals: string[]; defaultDate: string }) {
  const router = useRouter();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [invoiceCameraOpen, setInvoiceCameraOpen] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [invoiceProcessedCount, setInvoiceProcessedCount] = useState(0);
  const [invoiceTotalCount, setInvoiceTotalCount] = useState(0);
  const [invoiceDoneMessage, setInvoiceDoneMessage] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // 촬영이든 갤러리 선택이든 같은 onSubmit으로 들어오므로, 어느 쪽으로 골랐는지와 무관하게
  // 분류 결과를 바로 보여준다 — "N장 업로드 완료" 대신 실제로 어느 터미널로 분류됐는지 보여준다.
  async function handleFiles(files: File[]) {
    setError(null);
    setDoneMessage(null);
    setUploading(true);
    setProcessedCount(0);

    // 갤러리에서 같은 사진을 두 번 고르는 실수를 미리 걸러낸다 — 택배송장 장수가 부풀려지면
    // 버스송장 수량과의 대사 결과가 틀어지기 때문에 업로드 전에 막는 게 낫다.
    const { unique, duplicateCount } = await dedupeFiles(files);
    setTotalCount(unique.length);

    const supabase = createClient();
    const groups = new Map<string, string[]>();
    const failedNumbers: number[] = [];

    await Promise.all(
      unique.map(async (file, index) => {
        try {
          // 저장용(사람이 확대해서 볼 사진)과 AI 인식용을 각각 원본에서 바로 축소한다 — AI는
          // 글자만 읽으면 되니 저장용보다 더 작게 보내 전송 시간을 줄인다.
          const [toUpload, toVision] = await Promise.all([
            compressImage(file).catch(() => file),
            compressImage(file, VISION_MAX_DIMENSION, VISION_QUALITY).catch(() => file),
          ]);
          const storagePath = `label/${crypto.randomUUID()}.jpg`;

          const formData = new FormData();
          formData.set("image", toVision, "photo.jpg");
          formData.set("knownTerminals", JSON.stringify(knownTerminals));

          // 업로드가 끝난 뒤에야 AI를 부르지 않고, 스토리지 업로드와 AI 인식을 동시에 시작한다
          // — 순차 대비 리드타임이 크게 줄어든다. AI 호출만 동시 개수를 제한해서(visionLimit)
          // 한 번에 많이 올려도 속도 제한에 걸리지 않게 한다.
          const [{ error: uploadError }, suggested] = await Promise.all([
            supabase.storage.from("label-photos").upload(storagePath, toUpload),
            visionLimit(() => suggestTerminalName(formData)),
          ]);
          if (uploadError) throw new Error(uploadError.message);

          const groupName = suggested?.trim() || UNRECOGNIZED;
          groups.set(groupName, [...(groups.get(groupName) ?? []), storagePath]);
        } catch {
          // 몇 번째 사진인지 알아야 그 사진만 다시 찍을 수 있다 — "일부 실패"라고만 하면
          // 이미 성공한 사진까지 다시 올려서 중복이 생길 수 있다.
          failedNumbers.push(index + 1);
        } finally {
          setProcessedCount((c) => c + 1);
        }
      }),
    );

    const payload = Array.from(groups.entries()).map(([terminalName, storagePaths]) => ({
      terminalName,
      storagePaths,
    }));

    try {
      if (payload.length > 0) {
        await commitLabelPhotoGroups(defaultDate, payload);

        // 실패·중복 없이 깔끔하게 끝났으면 결과를 굳이 여기서 문구로 보여주지 않고, 방금
        // 분류된 그룹을 바로 눈으로 확인할 수 있는 확인 탭으로 이동한다. 알려줄 게 있으면
        // (실패한 사진 등) 먼저 읽을 수 있도록 이 화면에 머무른다.
        if (failedNumbers.length === 0 && duplicateCount === 0) {
          setUploading(false);
          setCameraOpen(false);
          router.push("/review");
          return;
        }

        const summary = payload.map((g) => `${g.terminalName} ${g.storagePaths.length}장`).join(", ");
        const notes = [
          duplicateCount > 0 ? `중복 ${duplicateCount}장 제외` : null,
          `${failedNumbers.join(", ")}번째 사진 업로드 실패`,
        ].filter((n): n is string => n !== null);
        setDoneMessage(`분류 완료: ${summary} (${notes.join(" · ")})`);
      } else if (failedNumbers.length > 0) {
        setError(`${failedNumbers.join(", ")}번째 사진 업로드에 실패했습니다. 다시 촬영해주세요.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInvoiceFiles(files: File[]) {
    setInvoiceError(null);
    setInvoiceDoneMessage(null);
    setInvoiceUploading(true);
    setInvoiceProcessedCount(0);

    const { unique, duplicateCount } = await dedupeFiles(files);
    setInvoiceTotalCount(unique.length);

    const supabase = createClient();
    const results: string[] = [];
    const failedNumbers: number[] = [];

    await Promise.all(
      unique.map(async (file, index) => {
        try {
          const [toUpload, toVision] = await Promise.all([
            compressImage(file).catch(() => file),
            compressImage(file, VISION_MAX_DIMENSION, VISION_QUALITY).catch(() => file),
          ]);
          const storagePath = `invoice/${crypto.randomUUID()}.jpg`;

          const formData = new FormData();
          formData.set("image", toVision, "photo.jpg");
          formData.set("knownTerminals", JSON.stringify(knownTerminals));

          // 업로드가 끝난 뒤에야 AI를 부르지 않고, 스토리지 업로드와 AI 인식을 동시에 시작한다
          // — 순차 대비 리드타임이 크게 줄어든다. AI 호출만 동시 개수를 제한해서(visionLimit)
          // 한 번에 많이 올려도 속도 제한에 걸리지 않게 한다.
          const [{ error: uploadError }, suggested] = await Promise.all([
            supabase.storage.from("label-photos").upload(storagePath, toUpload),
            visionLimit(() => suggestBusInvoiceInfo(formData)),
          ]);
          if (uploadError) throw new Error(uploadError.message);

          await uploadBusInvoice(defaultDate, storagePath, suggested);

          const name = suggested.terminalName?.trim() || UNRECOGNIZED;
          const time = suggested.departureTime ? ` ${suggested.departureTime}` : "";
          const box = suggested.boxCount !== null ? ` · 박스 ${suggested.boxCount}개` : "";
          results.push(`${name}${time}${box}`);
        } catch {
          failedNumbers.push(index + 1);
        } finally {
          setInvoiceProcessedCount((c) => c + 1);
        }
      }),
    );

    if (results.length > 0) {
      // 실패·중복 없이 깔끔하게 끝났으면 매칭된 그룹을 바로 볼 수 있는 확인 탭으로 이동한다.
      if (failedNumbers.length === 0 && duplicateCount === 0) {
        setInvoiceUploading(false);
        setInvoiceCameraOpen(false);
        router.push("/review");
        return;
      }

      const notes = [
        duplicateCount > 0 ? `중복 ${duplicateCount}장 제외` : null,
        failedNumbers.length > 0 ? `${failedNumbers.join(", ")}번째 사진 업로드 실패` : null,
      ].filter((n): n is string => n !== null);
      setInvoiceDoneMessage(`매칭 완료: ${results.join(", ")} (${notes.join(" · ")})`);
    } else if (failedNumbers.length > 0) {
      setInvoiceError(`${failedNumbers.join(", ")}번째 사진 업로드에 실패했습니다. 다시 촬영해주세요.`);
    }
    setInvoiceUploading(false);
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setCameraOpen(true)}
        className="flex min-h-24 w-full items-center justify-center gap-2 text-2xl shadow-[0_12px_24px_-8px_rgba(37,99,235,0.45)]"
      >
        <Package className="h-7 w-7" strokeWidth={2.25} />
        택배송장 올리기
      </Button>

      <Button
        variant="accent"
        onClick={() => setInvoiceCameraOpen(true)}
        className="flex min-h-24 w-full items-center justify-center gap-2 text-2xl shadow-[0_12px_24px_-8px_rgba(217,119,6,0.45)]"
      >
        <Bus className="h-7 w-7" strokeWidth={2.25} />
        버스송장 올리기
      </Button>

      {cameraOpen && (
        <ContinuousCamera
          title="택배송장 연속촬영"
          onClose={() => setCameraOpen(false)}
          onSubmit={handleFiles}
          uploadProgress={uploading ? { done: processedCount, total: totalCount } : null}
          resultMessage={!uploading && (doneMessage || error) ? { text: (doneMessage ?? error)!, isError: !!error } : null}
        />
      )}

      {invoiceCameraOpen && (
        <ContinuousCamera
          title="버스송장 연속촬영"
          onClose={() => setInvoiceCameraOpen(false)}
          onSubmit={handleInvoiceFiles}
          uploadProgress={invoiceUploading ? { done: invoiceProcessedCount, total: invoiceTotalCount } : null}
          resultMessage={
            !invoiceUploading && (invoiceDoneMessage || invoiceError)
              ? { text: (invoiceDoneMessage ?? invoiceError)!, isError: !!invoiceError }
              : null
          }
        />
      )}
    </div>
  );
}
