export function ReviewStatusBadge({ reviewed }: { reviewed: boolean }) {
  if (!reviewed) {
    return (
      <span className="inline-flex h-12 shrink-0 items-center gap-1 rounded-full bg-zinc-200 px-4 text-base font-bold text-zinc-700">
        ○ 미검수
      </span>
    );
  }

  return (
    <span className="inline-flex h-12 shrink-0 items-center gap-1 rounded-full bg-green-100 px-4 text-base font-bold text-green-700">
      ✓ 검수완료
    </span>
  );
}
