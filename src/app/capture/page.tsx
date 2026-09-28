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

  // flex-1: 부모가 이제 flex 컨테이너라(layout.tsx) 남은 높이(하단 탭 여백 pb-28은 제외하고)를
  // 정확히 채운다 — height:100%는 중첩된 flex 트리에서 안정적으로 상속되지 않아서 대신 썼다.
  // pt-4·px-4: 헤더·좌우 화면 끝에 버튼이 바로 붙지 않도록 여백을 준다. 하단은 탭 바로 위까지
  // 그대로 채운다(요청한 여백은 상단·좌우뿐).
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-4">
      <CaptureScreen knownTerminals={knownTerminals} defaultDate={todayKST()} />
    </main>
  );
}
