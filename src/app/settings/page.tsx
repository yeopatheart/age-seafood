import { FontSizeToggle } from "@/components/font-size-toggle";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">설정</h1>

      <div className="space-y-2 rounded-3xl bg-white p-4 shadow-sm">
        <p className="text-lg font-medium">글자 크기</p>
        <FontSizeToggle />
      </div>
    </main>
  );
}
