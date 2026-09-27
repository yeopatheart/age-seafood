import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { BottomNav } from "@/components/bottom-nav";

export async function NavBar() {
  const supabase = await createClient();
  // getClaims()는 로컬 검증이라 getUser()보다 빠르다 — 매 페이지마다 렌더링되는 곳이라 체감이 크다.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) return null;

  return (
    <>
      <header className="flex items-center justify-between gap-2 bg-white px-4 py-3.5">
        <span className="text-lg font-extrabold tracking-tight text-zinc-900">age-seafood</span>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className="flex h-10 items-center rounded-full px-4 text-base font-semibold text-zinc-600 transition-colors active:bg-zinc-100"
          >
            설정
          </Link>
          <SignOutButton />
        </div>
      </header>
      <BottomNav />
    </>
  );
}
