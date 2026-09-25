"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

    router.replace("/deliveries");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-3xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold">age-seafood 로그인</h1>

        <div className="space-y-2">
          <label htmlFor="email" className="text-lg font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 text-lg"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-lg font-medium">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 text-lg"
          />
        </div>

        {error && <p className="text-lg text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="min-h-14 w-full">
          {loading ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
}
