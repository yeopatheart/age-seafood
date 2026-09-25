"use client";

import { useState, useTransition } from "react";
import { toggleOrderChecked } from "@/app/bus-trips/actions";
import { MismatchBadge } from "@/components/mismatch-badge";
import type { Database } from "@/lib/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function ReconciliationChecklist({
  orders,
  invoiceBoxCount,
}: {
  orders: Order[];
  invoiceBoxCount: number | null;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(orderId: string, checked: boolean) {
    setPendingId(orderId);
    startTransition(async () => {
      await toggleOrderChecked(orderId, checked);
      setPendingId(null);
    });
  }

  const checkedBoxCount = orders
    .filter((o) => o.checked)
    .reduce((sum, o) => sum + o.box_count, 0);
  const isMismatch = invoiceBoxCount === null ? null : checkedBoxCount !== invoiceBoxCount;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">대사 체크리스트</h2>
        <MismatchBadge isMismatch={isMismatch} />
      </div>

      <p className="text-sm text-zinc-500">
        체크됨 {checkedBoxCount} / 송장{" "}
        {invoiceBoxCount === null ? "수량 미입력" : `${invoiceBoxCount}박스`}
      </p>

      {orders.length === 0 && <p className="text-sm text-zinc-400">배정된 주문이 없습니다.</p>}

      <ul className="space-y-1">
        {orders.map((order) => (
          <li key={order.id}>
            <label className="flex items-center gap-3 rounded border px-3 py-2">
              <input
                type="checkbox"
                checked={order.checked}
                disabled={pendingId === order.id}
                onChange={(e) => toggle(order.id, e.target.checked)}
                className="h-5 w-5"
              />
              <span>
                {order.customer_name} · {order.box_count}박스
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
