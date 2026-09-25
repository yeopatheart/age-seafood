"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDelivery } from "@/app/deliveries/actions";
import { Button } from "@/components/ui/button";
import { QuickSelectChips } from "@/components/ui/quick-select-chips";

export function DeliveryForm({ date, terminalOptions }: { date: string; terminalOptions: string[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [terminal, setTerminal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const id = await createDelivery(formData);
      formRef.current?.reset();
      router.push(`/deliveries/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "배송 등록에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
      <input type="hidden" name="trip_date" value={date} />

      <label className="text-lg font-medium">터미널</label>
      <QuickSelectChips options={terminalOptions} onSelect={setTerminal} />
      <input
        name="terminal_name"
        value={terminal}
        onChange={(e) => setTerminal(e.target.value)}
        required
        placeholder="터미널명 입력"
        className="h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 text-lg"
      />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "등록 중..." : "새 배송 시작"}
      </Button>

      {error && <p className="text-lg text-red-600">{error}</p>}
    </form>
  );
}
