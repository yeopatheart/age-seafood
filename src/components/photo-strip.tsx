"use client";

import { useState } from "react";
import Image from "next/image";

type Photo = { id: string; url: string };

export const NEW_GROUP = "__new__";

// 사진 여러 장을 가로로 스크롤하며 훑어볼 수 있게 보여준다. 썸네일을 누르면 원본 크기로
// 확대해서 볼 수 있다 — 손글씨 확인처럼 작은 글씨를 읽어야 할 때 필요하다.
// moveOptions·onMove가 주어지면(라벨 사진 전용) 확대 화면에서 바로 다른 터미널로 옮길 수 있다.
export function PhotoStrip({
  photos,
  moveOptions,
  onMove,
}: {
  photos: Photo[];
  moveOptions?: string[];
  onMove?: (photoId: string, targetName: string) => void;
}) {
  const [zoomed, setZoomed] = useState<Photo | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setZoomed(photo)}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition-transform active:scale-95"
          >
            {/* 서명 URL 원본(최대 1600px)을 그대로 내려받지 않도록 썸네일 크기로 다시 인코딩한다 */}
            <Image src={photo.url} alt="사진" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-zinc-950/95 p-4"
          onClick={() => setZoomed(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL이라 next/image 대상이 아님 */}
          <img
            src={zoomed.url}
            alt="확대된 사진"
            className="max-h-[80vh] max-w-full rounded-2xl object-contain"
          />

          {onMove && moveOptions && (
            <select
              defaultValue=""
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (!e.target.value) return;
                onMove(zoomed.id, e.target.value);
                setZoomed(null);
              }}
              className="h-12 rounded-2xl bg-white px-4 text-lg font-medium text-zinc-900 outline-none"
            >
              <option value="">다른 그룹으로 이동...</option>
              {moveOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={NEW_GROUP}>새 그룹으로 분리</option>
            </select>
          )}
        </div>
      )}
    </>
  );
}
