"use client";

import { useRouter, usePathname } from "next/navigation";

export function DatePicker({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="date">날짜</label>
      <input
        id="date"
        type="date"
        defaultValue={date}
        onChange={(e) => router.push(`${pathname}?date=${e.target.value}`)}
        className="rounded border px-2 py-1"
      />
    </div>
  );
}
