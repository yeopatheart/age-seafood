import { createClient } from "@/lib/supabase/server";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { DeliveryPhotoRows } from "@/components/delivery-photo-rows";
import { DatePicker } from "@/components/date-picker";
import { Card } from "@/components/ui/card";
import { formatDepartureTime } from "@/lib/format-departure-time";
import { photoUrl } from "@/lib/photo-url";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const tripDate = date ?? todayKST();

  const supabase = await createClient();

  const { data: deliveries } = await supabase
    .from("trip_review_status")
    .select("*")
    .eq("trip_date", tripDate)
    .not("latest_reviewed_at", "is", null);

  // DB 기본 정렬(collation)에 기대지 않고 한글 가나다순을 명시적으로 보장한다.
  const sortedDeliveries = [...(deliveries ?? [])].sort((a, b) =>
    a.terminal_name.localeCompare(b.terminal_name, "ko"),
  );

  const deliveryIds = sortedDeliveries.map((d) => d.trip_id);
  const { data: photos } =
    deliveryIds.length > 0
      ? await supabase
          .from("label_photos")
          .select("*")
          .in("bus_trip_id", deliveryIds)
          .order("taken_at", { ascending: false })
      : { data: [] };

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <DatePicker date={tripDate} />

      <div className="space-y-4">
        {sortedDeliveries.length === 0 && (
          <Card className="text-center text-lg text-zinc-500">해당 날짜에 기록이 없습니다.</Card>
        )}
        {sortedDeliveries.map((delivery) => {
          // 확정된 배송은 실무상 분류 대기 중인 사진이 남아있을 일이 없지만, 방어적으로 같은
          // 필터를 적용해서 혹시 모를 pending 사진이 섞여 보이지 않게 한다.
          const deliveryPhotos = (photos ?? [])
            .filter((p) => p.bus_trip_id === delivery.trip_id && p.classification_status === "done")
            .map((p) => ({
              id: p.id,
              url: photoUrl(p.storage_path),
              photoType: p.photo_type,
              companyName: p.company_name,
            }));

          return (
            <Card key={delivery.trip_id} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-12 items-center rounded-xl bg-zinc-100 px-3 text-base font-bold text-zinc-900">
                    {delivery.terminal_name}
                  </span>
                  {delivery.departure_time && (
                    <span className="flex h-12 items-center rounded-xl bg-zinc-100 px-3 text-base text-zinc-700">
                      {formatDepartureTime(delivery.departure_time)}
                    </span>
                  )}
                </div>
                <ReviewStatusBadge reviewed={delivery.latest_reviewed_at !== null} />
              </div>

              <DeliveryPhotoRows
                labelPhotos={deliveryPhotos.filter((p) => p.photoType === "label")}
                invoicePhotos={deliveryPhotos.filter((p) => p.photoType === "invoice")}
                invoiceBoxCount={delivery.invoice_box_count}
              />
            </Card>
          );
        })}
      </div>
    </main>
  );
}
