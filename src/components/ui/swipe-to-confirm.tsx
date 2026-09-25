"use client";

import { useRef, useState } from "react";

const HANDLE_SIZE = 64;
const CONFIRM_THRESHOLD = 0.85;

export function SwipeToConfirm({
  label,
  onConfirm,
  disabled,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function maxDrag() {
    return (trackRef.current?.getBoundingClientRect().width ?? HANDLE_SIZE) - HANDLE_SIZE;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - HANDLE_SIZE / 2, maxDrag()));
    setDragX(x);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const max = maxDrag();
    if (dragX >= max * CONFIRM_THRESHOLD) {
      setDragX(max);
      onConfirm();
      setTimeout(() => setDragX(0), 700);
    } else {
      setDragX(0);
    }
  }

  return (
    <div ref={trackRef} className="relative h-16 w-full overflow-hidden rounded-full bg-zinc-200">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold text-zinc-600">
        {label}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? "none" : "transform 0.2s ease-out" }}
        className={`absolute left-0 top-0 flex h-16 w-16 touch-none items-center justify-center rounded-full text-2xl text-white ${
          disabled ? "bg-zinc-400" : "bg-black"
        }`}
      >
        →
      </div>
    </div>
  );
}
