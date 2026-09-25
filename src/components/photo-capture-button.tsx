"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPhoto } from "@/app/deliveries/actions";
import type { Database } from "@/lib/types/database";

type PhotoType = Database["public"]["Tables"]["label_photos"]["Row"]["photo_type"];

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
      for (const file of files) {
        const path = `${deliveryId}/${photoType}-${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("label-photos").upload(path, file);
        if (uploadError) throw new Error(uploadError.message);

        await addPhoto(deliveryId, path, photoType);
      }
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
        capture="environment"
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
