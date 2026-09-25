"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBusTrip } from "@/app/bus-trips/actions";

export function BusTripForm({ date, terminalOptions }: { date: string; terminalOptions: string[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const id = await createBusTrip(formData);
      formRef.current?.reset();
      router.push(`/bus-trips/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "버스 편 등록에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="trip_date" value={date} />

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500">터미널</label>
        <input name="terminal_name" list="bus-terminal-options" required className="rounded border px-2 py-1" />
        <datalist id="bus-terminal-options">
          {terminalOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <button type="submit" disabled={pending} className="rounded bg-black px-4 py-1.5 text-white disabled:opacity-50">
        {pending ? "등록 중..." : "버스 편 시작"}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
