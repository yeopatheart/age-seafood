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
    <div className="flex flex-wrap items-end gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-date" className="text-lg font-medium">
          날짜
        </label>
        <input
          id="filter-date"
          type="date"
          defaultValue={date}
          onChange={(e) => updateParam("date", e.target.value)}
          className="h-12 rounded-2xl border-2 border-zinc-200 px-3 text-lg"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-terminal" className="text-lg font-medium">
          터미널
        </label>
        <input
          id="filter-terminal"
          type="text"
          defaultValue={terminal}
          onChange={(e) => updateParam("terminal", e.target.value)}
          className="h-12 rounded-2xl border-2 border-zinc-200 px-3 text-lg"
        />
      </div>
    </div>
  );
}
