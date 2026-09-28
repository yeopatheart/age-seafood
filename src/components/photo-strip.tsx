"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ArrowRightLeft } from "lucide-react";

type Photo = { id: string; url: string; companyName?: string | null };

export const NEW_GROUP = "__new__";

// 80px 썸네일 안에서 업체명이 한 줄에 들어가도록 글자 수에 맞춰 글자 크기를 줄인다. 정확한
// 텍스트 폭 측정 대신 글자 수 기반 추정치를 쓰고, 그래도 넘치면 CSS truncate가 마지막 안전망이다.
function fitFontSize(text: string): number {
  const availableWidth = 68;
  const estimated = Math.floor(availableWidth / text.length);
  return Math.max(8, Math.min(12, estimated));
}

// 사진 여러 장을 가로로 스크롤하며 훑어볼 수 있게 보여준다. 썸네일을 누르면 원본 크기로
// 확대해서 볼 수 있다 — 손글씨 확인처럼 작은 글씨를 읽어야 할 때 필요하다. 확대 화면에서는
// 좌우 화살표나 스와이프로 같은 그룹의 다른 사진을 바로 훑어볼 수 있고, moveOptions·onMove가
// 주어지면(택배송장 전용) 그 자리에서 다른 터미널로 옮길 수도 있다 — 오분류된 사진 한 장만
// 고치기 위함.
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
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (photos.length === 0) return null;

  const zoomed = zoomedIndex !== null ? photos[zoomedIndex] : null;

  function closeZoom() {
    setZoomedIndex(null);
    setMoveMenuOpen(false);
  }

  function goTo(index: number) {
    setMoveMenuOpen(false);
    setZoomedIndex(index);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || zoomedIndex === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    const SWIPE_THRESHOLD = 50;
    if (deltaX > SWIPE_THRESHOLD && zoomedIndex > 0) goTo(zoomedIndex - 1);
    else if (deltaX < -SWIPE_THRESHOLD && zoomedIndex < photos.length - 1) goTo(zoomedIndex + 1);
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setZoomedIndex(i)}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition-transform active:scale-95"
          >
            {/* 프록시 경로(/api/photos)가 직접 리사이즈해서 내려준다 — next/image 자체 최적화는
                쓰지 않는다. 그 내부 요청엔 로그인 쿠키가 안 실려서 이 경로가 401로 막고, 결국
                깨진 이미지로 보이는 버그가 있었다(unoptimized로 next/image가 그 경로를 타지 않게
                하고, 브라우저가 쿠키를 실어 이 경로를 직접 요청하게 한다). */}
            <Image src={`${photo.url}?w=160`} alt="사진" fill unoptimized className="object-cover" />
            {photo.companyName && (
              <span
                className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1 pb-1 pt-3 text-center font-semibold text-white"
                style={{ fontSize: `${fitFontSize(photo.companyName)}px` }}
              >
                {photo.companyName}
              </span>
            )}
          </button>
        ))}
      </div>

      {zoomed && zoomedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 p-4"
          onClick={closeZoom}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeZoom();
            }}
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
            aria-label="닫기"
          >
            <X className="h-6 w-6" strokeWidth={2.5} />
          </button>

          <div
            className="relative flex w-full flex-1 items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {zoomedIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(zoomedIndex - 1);
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
                  goTo(zoomedIndex + 1);
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMoveMenuOpen(true);
              }}
              className="flex h-11 items-center gap-1.5 rounded-full bg-white/10 px-5 text-base font-medium text-white transition-colors active:bg-white/20"
            >
              <ArrowRightLeft className="h-4 w-4" strokeWidth={2.25} />
              다른 그룹으로 이동
            </button>
          )}

          {moveMenuOpen && onMove && moveOptions && (
            <div
              className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
              onClick={(e) => {
                e.stopPropagation();
                setMoveMenuOpen(false);
              }}
            >
              <div
                className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="px-3 py-2 text-base font-semibold text-zinc-400">다른 그룹으로 이동</p>
                {moveOptions.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      onMove(zoomed.id, name);
                      closeZoom();
                    }}
                    className="flex h-12 w-full items-center rounded-2xl px-3 text-lg font-medium text-zinc-900 active:bg-zinc-100"
                  >
                    {name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onMove(zoomed.id, NEW_GROUP);
                    closeZoom();
                  }}
                  className="flex h-12 w-full items-center rounded-2xl px-3 text-lg font-medium text-blue-600 active:bg-blue-50"
                >
                  새 그룹으로 분리
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
