import type { ButtonHTMLAttributes } from "react";

const VARIANT_CLASSES = {
  primary: "bg-black text-white border-black disabled:opacity-50",
  danger: "bg-white text-red-700 border-red-300 disabled:opacity-50",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT_CLASSES;
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`min-h-12 rounded-full border-2 px-6 text-lg font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
