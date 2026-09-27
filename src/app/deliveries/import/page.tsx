import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/page-hero";
import { LabelPhotoImport } from "@/components/label-photo-import";
import { recentUnique } from "@/lib/recent-unique";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: recentDeliveries } = await supabase
    .from("bus_trips")
    .select("terminal_name")
    .order("created_at", { ascending: false })
    .limit(200);

  const knownTerminals = recentUnique((recentDeliveries ?? []).map((t) => t.terminal_name), 20);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <PageHero title="라벨 사진 일괄 업로드" />
      <p className="text-lg text-zinc-700">
        터미널을 미리 정하지 않아도 됩니다. 사진을 한꺼번에 올리면 라벨에 적힌 터미널명을 AI가 읽어서
        자동으로 나눠줍니다. 결과를 확인하고 저장하면 배송이 만들어집니다.
      </p>
      <LabelPhotoImport defaultDate={todayKST()} knownTerminals={knownTerminals} />
    </main>
  );
}
