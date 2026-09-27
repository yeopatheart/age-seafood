import type { HTMLAttributes } from "react";

// 테두리 대신 은은한 그림자로 배경과 분리한다 — 토스·에어비앤비 카드가 공통으로 쓰는 방식.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_24px_-12px_rgba(16,24,40,0.16)] ${className}`}
    />
  );
}
