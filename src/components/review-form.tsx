"use client";

import { useState } from "react";
import { submitReview } from "@/app/deliveries/actions";
import { SwipeToConfirm } from "@/components/ui/swipe-to-confirm";

export function ReviewForm({ deliveryId }: { deliveryId: string }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    const formData = new FormData();
    formData.set("note", note);

    try {
      await submitReview(deliveryId, formData);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "검수 등록에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
      <label className="text-lg font-medium">메모 (선택 — 문제가 있으면 적어주세요)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full rounded-2xl border-2 border-zinc-200 p-3 text-lg"
        placeholder="예: 라벨 사진과 송장 수량이 안 맞음"
      />

      <SwipeToConfirm label="밀어서 검수완료" onConfirm={handleConfirm} disabled={pending} />

      {error && <p className="text-lg text-red-600">{error}</p>}
    </div>
  );
}
