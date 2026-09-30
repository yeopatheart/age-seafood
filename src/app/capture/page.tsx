import { createClient } from "@/lib/supabase/server";
import { CaptureScreen } from "@/components/capture-screen";
import { recentUnique } from "@/lib/recent-unique";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function CapturePage() {
  const supabase = await createClient();
  const { data: recentDeliveries } = await supabase
    .from("bus_trips")
    .select("terminal_name")
    .order("created_at", { ascending: false })
    .limit(200);

  const knownTerminals = recentUnique((recentDeliveries ?? []).map((t) => t.terminal_name), 20);

  // 라벨 사진 OCR이 손글씨 고객명을 기존 표기에 맞춰 보정하려면(vision-actions.ts의
  // normalizeCompanyName) 이 목록이 실제로 채워져 있어야 한다 — 지금까지는 이 조회 자체가
  // 없어서 프롬프트에 항상 "(없음)"으로 나가고 있었다(고객명 인식률 저하의 주 원인).
  const { data: recentLabelPhotos } = await supabase
    .from("label_photos")
    .select("company_name")
    .not("company_name", "is", null)
    .order("taken_at", { ascending: false })
    .limit(200);

  const knownCompanyNames = recentUnique(
    (recentLabelPhotos ?? []).map((p) => p.company_name).filter((n): n is string => n != null),
    50,
  );

  // 공용 레이아웃(layout.tsx)의 wrapper를 flex로 바꿔서 이 화면을 채웠더니, 확인·이력처럼
  // 스크롤이 필요한 긴 페이지가 flex-shrink 때문에 찌그러지는 회귀가 생겼다. 그래서 이 화면만
  // 뷰포트 기준(100dvh)에서 헤더(h-16=64px)·하단 탭(min-h-20=80px + 안전영역)을 직접 뺀
  // 높이를 쓴다 — 부모를 전혀 건드리지 않아 다른 페이지에 영향이 없다.
  // pt-4·px-4: 헤더·좌우 화면 끝에 버튼이 바로 붙지 않도록 여백을 준다. 하단은 탭 바로 위까지
  // 그대로 채운다(요청한 여백은 상단·좌우뿐).
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-4"
      style={{ height: "calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px))" }}
    >
      <CaptureScreen knownTerminals={knownTerminals} knownCompanyNames={knownCompanyNames} defaultDate={todayKST()} />
    </main>
  );
}
