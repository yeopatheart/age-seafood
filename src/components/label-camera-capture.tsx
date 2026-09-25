"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addLabelPhoto } from "@/app/bus-trips/actions";

export function LabelCameraCapture({ busTripId }: { busTripId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const path = `${busTripId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("label-photos").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      await addLabelPhoto(busTripId, path);
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
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded border-2 border-dashed py-4 text-center font-medium disabled:opacity-50"
      >
        {uploading ? "업로드 중..." : "라벨 사진 촬영"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
