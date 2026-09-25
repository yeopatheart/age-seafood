export function MismatchBadge({ isMismatch }: { isMismatch: boolean | null }) {
  if (isMismatch === null) {
    return (
      <span className="shrink-0 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
        송장 대기
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${
        isMismatch ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {isMismatch ? "불일치" : "일치"}
    </span>
  );
}
