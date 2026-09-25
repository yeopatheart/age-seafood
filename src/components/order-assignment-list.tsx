"use client";

import { useState, useTransition } from "react";
import { assignOrderToTrip } from "@/app/bus-trips/actions";
import type { Database } from "@/lib/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function OrderAssignmentList({
  busTripId,
  assignedOrders,
  unassignedOrders,
}: {
  busTripId: string;
  assignedOrders: Order[];
  unassignedOrders: Order[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(orderId: string, assign: boolean) {
    setPendingId(orderId);
    startTransition(async () => {
      await assignOrderToTrip(orderId, assign ? busTripId : null);
      setPendingId(null);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">주문 배정</h2>

      <div>
        <p className="mb-1 text-xs text-zinc-500">배정됨 ({assignedOrders.length})</p>
        {assignedOrders.length === 0 && <p className="text-sm text-zinc-400">아직 없음</p>}
        <ul className="space-y-1">
          {assignedOrders.map((order) => (
            <li key={order.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
              <span>
                {order.customer_name} · {order.box_count}박스
              </span>
              <button
                onClick={() => toggle(order.id, false)}
                disabled={pendingId === order.id}
                className="text-zinc-500 hover:underline disabled:opacity-50"
              >
                해제
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-xs text-zinc-500">같은 터미널 미배정 주문 ({unassignedOrders.length})</p>
        {unassignedOrders.length === 0 && <p className="text-sm text-zinc-400">없음</p>}
        <ul className="space-y-1">
          {unassignedOrders.map((order) => (
            <li key={order.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
              <span>
                {order.customer_name} · {order.box_count}박스
              </span>
              <button
                onClick={() => toggle(order.id, true)}
                disabled={pendingId === order.id}
                className="text-blue-600 hover:underline disabled:opacity-50"
              >
                배정
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
