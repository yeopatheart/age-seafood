import Link from "next/link";
import Image from "next/image";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { readDisplayName } from "@/lib/user-display-name";
import { UserMenu } from "@/components/user-menu";
import { BottomNav } from "@/components/bottom-nav";

export async function NavBar() {
  const supabase = await createClient();
  // getClaims()는 로컬 검증이라 getUser()보다 빠르다 — 매 페이지마다 렌더링되는 곳이라 체감이 크다.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) return null;

  // 설정 탭에서 이름을 등록하지 않은 사용자는 이메일 아이디로 대신 보여준다.
  const emailPrefix = data.claims.email?.split("@")[0] ?? "계정";
  const label = readDisplayName(data.claims.user_metadata) || emailPrefix;

  return (
    <>
      <header className="flex items-center justify-between gap-2 bg-white px-4 py-3.5">
        <Image src="/logo-navy.png" alt="통영아재수산" width={36} height={36} priority />
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className="flex h-10 items-center gap-1.5 rounded-full px-4 text-base font-semibold text-zinc-600 transition-colors active:bg-zinc-100"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
            설정
          </Link>
          <UserMenu label={label} />
        </div>
      </header>
      <BottomNav />
    </>
  );
}
