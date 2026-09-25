"use client";

import { useRouter, usePathname } from "next/navigation";

export function DatePicker({ date, dark = false }: { date: string; dark?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={`flex items-center gap-2 text-lg ${dark ? "text-white" : ""}`}>
      <label htmlFor="date" className="font-medium">
        날짜
      </label>
      <input
        id="date"
        type="date"
        defaultValue={date}
        onChange={(e) => router.push(`${pathname}?date=${e.target.value}`)}
        className={
          dark
            ? "h-11 rounded-full bg-white px-4 text-base text-zinc-900"
            : "h-12 rounded-2xl border-2 border-zinc-200 px-3 text-lg"
        }
      />
    </div>
  );
}
