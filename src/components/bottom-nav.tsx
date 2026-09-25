"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/deliveries", label: "배송", icon: "📷" },
  { href: "/history", label: "기록", icon: "🗂️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-10 flex gap-1 rounded-full bg-zinc-900 p-2 shadow-lg">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-full text-lg font-semibold ${
              active ? "bg-white text-zinc-900" : "text-zinc-400"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
