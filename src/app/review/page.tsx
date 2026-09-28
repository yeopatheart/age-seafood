import { createClient } from "@/lib/supabase/server";
import { ReviewScreen } from "@/components/review-screen";
import { recentUnique } from "@/lib/recent-unique";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function ReviewPage() {
  const tripDate = todayKST();

  const supabase = await createClient();

  const { data: deliveries } = await supabase
    .from("trip_review_status")
    .select("*")
    .eq("trip_date", tripDate)
    .is("latest_reviewed_at", null)
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

  // 사진마다 서명 URL을 따로 요청하면 그룹이 많아질수록 느려진다 — 한 번에 배치로 발급받는다.
  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signedUrls } =
    paths.length > 0 ? await supabase.storage.from("label-photos").createSignedUrls(paths, 3600) : { data: [] };
  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl ?? ""]));

  const groups = (deliveries ?? []).map((d) => ({
    id: d.trip_id,
    terminalName: d.terminal_name,
    departureTime: d.departure_time,
    labelPhotoCount: d.label_photo_count,
    invoicePhotoCount: d.invoice_photo_count,
    invoiceBoxCount: d.invoice_box_count,
    photos: (photos ?? [])
      .filter((p) => p.bus_trip_id === d.trip_id)
      .map((p) => ({ id: p.id, url: urlByPath.get(p.storage_path) ?? "", photoType: p.photo_type })),
  }));

  const totalLabelPhotos = groups.reduce((sum, g) => sum + g.labelPhotoCount, 0);
  const terminalNames = recentUnique(groups.map((g) => g.terminalName), 50);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-32">
      <ReviewScreen tripDate={tripDate} groups={groups} totalLabelPhotos={totalLabelPhotos} terminalNames={terminalNames} />
    </main>
  );
}
