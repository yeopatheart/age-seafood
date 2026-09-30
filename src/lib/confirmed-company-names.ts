import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { splitTrailingNumber } from "@/lib/company-name";
import { recentUnique } from "@/lib/recent-unique";

// 사람이 확정(trip_reviews에 기록됨)한 배송의 고객명만 "신뢰할 수 있는 이름"으로 취급한다.
// 검수 전 AI 추측까지 이 목록에 섞이면, 한 번의 오독이 다음 추측을 그 오독 쪽으로 계속
// 끌어당기는 문제가 생긴다(actions.ts·vision-actions.ts가 이 목록을 함께 쓴다).
export async function getConfirmedCompanyNames(
  supabase: SupabaseClient<Database>,
  limit = 100,
): Promise<string[]> {
  const { data: reviews } = await supabase.from("trip_reviews").select("bus_trip_id");
  const confirmedTripIds = [...new Set((reviews ?? []).map((r) => r.bus_trip_id))];
  if (confirmedTripIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("label_photos")
    .select("company_name")
    .not("company_name", "is", null)
    .in("bus_trip_id", confirmedTripIds)
    .order("taken_at", { ascending: false })
    .limit(300);

  return recentUnique(
    (rows ?? [])
      .map((r) => (r.company_name ? splitTrailingNumber(r.company_name).base : ""))
      .filter((name) => name.length > 0),
    limit,
  );
}
