"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPhotos } from "@/app/deliveries/actions";
import type { Database } from "@/lib/types/database";

type PhotoType = Database["public"]["Tables"]["label_photos"]["Row"]["photo_type"];

// 업로드 전 브라우저에서 미리 축소·압축한다 — 휴대폰 카메라 원본(수 MB)을 그대로 올리면
// 터미널 현장 같은 약한 네트워크에서 특히 느리다. 실패하면 원본을 그대로 쓴다.
async function compressImage(file: File, maxDimension = 1600, quality = 0.75): Promise<File | Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob ?? file;
}

export function PhotoCaptureButton({
  deliveryId,
  photoType,
  label,
  multiple = false,
}: {
  deliveryId: string;
  photoType: PhotoType;
  label: string;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      // 파일마다 순서대로 올리지 않고 한 번에 병렬로 올린 다음, DB에는 한 번의 insert로 기록한다.
      const uploaded = await Promise.all(
        files.map(async (file) => {
          let toUpload: File | Blob = file;
          try {
            toUpload = await compressImage(file);
          } catch {
            // 압축이 안 되는 환경이면 원본 그대로 올린다
          }
          const path = `${deliveryId}/${photoType}-${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage.from("label-photos").upload(path, toUpload);
          if (uploadError) throw new Error(uploadError.message);
          return { storagePath: path, photoType };
        }),
      );

      await addPhotos(deliveryId, uploaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // 버스 송장은 그 자리에서 바로 한 장 찍어야 하니 카메라를 강제로 연다.
        // 라벨 사진은 상차 직전에 미리 찍어두는 경우가 많아, 카메라를 강제하지 않고
        // 갤러리에서 이미 찍어둔 사진을 한 번에 여러 장 고를 수 있게 한다.
        capture={photoType === "invoice" ? "environment" : undefined}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="min-h-20 w-full rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center text-xl font-bold text-zinc-900 disabled:opacity-50"
      >
        {uploading ? "업로드 중..." : `📷 ${label}`}
      </button>
      {error && <p className="mt-2 text-lg text-red-600">{error}</p>}
    </div>
  );
}
