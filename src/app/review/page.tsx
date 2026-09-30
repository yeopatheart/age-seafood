import { createClient } from "@/lib/supabase/server";
import { ReviewScreen } from "@/components/review-screen";
import { recentUnique } from "@/lib/recent-unique";
import { photoUrl } from "@/lib/photo-url";
import { getConfirmedCompanyNames } from "@/lib/confirmed-company-names";
import { findSimilarCompanyName } from "@/lib/company-name";

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
    .is("latest_reviewed_at", null);

  const deliveryIds = (deliveries ?? []).map((d) => d.trip_id);
  const { data: photos } =
    deliveryIds.length > 0
      ? await supabase
          .from("label_photos")
          .select("*")
          .in("bus_trip_id", deliveryIds)
          .order("taken_at", { ascending: false })
      : { data: [] };

  // 아직 백그라운드에서 분류 대기 중인(classification_status === "pending") 사진은 어느 카드
  // 에도 보여주지 않는다 — 미확인 카드에 잠깐 나타났다가 분류되며 빠져나가서 카드가 텅 빈 채로
  // 남는 문제가 있었다. 대신 진행 상황은 pendingCount로 따로 보여준다.
  const pendingCount = (photos ?? []).filter((p) => p.classification_status === "pending").length;

  // AI가 읽은 고객명은 더 이상 자동으로 기존 이름에 맞춰 덮어써지지 않는다(vision-actions.ts) —
  // 대신 사람이 확정한 이름 중 비슷한 게 있으면 여기서 참고용 제안으로만 계산해 보여준다.
  const confirmedCompanyNames = await getConfirmedCompanyNames(supabase);

  const groups = (deliveries ?? [])
    .map((d) => ({
      id: d.trip_id,
      terminalName: d.terminal_name,
      departureTime: d.departure_time,
      invoiceBoxCount: d.invoice_box_count,
      photos: (photos ?? [])
        .filter((p) => p.bus_trip_id === d.trip_id && p.classification_status === "done")
        .map((p) => ({
          id: p.id,
          url: photoUrl(p.storage_path),
          photoType: p.photo_type,
          companyName: p.company_name,
          companyNameSuggestion: p.company_name
            ? findSimilarCompanyName(p.company_name, confirmedCompanyNames)
            : null,
        })),
    }))
    // 분류 대기 중인 사진만 있던(또는 전부 다른 그룹으로 옮겨져 텅 빈) 그룹은 숨긴다.
    .filter((g) => g.photos.length > 0)
    // DB 기본 정렬(collation)에 기대지 않고 한글 가나다순을 명시적으로 보장한다.
    .sort((a, b) => a.terminalName.localeCompare(b.terminalName, "ko"));

  const totalLabelPhotos = (photos ?? []).filter((p) => p.photo_type === "label").length;
  const terminalNames = recentUnique(groups.map((g) => g.terminalName), 50);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-16">
      <ReviewScreen
        tripDate={tripDate}
        groups={groups}
        totalLabelPhotos={totalLabelPhotos}
        terminalNames={terminalNames}
        pendingCount={pendingCount}
      />
    </main>
  );
}
