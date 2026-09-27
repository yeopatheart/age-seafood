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
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);

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
      setDoneMessage(`${files.length}장 업로드 완료 — 확인 탭에서 분류 결과를 볼 수 있어요.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInvoiceFiles(files: File[]) {
    setError(null);
    setInvoiceStatus(`버스송장 업로드 중... (0/${files.length})`);

    const supabase = createClient();
    let done = 0;

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
        } catch {
          setError("일부 버스송장 업로드에 실패했습니다. 다시 시도해주세요.");
        } finally {
          done += 1;
          setInvoiceStatus(`버스송장 업로드 중... (${done}/${files.length})`);
        }
      }),
    );

    setInvoiceStatus(`버스송장 ${files.length}장 업로드 완료 — 확인 탭에서 매칭 결과를 볼 수 있어요.`);
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

      {uploading && (
        <p className="text-lg font-medium text-zinc-500">
          업로드·분류 중... <span className="tabular-nums">{processedCount}</span>/
          <span className="tabular-nums">{totalCount}</span>
        </p>
      )}
      {doneMessage && <p className="text-lg font-medium text-emerald-600">{doneMessage}</p>}
      {invoiceStatus && <p className="text-lg font-medium text-zinc-500">{invoiceStatus}</p>}
      {error && <p className="text-lg font-medium text-rose-600">{error}</p>}

      {cameraOpen && (
        <ContinuousCamera title="택배송장 연속촬영" onClose={() => setCameraOpen(false)} onSubmit={handleFiles} />
      )}

      {invoiceCameraOpen && (
        <ContinuousCamera
          title="버스송장 연속촬영"
          onClose={() => setInvoiceCameraOpen(false)}
          onSubmit={handleInvoiceFiles}
        />
      )}
    </div>
  );
}
