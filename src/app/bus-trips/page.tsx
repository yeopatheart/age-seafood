import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BusTripForm } from "@/components/bus-trip-form";
import { DatePicker } from "@/components/date-picker";
import { MismatchBadge } from "@/components/mismatch-badge";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function BusTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const tripDate = date ?? todayKST();

  const supabase = await createClient();

  const [{ data: trips }, { data: pastOrders }] = await Promise.all([
    supabase
      .from("bus_trip_reconciliation")
      .select("*")
      .eq("trip_date", tripDate)
      .order("terminal_name"),
    supabase.from("orders").select("terminal_name").limit(500),
  ]);

  const terminalOptions = [...new Set((pastOrders ?? []).map((o) => o.terminal_name))].sort();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">버스 편 — {tripDate}</h1>
        <DatePicker date={tripDate} />
      </div>

      <BusTripForm date={tripDate} terminalOptions={terminalOptions} />

      <div className="space-y-2">
        {(trips ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">이 날짜에 등록된 버스 편이 없습니다.</p>
        )}
        {(trips ?? []).map((trip) => (
          <Link
            key={trip.bus_trip_id}
            href={`/bus-trips/${trip.bus_trip_id}`}
            className="flex items-center justify-between rounded border p-3 hover:bg-zinc-50"
          >
            <div>
              <p className="font-medium">
                {trip.terminal_name}
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
