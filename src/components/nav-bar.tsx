import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

const LINKS = [
  { href: "/orders", label: "주문 리스트" },
  { href: "/bus-trips", label: "버스 편" },
  { href: "/history", label: "지난 기록" },
];

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <nav className="flex gap-4 text-sm font-medium">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <SignOutButton />
    </header>
  );
}
