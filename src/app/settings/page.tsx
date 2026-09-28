import { createClient } from "@/lib/supabase/server";
import { readDisplayName } from "@/lib/user-display-name";
import { DisplayNameForm } from "@/components/display-name-form";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const currentName = readDisplayName(data?.claims.user_metadata);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pt-6">
      <Card className="space-y-3">
        <p className="text-lg font-bold text-zinc-900">이름</p>
        <DisplayNameForm initialName={currentName} />
      </Card>

      <Card className="space-y-3">
        <p className="text-lg font-bold text-zinc-900">글자 크기</p>
        <FontSizeToggle />
      </Card>
    </main>
  );
}
