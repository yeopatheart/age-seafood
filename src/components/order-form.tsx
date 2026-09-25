"use client";

import { useRef, useState } from "react";
import { createOrder } from "@/app/orders/actions";

export function OrderForm({
  date,
  terminalOptions,
  customerOptions,
}: {
  date: string;
  terminalOptions: string[];
  customerOptions: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await createOrder(formData);
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 등록에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="order_date" value={date} />

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500">터미널</label>
        <input
          name="terminal_name"
          list="terminal-options"
          required
          className="rounded border px-2 py-1"
        />
        <datalist id="terminal-options">
          {terminalOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500">고객사명</label>
        <input
          name="customer_name"
          list="customer-options"
          required
          className="rounded border px-2 py-1"
        />
        <datalist id="customer-options">
          {customerOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-zinc-500">박스 수량</label>
        <input
          name="box_count"
          type="number"
          min={1}
          required
          className="w-24 rounded border px-2 py-1"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-1.5 text-white disabled:opacity-50"
      >
        {pending ? "추가 중..." : "추가"}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
