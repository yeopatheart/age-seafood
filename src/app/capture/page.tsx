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

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pt-6">
      <p className="text-lg font-medium text-zinc-500">
        택배송장을 연속으로 찍고 한 번에 업로드하면, AI가 택배송장에 적힌 터미널명을 읽어 자동으로
        분류합니다. 버스송장을 찍어 올리면 터미널·출발시간·박스 수량도 자동으로 매칭돼요.
      </p>
      <CaptureScreen knownTerminals={knownTerminals} defaultDate={todayKST()} />
    </main>
  );
}
