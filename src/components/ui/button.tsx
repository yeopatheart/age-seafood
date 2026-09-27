import type { ButtonHTMLAttributes } from "react";

const VARIANT_CLASSES = {
  primary: "bg-blue-600 text-white active:bg-blue-700 disabled:opacity-40",
  secondary: "bg-zinc-100 text-zinc-900 active:bg-zinc-200 disabled:opacity-40",
  accent: "bg-amber-500 text-white active:bg-amber-600 disabled:opacity-40",
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
