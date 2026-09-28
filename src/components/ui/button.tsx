import type { ButtonHTMLAttributes } from "react";

// primary는 로고(public/logo-navy.png)의 남색·크림색을 그대로 쓴다 — 앱 전체의 기본 브랜드 색.
const VARIANT_CLASSES = {
  primary: "bg-[#10223d] text-[#fffdf0] active:bg-[#0c1a30] disabled:opacity-40",
  secondary: "bg-zinc-100 text-zinc-900 active:bg-zinc-200 disabled:opacity-40",
  blue: "bg-blue-600 text-white active:bg-blue-700 disabled:opacity-40",
  danger: "bg-rose-50 text-rose-600 active:bg-rose-100 disabled:opacity-40",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT_CLASSES;
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`min-h-12 rounded-full px-6 text-lg font-semibold transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
