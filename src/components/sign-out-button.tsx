"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex h-10 items-center rounded-full px-4 text-base font-semibold text-zinc-600 transition-colors active:bg-zinc-100"
    >
      로그아웃
    </button>
  );
}
