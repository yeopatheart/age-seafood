"use client";

import { useState } from "react";
import { deleteOrder, updateOrder } from "@/app/orders/actions";
import type { Database } from "@/lib/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function OrderList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-zinc-500">이 날짜에 등록된 주문이 없습니다.</p>;
  }

  const grouped = new Map<string, Order[]>();
  for (const order of orders) {
    const group = grouped.get(order.terminal_name);
    if (group) group.push(order);
    else grouped.set(order.terminal_name, [order]);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([terminalName, terminalOrders]) => (
        <div key={terminalName}>
          <h3 className="mb-2 font-medium">
            {terminalName} <span className="text-sm text-zinc-500">({terminalOrders.length}건)</span>
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-1">고객사명</th>
                <th className="py-1">박스 수량</th>
                <th className="py-1">배정 상태</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {terminalOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [boxCount, setBoxCount] = useState(order.box_count);
  const [pending, setPending] = useState(false);

  async function handleBoxCountBlur() {
    if (boxCount === order.box_count || boxCount <= 0) {
      setBoxCount(order.box_count);
      return;
    }
    setPending(true);
    await updateOrder(order.id, { box_count: boxCount });
    setPending(false);
  }

  async function handleDelete() {
    if (!confirm(`${order.customer_name} 주문을 삭제할까요?`)) return;
    setPending(true);
    await deleteOrder(order.id);
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5">{order.customer_name}</td>
      <td className="py-1.5">
        <input
          type="number"
          min={1}
          value={boxCount}
          onChange={(e) => setBoxCount(Number(e.target.value))}
          onBlur={handleBoxCountBlur}
          disabled={pending}
          className="w-16 rounded border px-1.5 py-0.5"
        />
      </td>
      <td className="py-1.5 text-zinc-500">
        {order.bus_trip_id ? "버스 편 배정됨" : "미배정"}
      </td>
      <td className="py-1.5 text-right">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          삭제
        </button>
      </td>
    </tr>
  );
}
