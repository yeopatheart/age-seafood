"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPhotos } from "@/app/deliveries/actions";
import { suggestInvoiceBoxCount, confirmInvoiceBoxCount } from "@/app/deliveries/vision-actions";
import { compressImage } from "@/lib/compress-image";
import { PhotoGallery } from "@/components/photo-gallery";

export function InvoiceSection({
  deliveryId,
  photos,
  confirmedCount,
  labelPhotoCount,
}: {
  deliveryId: string;
  photos: { id: string; url: string }[];
  confirmedCount: number | null;
  labelPhotoCount: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggested, setSuggested] = useState<number | null>(null);
  const [countInput, setCountInput] = useState(confirmedCount !== null ? String(confirmedCount) : "");
  const [saved, setSaved] = useState(confirmedCount !== null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setSaved(false);
    setSuggested(null);
    setUploading(true);

    try {
      const supabase = createClient();
      let toUpload: File | Blob = file;
      try {
        toUpload = await compressImage(file);
      } catch {
        // 압축이 안 되는 환경이면 원본 그대로 올린다
      }
      const path = `${deliveryId}/invoice-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("label-photos").upload(path, toUpload);
      if (uploadError) throw new Error(uploadError.message);

      await addPhotos(deliveryId, [{ storagePath: path, photoType: "invoice" }]);
      setUploading(false);

      // 사진 속 숫자를 AI가 읽어 미리 채워준다 — 그대로 믿지 않고 사람이 확인한다.
      setChecking(true);
      const guess = await suggestInvoiceBoxCount(path);
      setChecking(false);
      if (guess !== null) {
        setSuggested(guess);
        setCountInput(String(guess));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
      setUploading(false);
      setChecking(false);
    }
  }

  async function handleConfirm() {
    const count = Number(countInput);
    if (!countInput.trim() || Number.isNaN(count) || count < 0) {
      setError("숫자를 확인해주세요.");
      return;
    }
    setError(null);
    try {
      await confirmInvoiceBoxCount(deliveryId, count);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  }

  const parsedCount = countInput.trim() ? Number(countInput) : null;
  const mismatch = parsedCount !== null && parsedCount !== labelPhotoCount;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="min-h-20 w-full rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center text-xl font-bold text-zinc-900 disabled:opacity-50"
      >
        {uploading ? "업로드 중..." : `📷 ${photos.length > 0 ? "버스 송장 사진 다시 촬영" : "버스 송장 사진 촬영"}`}
      </button>

      <PhotoGallery photos={photos} alt="버스 송장 사진" emptyText="아직 버스 송장 사진이 없습니다." />

      {(checking || countInput || confirmedCount !== null) && (
        <div className="space-y-2 rounded-3xl bg-zinc-50 p-4">
          <label className="text-lg font-medium">
            {checking ? "AI가 박스 수량을 읽는 중..." : "박스 수량 확인"}
          </label>
          {!checking && (
            <>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  value={countInput}
                  onChange={(e) => {
                    setCountInput(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="숫자 입력"
                  className="h-14 w-32 rounded-2xl border-2 border-zinc-200 px-4 text-lg"
                />
                <button
                  onClick={handleConfirm}
                  className="min-h-14 flex-1 rounded-full bg-black text-lg font-bold text-white"
                >
                  {saved ? "저장됨 ✓" : "확인"}
                </button>
              </div>
              {suggested !== null && (
                <p className="text-base text-zinc-600">AI가 읽은 값: {suggested} (틀리면 위에서 고쳐주세요)</p>
              )}
              {parsedCount !== null && (
                <p className={`text-base font-semibold ${mismatch ? "text-red-600" : "text-green-700"}`}>
                  라벨 사진 {labelPhotoCount}장 · 송장 수량 {parsedCount} — {mismatch ? "불일치" : "일치"}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="text-lg text-red-600">{error}</p>}
    </div>
  );
}
