export function QuickSelectChips({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className="min-h-12 rounded-full border-2 border-zinc-200 bg-zinc-50 px-4 text-lg font-medium hover:bg-zinc-100"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
