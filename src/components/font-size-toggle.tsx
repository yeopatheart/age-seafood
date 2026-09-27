"use client";

import { useState } from "react";

const LEVELS = [
  { value: "normal", label: "보통" },
  { value: "large", label: "크게" },
  { value: "xlarge", label: "아주 크게" },
] as const;

type Level = (typeof LEVELS)[number]["value"];

const STORAGE_KEY = "age-seafood-font-size";

// layout.tsx의 인라인 스크립트가 hydration 전에 이미 localStorage 값을 읽어
// <html data-font-size>에 반영해두므로, 여기서는 같은 값을 초기값으로 그대로 읽기만 한다
// (useEffect+setState로 뒤늦게 동기화하지 않는다 — 불필요한 리렌더와 깜빡임을 피한다).
function readInitialLevel(): Level {
  if (typeof window === "undefined") return "large";
  try {
    return (localStorage.getItem(STORAGE_KEY) as Level | null) ?? "large";
  } catch {
    return "large";
  }
}

export function FontSizeToggle() {
  const [current, setCurrent] = useState<Level>(readInitialLevel);

  function apply(level: Level) {
    setCurrent(level);
    document.documentElement.setAttribute("data-font-size", level);
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch {
      // 저장이 안 되면 이번 방문 동안만 적용된다 — 문제 없음
    }
  }

  return (
    <div className="flex gap-2">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => apply(level.value)}
          className={`min-h-14 flex-1 rounded-2xl text-lg font-semibold transition-colors ${
            current === level.value ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
