"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = { id: string; url: string };

export const NEW_GROUP = "__new__";

// 사진 여러 장을 가로로 스크롤하며 훑어볼 수 있게 보여준다. 썸네일을 누르면 원본 크기로
// 확대해서 볼 수 있다 — 손글씨 확인처럼 작은 글씨를 읽어야 할 때 필요하다. 확대 화면에서는
// 좌우 화살표로 같은 그룹의 다른 사진을 바로 훑어볼 수 있고, moveOptions·onMove가 주어지면
// (택배송장 전용) 그 자리에서 다른 터미널로 옮길 수도 있다 — 오분류된 사진 한 장만 고치기 위함.
export function PhotoStrip({
  photos,
  moveOptions,
  onMove,
}: {
  photos: Photo[];
  moveOptions?: string[];
  onMove?: (photoId: string, targetName: string) => void;
}) {
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const zoomed = zoomedIndex !== null ? photos[zoomedIndex] : null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setZoomedIndex(i)}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition-transform active:scale-95"
          >
            {/* 서명 URL 원본(최대 1600px)을 그대로 내려받지 않도록 썸네일 크기로 다시 인코딩한다 */}
            <Image src={photo.url} alt="사진" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      {zoomed && zoomedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 p-4"
          onClick={() => setZoomedIndex(null)}
        >
          <div className="relative flex w-full flex-1 items-center justify-center">
            {zoomedIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomedIndex(zoomedIndex - 1);
                }}
                className="absolute left-1 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2.5} />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL이라 next/image 대상이 아님 */}
            <img
              src={zoomed.url}
              alt="확대된 사진"
              className="max-h-[70vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {zoomedIndex < photos.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomedIndex(zoomedIndex + 1);
                }}
                className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
                aria-label="다음 사진"
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {photos.length > 1 && (
            <p className="tabular-nums text-base font-medium text-zinc-300">
              {zoomedIndex + 1} / {photos.length}
            </p>
          )}

          {onMove && moveOptions && (
            <select
              defaultValue=""
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (!e.target.value) return;
                onMove(zoomed.id, e.target.value);
                setZoomedIndex(null);
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
