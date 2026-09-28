"use client";

import { useState } from "react";
import { Package, Bus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { commitLabelPhotoGroups, uploadBusInvoice } from "@/app/actions";
import { suggestTerminalName, suggestBusInvoiceInfo } from "@/app/vision-actions";
import { Button } from "@/components/ui/button";
import { ContinuousCamera } from "@/components/continuous-camera";

const UNRECOGNIZED = "미확인";

export function CaptureScreen({ knownTerminals, defaultDate }: { knownTerminals: string[]; defaultDate: string }) {
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
    setTotalCount(files.length);

    const supabase = createClient();
    const groups = new Map<string, string[]>();

    await Promise.all(
      files.map(async (file) => {
        try {
          let toUpload: File | Blob = file;
          try {
            toUpload = await compressImage(file);
          } catch {
            // 압축이 안 되는 환경이면 원본 그대로 올린다
          }
          const storagePath = `label/${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage.from("label-photos").upload(storagePath, toUpload);
          if (uploadError) throw new Error(uploadError.message);

          const suggested = await suggestTerminalName(storagePath, knownTerminals);
          const groupName = suggested?.trim() || UNRECOGNIZED;
          groups.set(groupName, [...(groups.get(groupName) ?? []), storagePath]);
        } catch {
          setError("일부 사진 업로드에 실패했습니다. 다시 시도해주세요.");
        } finally {
          setProcessedCount((c) => c + 1);
        }
      }),
    );

    try {
      const payload = Array.from(groups.entries()).map(([terminalName, storagePaths]) => ({
        terminalName,
        storagePaths,
      }));
      await commitLabelPhotoGroups(defaultDate, payload);
      const summary = payload.map((g) => `${g.terminalName} ${g.storagePaths.length}장`).join(", ");
      setDoneMessage(`분류 완료: ${summary}`);
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
    setInvoiceTotalCount(files.length);

    const supabase = createClient();
    const results: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          let toUpload: File | Blob = file;
          try {
            toUpload = await compressImage(file);
          } catch {
            // 압축이 안 되는 환경이면 원본 그대로 올린다
          }
          const storagePath = `invoice/${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage.from("label-photos").upload(storagePath, toUpload);
          if (uploadError) throw new Error(uploadError.message);

          const suggested = await suggestBusInvoiceInfo(storagePath, knownTerminals);
          await uploadBusInvoice(defaultDate, storagePath, suggested);

          const name = suggested.terminalName?.trim() || UNRECOGNIZED;
          const time = suggested.departureTime ? ` ${suggested.departureTime}` : "";
          const box = suggested.boxCount !== null ? ` · 박스 ${suggested.boxCount}개` : "";
          results.push(`${name}${time}${box}`);
        } catch {
          setInvoiceError("일부 버스송장 업로드에 실패했습니다. 다시 시도해주세요.");
        } finally {
          setInvoiceProcessedCount((c) => c + 1);
        }
      }),
    );

    if (results.length > 0) setInvoiceDoneMessage(`매칭 완료: ${results.join(", ")}`);
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
