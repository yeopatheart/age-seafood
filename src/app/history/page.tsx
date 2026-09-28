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
    .not("latest_reviewed_at", "is", null)
    .order("terminal_name");

  const deliveryIds = (deliveries ?? []).map((d) => d.trip_id);
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
        {(deliveries ?? []).length === 0 && (
          <Card className="text-center text-lg text-zinc-500">조건에 맞는 기록이 없습니다.</Card>
        )}
        {(deliveries ?? []).map((delivery) => {
          // 확정된 배송은 실무상 분류 대기 중인 사진이 남아있을 일이 없지만, 방어적으로 같은
          // 필터를 적용해서 혹시 모를 pending 사진이 섞여 보이지 않게 한다.
          const deliveryPhotos = (photos ?? [])
            .filter((p) => p.bus_trip_id === delivery.trip_id && p.classification_status === "done")
            .map((p) => ({ id: p.id, url: photoUrl(p.storage_path), photoType: p.photo_type }));

          return (
            <Card key={delivery.trip_id} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-zinc-900">
                  {delivery.terminal_name}
                  {delivery.departure_time && (
                    <span className="ml-1 font-medium text-zinc-500">
                      {formatDepartureTime(delivery.departure_time)}
                    </span>
                  )}
                </p>
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
