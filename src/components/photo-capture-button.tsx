"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPhotos } from "@/app/deliveries/actions";
import { compressImage } from "@/lib/compress-image";
import type { Database } from "@/lib/types/database";

type PhotoType = Database["public"]["Tables"]["label_photos"]["Row"]["photo_type"];

// 라벨 사진 전용. 상차 직전 휴대폰 기본 카메라로 미리 찍어두는 경우가 많아, 카메라를 강제로
// 열지 않고 갤러리에서 이미 찍어둔 사진을 한 번에 여러 장 고를 수 있게 한다.
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
