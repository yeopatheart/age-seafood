import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { HistoryFilters } from "@/components/history-filters";
import { PageHero } from "@/components/ui/page-hero";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; terminal?: string }>;
}) {
  const { date, terminal } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("trip_review_status")
    .select("*")
    .order("trip_date", { ascending: false })
    .limit(100);

  if (date) query = query.eq("trip_date", date);
  if (terminal) query = query.ilike("terminal_name", `%${terminal}%`);

  const { data: deliveries } = await query;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <PageHero title="기록" />

      <HistoryFilters date={date ?? ""} terminal={terminal ?? ""} />

      <div className="space-y-2">
        {(deliveries ?? []).length === 0 && <p className="text-lg text-zinc-600">조건에 맞는 기록이 없습니다.</p>}
        {(deliveries ?? []).map((delivery) => (
          <Link
            key={delivery.trip_id}
            href={`/deliveries/${delivery.trip_id}`}
            className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm"
          >
            <div className="flex-1">
              <p className="text-lg font-bold">
                {delivery.trip_date} · {delivery.terminal_name}
              </p>
              <p className="text-base text-zinc-700">라벨 사진 {delivery.label_photo_count}장</p>
              <p className="text-base text-zinc-700">버스 송장 사진 {delivery.invoice_photo_count}장</p>
            </div>
            <ReviewStatusBadge reviewed={delivery.latest_reviewed_at !== null} />
          </Link>
        ))}
      </div>
    </main>
  );
}
