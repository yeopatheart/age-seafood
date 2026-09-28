"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// 로그아웃 버튼이 상시 노출되어 있으면 어른들이 실수로 눌러 로그아웃될 위험이 있다.
// 이름(계정) 버튼을 먼저 눌러야 로그아웃 메뉴가 나오도록 한 단계를 더 둔다.
export function UserMenu({ label }: { label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-1.5 rounded-full pl-2 pr-3 text-base font-semibold text-zinc-600 transition-colors active:bg-zinc-100"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <User className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-40 overflow-hidden rounded-2xl bg-white py-1 shadow-[0_4px_16px_-4px_rgba(16,24,40,0.24)]">
          <button
            onClick={handleSignOut}
            className="flex h-12 w-full items-center gap-2 px-4 text-left text-base font-medium text-rose-600 active:bg-rose-50"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
