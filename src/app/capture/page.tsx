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

  // absolute inset-0: 부모의 pb-28(다른 페이지들의 하단 탭 여유 공간)까지 무시하고 헤더 바로
  // 아래부터 탭 바로 위까지 정확히 꽉 채운다 — 버튼 2개로 화면이 꽉 차야 한다.
  return (
    <main className="absolute inset-0 mx-auto flex max-w-3xl flex-col">
      <CaptureScreen knownTerminals={knownTerminals} defaultDate={todayKST()} />
    </main>
  );
}
