export function DeliveryCountSummary({
  labelPhotoCount,
  invoicePhotoCount,
  invoiceBoxCount,
}: {
  labelPhotoCount: number;
  invoicePhotoCount: number;
  invoiceBoxCount: number | null;
}) {
  const matches = invoiceBoxCount === labelPhotoCount;

  return (
    <div className="flex flex-wrap items-center gap-2 text-base">
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-600">
        버스송장 <span className="tabular-nums font-bold text-zinc-900">{invoicePhotoCount}</span>장
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 font-medium text-zinc-600">
        택배송장 <span className="tabular-nums font-bold text-zinc-900">{labelPhotoCount}</span>장
      </span>
      {invoiceBoxCount !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold ${
            matches ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}
        >
          수량 <span className="tabular-nums">{invoiceBoxCount}</span> {matches ? "일치" : "불일치"}
        </span>
      )}
    </div>
  );
}
