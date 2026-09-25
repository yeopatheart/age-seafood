"use client";

import { useRouter } from "next/navigation";

export function HistoryFilters({ date, terminal }: { date: string; terminal: string }) {
  const router = useRouter();

  function updateParam(key: "date" | "terminal", value: string) {
    const params = new URLSearchParams({ date, terminal });
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/history?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <div className="flex flex-col">
        <label htmlFor="filter-date" className="text-xs text-zinc-500">
          날짜
        </label>
        <input
          id="filter-date"
          type="date"
          defaultValue={date}
          onChange={(e) => updateParam("date", e.target.value)}
          className="rounded border px-2 py-1"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="filter-terminal" className="text-xs text-zinc-500">
          터미널
        </label>
        <input
          id="filter-terminal"
          type="text"
          defaultValue={terminal}
          onChange={(e) => updateParam("terminal", e.target.value)}
          className="rounded border px-2 py-1"
        />
      </div>
    </div>
  );
}
