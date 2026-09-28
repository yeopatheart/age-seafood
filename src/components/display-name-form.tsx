"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (updateError) {
      setSaving(false);
      setError("저장에 실패했습니다.");
      return;
    }

    // updateUser()는 세션의 user 정보만 바꾸고, 상단바가 읽는 JWT(getClaims)는 그대로라
    // 새로 고침해야 상단바에 곧바로 반영된다 — 안 하면 "저장했는데 안 바뀐다"는 혼란을 준다.
    await supabase.auth.refreshSession();
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="이름을 입력하세요"
          className="h-12 min-w-0 flex-1 rounded-2xl bg-zinc-100 px-4 text-lg text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim() || name.trim() === initialName}
          className="shrink-0 px-5 text-base"
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
      {saved && <p className="text-base font-medium text-emerald-600">저장했습니다.</p>}
      {error && <p className="text-base font-medium text-rose-600">{error}</p>}
    </div>
  );
}
