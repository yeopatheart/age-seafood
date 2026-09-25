import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MismatchBadge } from "@/components/mismatch-badge";
import { HistoryFilters } from "@/components/history-filters";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; terminal?: string }>;
}) {
  const { date, terminal } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("bus_trip_reconciliation")
    .select("*")
    .order("trip_date", { ascending: false })
    .limit(100);

  if (date) query = query.eq("trip_date", date);
  if (terminal) query = query.ilike("terminal_name", `%${terminal}%`);

  const { data: trips } = await query;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-lg font-semibold">지난 대사 기록</h1>

      <HistoryFilters date={date ?? ""} terminal={terminal ?? ""} />

      <div className="space-y-2">
        {(trips ?? []).length === 0 && <p className="text-sm text-zinc-500">조건에 맞는 기록이 없습니다.</p>}
        {(trips ?? []).map((trip) => (
          <Link
            key={trip.bus_trip_id}
            href={`/bus-trips/${trip.bus_trip_id}`}
            className="flex items-center justify-between rounded border p-3 hover:bg-zinc-50"
          >
            <div>
              <p className="font-medium">
                {trip.trip_date} · {trip.terminal_name}
                {trip.bus_company && ` · ${trip.bus_company} (${trip.vehicle_number})`}
              </p>
              <p className="text-sm text-zinc-500">
                체크 {trip.checked_box_count} / 송장{" "}
                {trip.invoice_box_count === null ? "미입력" : `${trip.invoice_box_count}박스`} · 주문{" "}
                {trip.checked_order_count}/{trip.assigned_order_count}건
              </p>
            </div>
            <MismatchBadge isMismatch={trip.is_mismatch} />
          </Link>
        ))}
      </div>
    </main>
  );
}
