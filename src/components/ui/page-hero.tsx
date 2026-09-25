import type { ReactNode } from "react";

export function PageHero({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-zinc-900 p-5 text-white shadow-md">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
