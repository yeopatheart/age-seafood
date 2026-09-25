import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { BottomNav } from "@/components/bottom-nav";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <>
      <header className="flex items-center justify-between gap-2 bg-white px-4 py-3">
        <span className="text-lg font-bold">age-seafood</span>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-10 items-center rounded-full border-2 border-zinc-200 px-4 text-base font-semibold text-zinc-900"
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
