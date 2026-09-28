"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// toISOString()은 UTC 기준이라 자정 근처에는 하루가 밀릴 수 있다 — 기기의 로컬 날짜를
// 그대로 YYYY-MM-DD로 만든다.
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getMonthGrid(viewDate: Date): (Date | null)[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return cells;
}

// 예전엔 브라우저/OS 기본 날짜 선택기(<input type=date>)를 썼는데, 그 팝업은 OS가 그려서
// 색이나 버튼 문구("재설정" 등)를 우리 쪽에서 고칠 수가 없었다 — 그래서 직접 만든 달력으로
// 바꿨다.
export function DatePicker({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date(`${date}T00:00:00`)));

  function openPicker() {
    setViewDate(startOfMonth(new Date(`${date}T00:00:00`)));
    setOpen(true);
  }

  function selectDate(d: Date) {
    router.push(`${pathname}?date=${toDateString(d)}`);
    setOpen(false);
  }

  const today = toDateString(new Date());
  const cells = getMonthGrid(viewDate);

  return (
    <>
      <button
        onClick={openPicker}
        className="inline-flex h-12 items-center gap-2 rounded-2xl bg-zinc-100 px-4 text-lg font-semibold text-zinc-900 active:bg-zinc-200"
      >
        <Calendar className="h-5 w-5 shrink-0 text-zinc-500" strokeWidth={2.25} />
        {date}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100"
                aria-label="이전 달"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <p className="text-lg font-bold text-zinc-900">
                {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
              </p>
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100"
                aria-label="다음 달"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>

            <div className="grid grid-cols-7 justify-items-center gap-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="flex h-9 w-11 items-center justify-center text-sm font-medium text-zinc-400">
                  {w}
                </div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="h-11 w-11" />;
                const dateStr = toDateString(d);
                const isSelected = dateStr === date;
                const isToday = dateStr === today;
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(d)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold transition-colors ${
                      isSelected
                        ? "bg-[#10223d] text-[#fffdf0]"
                        : isToday
                          ? "text-[#10223d] ring-1 ring-[#10223d]"
                          : "text-zinc-700 active:bg-zinc-100"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => selectDate(new Date())}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-zinc-100 text-lg font-semibold text-[#10223d] active:bg-zinc-200"
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </>
  );
}
