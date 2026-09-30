"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { dedupeFiles } from "@/lib/dedupe-files";
import { commitLabelPhotosAsync, uploadBusInvoicesAsync } from "@/app/actions";
import { ContinuousCamera } from "@/components/continuous-camera";

// AI 분류는 이제 업로드를 막지 않고 백그라운드(after)에서 도니까, 화질을 더 올려도 체감
// 업로드 속도에는 영향이 없다 — 손글씨 고객명 인식률을 높이는 쪽을 우선한다. Claude
// 표준 모델의 실질 해상도 한계(장변 약 1568px)에 가깝게 잡았다.
const VISION_MAX_DIMENSION = 1536;
const VISION_QUALITY = 0.85;

type UploadResult = { storagePath: string; toVision: File | Blob };

export function CaptureScreen({
  knownTerminals,
  knownCompanyNames,
  defaultDate,
}: {
  knownTerminals: string[];
  knownCompanyNames: string[];
  defaultDate: string;
}) {
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

  // 사진마다 Claude 호출이 끝나야 "업로드 완료"로 보이는 게 리드타임의 진짜 원인이었다.
  // 이제 여기서는 스토리지 업로드만 하고 끝낸다 — AI 인식은 커밋 액션이 응답을 보낸 뒤
  // 백그라운드에서 계속한다(src/app/actions.ts의 commitLabelPhotosAsync·uploadBusInvoicesAsync).
  async function uploadFiles(
    files: File[],
    folder: "label" | "invoice",
    onProgress: (count: number) => void,
  ): Promise<{ succeeded: UploadResult[]; failedNumbers: number[] }> {
    const supabase = createClient();
    const failedNumbers: number[] = [];

    const results = await Promise.all(
      files.map(async (file, index) => {
        try {
          // 저장용(사람이 확대해서 볼 사진)과 AI 인식용을 각각 원본에서 바로 축소한다.
          const [toUpload, toVision] = await Promise.all([
            compressImage(file).catch(() => file),
            compressImage(file, VISION_MAX_DIMENSION, VISION_QUALITY).catch(() => file),
          ]);
          const storagePath = `${folder}/${crypto.randomUUID()}.jpg`;

          const { error: uploadError } = await supabase.storage.from("label-photos").upload(storagePath, toUpload);
          if (uploadError) throw new Error(uploadError.message);

          return { storagePath, toVision };
        } catch {
          // 몇 번째 사진인지 알아야 그 사진만 다시 찍을 수 있다 — "일부 실패"라고만 하면
          // 이미 성공한 사진까지 다시 올려서 중복이 생길 수 있다.
          failedNumbers.push(index + 1);
          return null;
        } finally {
          onProgress(1);
        }
      }),
    );

    return { succeeded: results.filter((r): r is UploadResult => r !== null), failedNumbers };
  }

  function buildCommitFormData(succeeded: UploadResult[]): FormData {
    const formData = new FormData();
    formData.set("storagePaths", JSON.stringify(succeeded.map((s) => s.storagePath)));
    formData.set("knownTerminals", JSON.stringify(knownTerminals));
    formData.set("knownCompanyNames", JSON.stringify(knownCompanyNames));
    succeeded.forEach((s, i) => formData.set(`image_${i}`, s.toVision, "photo.jpg"));
    return formData;
  }

  async function handleFiles(files: File[]) {
    setError(null);
    setDoneMessage(null);
    setUploading(true);
    setProcessedCount(0);

    // 갤러리에서 같은 사진을 두 번 고르는 실수를 미리 걸러낸다 — 택배송장 장수가 부풀려지면
    // 버스송장 수량과의 대사 결과가 틀어지기 때문에 업로드 전에 막는 게 낫다.
    const { unique, duplicateCount } = await dedupeFiles(files);
    setTotalCount(unique.length);

    const { succeeded, failedNumbers } = await uploadFiles(unique, "label", () =>
      setProcessedCount((c) => c + 1),
    );

    try {
      if (succeeded.length > 0) {
        await commitLabelPhotosAsync(defaultDate, buildCommitFormData(succeeded));

        // 실패·중복 없이 깔끔하게 끝났으면 결과를 굳이 여기서 문구로 보여주지 않고, 곧
        // "미확인"에서 실제 터미널로 바뀌는 걸 바로 눈으로 볼 수 있는 확인 탭으로 이동한다.
        // 알려줄 게 있으면(실패한 사진 등) 먼저 읽을 수 있도록 이 화면에 머무른다.
        if (failedNumbers.length === 0 && duplicateCount === 0) {
          setUploading(false);
          setCameraOpen(false);
          router.push("/review");
          return;
        }

        const notes = [
          duplicateCount > 0 ? `중복 ${duplicateCount}장 제외` : null,
          failedNumbers.length > 0 ? `${failedNumbers.join(", ")}번째 사진 업로드 실패` : null,
        ].filter((n): n is string => n !== null);
        setDoneMessage(`업로드 완료: ${succeeded.length}장 (${notes.join(" · ")})`);
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

    const { succeeded, failedNumbers } = await uploadFiles(unique, "invoice", () =>
      setInvoiceProcessedCount((c) => c + 1),
    );

    try {
      if (succeeded.length > 0) {
        await uploadBusInvoicesAsync(defaultDate, buildCommitFormData(succeeded));

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
        setInvoiceDoneMessage(`업로드 완료: ${succeeded.length}장 (${notes.join(" · ")})`);
      } else if (failedNumbers.length > 0) {
        setInvoiceError(`${failedNumbers.join(", ")}번째 사진 업로드에 실패했습니다. 다시 촬영해주세요.`);
      }
    } catch (e) {
      setInvoiceError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setInvoiceUploading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <button
        onClick={() => setCameraOpen(true)}
        className="flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-3xl bg-[#10223d] text-[#fffdf0] shadow-[0_12px_24px_-8px_rgba(16,34,61,0.45)] transition-colors active:bg-[#0c1a30]"
      >
        <Package className="h-7 w-7" strokeWidth={2.25} />
        <span className="px-2 text-center text-2xl font-semibold leading-tight">택배송장 올리기</span>
      </button>

      <button
        onClick={() => setInvoiceCameraOpen(true)}
        className="flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-3xl bg-blue-600 text-white shadow-[0_12px_24px_-8px_rgba(37,99,235,0.45)] transition-colors active:bg-blue-700"
      >
        <Bus className="h-7 w-7" strokeWidth={2.25} />
        <span className="px-2 text-center text-2xl font-semibold leading-tight">버스송장 올리기</span>
      </button>

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
