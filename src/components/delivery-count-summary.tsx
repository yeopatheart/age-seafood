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
    <>
      <p className="text-base text-zinc-700">라벨 사진 {labelPhotoCount}장</p>
      <p className="text-base text-zinc-700">
        버스 송장 사진 {invoicePhotoCount}장
        {invoiceBoxCount !== null && (
          <span className={matches ? "text-green-700" : "text-red-600"}>
            {" "}
            · 수량 {invoiceBoxCount} {matches ? "일치" : "불일치"}
          </span>
        )}
      </p>
    </>
  );
}
