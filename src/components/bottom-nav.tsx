"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ClipboardCheck, History } from "lucide-react";

const TABS = [
  { href: "/capture", label: "촬영", Icon: Camera },
  { href: "/review", label: "확인", Icon: ClipboardCheck },
  { href: "/history", label: "이력", Icon: History },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-100 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-base font-semibold transition-colors ${
              active ? "text-blue-600" : "text-zinc-400"
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
