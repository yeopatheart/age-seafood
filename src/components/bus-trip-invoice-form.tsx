"use client";

import { useState } from "react";
import { updateBusTripInvoice } from "@/app/bus-trips/actions";
import type { Database } from "@/lib/types/database";

type BusTrip = Database["public"]["Tables"]["bus_trips"]["Row"];

export function BusTripInvoiceForm({ trip }: { trip: BusTrip }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hasInvoice = trip.bus_company !== null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await updateBusTripInvoice(trip.id, formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "송장 정보 저장에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-2 rounded border p-3">
      <h2 className="font-medium">버스 송장 정보</h2>
      <p className="text-xs text-zinc-500">
        버스 출발 직전, 버스회사로부터 종이 송장을 받으면 여기에 입력하세요.
      </p>
      <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-zinc-500">버스회사</label>
          <input
            name="bus_company"
            defaultValue={trip.bus_company ?? ""}
            required
            className="rounded border px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-zinc-500">차량번호</label>
          <input
            name="vehicle_number"
            defaultValue={trip.vehicle_number ?? ""}
            required
            className="rounded border px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-zinc-500">송장 수량</label>
          <input
            name="invoice_box_count"
            type="number"
            min={0}
            defaultValue={trip.invoice_box_count ?? ""}
            required
            className="w-24 rounded border px-2 py-1"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-1.5 text-white disabled:opacity-50"
        >
          {pending ? "저장 중..." : hasInvoice ? "송장 정보 수정" : "송장 정보 저장"}
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}
