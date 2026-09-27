import { Check } from "lucide-react";

export function ReviewStatusBadge({ reviewed }: { reviewed: boolean }) {
  if (!reviewed) {
    return (
      <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-4 text-base font-semibold text-zinc-500">
        미검수
      </span>
    );
  }

  return (
    <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-4 text-base font-semibold text-emerald-600">
      <Check className="h-4 w-4" strokeWidth={3} />
      검수완료
    </span>
  );
}
