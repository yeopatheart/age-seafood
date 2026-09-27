import { FontSizeToggle } from "@/components/font-size-toggle";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pt-6">
      <Card className="space-y-3">
        <p className="text-lg font-bold text-zinc-900">글자 크기</p>
        <FontSizeToggle />
      </Card>
    </main>
  );
}
