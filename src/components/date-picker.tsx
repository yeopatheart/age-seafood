"use client";

import { useRouter, usePathname } from "next/navigation";
import { Calendar } from "lucide-react";

// 네이티브 <input type=date>는 그대로 위에 투명하게 덮어서 모든 브라우저에서 클릭 시
// 날짜 선택기가 뜨게 하고, 보이는 부분은 버튼처럼 보이도록 따로 그린다.
export function DatePicker({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative inline-flex h-12 items-center gap-2 rounded-2xl bg-zinc-100 px-4 text-lg font-semibold text-zinc-900 active:bg-zinc-200">
      <Calendar className="h-5 w-5 shrink-0 text-zinc-500" strokeWidth={2.25} />
      <span>{date}</span>
      <input
        type="date"
        defaultValue={date}
        onChange={(e) => router.push(`${pathname}?date=${e.target.value}`)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="날짜 선택"
      />
    </div>
  );
}
