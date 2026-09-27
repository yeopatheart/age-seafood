import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeliveryForm } from "@/components/delivery-form";
import { DatePicker } from "@/components/date-picker";
import { PageHero } from "@/components/ui/page-hero";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { DeliveryCountSummary } from "@/components/delivery-count-summary";
import { recentUnique } from "@/lib/recent-unique";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const tripDate = date ?? todayKST();

  const supabase = await createClient();

  const [{ data: deliveries }, { data: recentDeliveries }] = await Promise.all([
    // 미검수 건이 위로, 검수완료 건은 검수 시점 최신순으로 아래에 오도록 정렬한다.
    supabase
      .from("trip_review_status")
      .select("*")
      .eq("trip_date", tripDate)
      .order("latest_reviewed_at", { ascending: false, nullsFirst: true }),
    supabase.from("bus_trips").select("terminal_name").order("created_at", { ascending: false }).limit(200),
  ]);

  const terminalOptions = recentUnique((recentDeliveries ?? []).map((t) => t.terminal_name), 8);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <PageHero title="배송">
        <DatePicker date={tripDate} dark />
      </PageHero>

      <DeliveryForm date={tripDate} terminalOptions={terminalOptions} />

      <div className="space-y-2">
        {(deliveries ?? []).length === 0 && (
          <p className="text-lg text-zinc-600">이 날짜에 등록된 배송이 없습니다.</p>
        )}
        {(deliveries ?? []).map((delivery) => (
          <Link
            key={delivery.trip_id}
            href={`/deliveries/${delivery.trip_id}`}
            className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm"
          >
            <div className="flex-1">
              <p className="text-lg font-bold">{delivery.terminal_name}</p>
              <DeliveryCountSummary
                labelPhotoCount={delivery.label_photo_count}
                invoicePhotoCount={delivery.invoice_photo_count}
                invoiceBoxCount={delivery.invoice_box_count}
              />
            </div>
            <ReviewStatusBadge reviewed={delivery.latest_reviewed_at !== null} />
          </Link>
        ))}
      </div>
    </main>
  );
}
