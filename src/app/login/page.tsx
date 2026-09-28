"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.replace("/capture");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_32px_-12px_rgba(16,24,40,0.16)]"
      >
        <Image
          src="/logo-navy.png"
          alt="통영아재수산"
          width={56}
          height={56}
          unoptimized
          className="mx-auto"
          priority
        />

        <div className="space-y-2">
          <label htmlFor="email" className="text-base font-semibold text-zinc-700">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 w-full rounded-2xl bg-zinc-100 px-4 text-lg text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-base font-semibold text-zinc-700">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 w-full rounded-2xl bg-zinc-100 px-4 text-lg text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-lg font-medium text-rose-600">{error}</p>}

        <Button type="submit" disabled={loading} className="min-h-14 w-full">
          {loading ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
}
