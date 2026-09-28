import { PhotoStrip } from "@/components/photo-strip";

type Photo = { id: string; url: string };

// 버스송장 칩·택배송장 칩을 같은 너비로 고정해서 각 칩 옆에 그 종류의 사진이 나란히
// 오도록 한다 — 위에 칩 두 개를 몰아서 보여주고 아래에 사진을 전부 섞어 보여주면
// 어떤 사진이 어느 칩에 속하는지 줄이 안 맞아 헷갈린다는 피드백을 반영했다.
const CHIP_CLASS = "flex h-9 w-28 shrink-0 items-center justify-center gap-1 rounded-full bg-zinc-100 text-base font-medium text-zinc-600";

export function DeliveryPhotoRows({
  labelPhotos,
  invoicePhotos,
  invoiceBoxCount,
}: {
  labelPhotos: Photo[];
  invoicePhotos: Photo[];
  invoiceBoxCount: number | null;
}) {
  const matches = invoiceBoxCount === labelPhotos.length;

  return (
    <div className="space-y-3">
      {invoiceBoxCount !== null && (
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-base font-semibold ${
            matches ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}
        >
          수량 <span className="tabular-nums">{invoiceBoxCount}</span> {matches ? "일치" : "불일치"}
        </span>
      )}

      <div className="flex items-center gap-3">
        <span className={CHIP_CLASS}>
          버스송장 <span className="tabular-nums font-bold text-zinc-900">{invoicePhotos.length}</span>장
        </span>
        <div className="min-w-0 flex-1">
          <PhotoStrip photos={invoicePhotos} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={CHIP_CLASS}>
          택배송장 <span className="tabular-nums font-bold text-zinc-900">{labelPhotos.length}</span>장
        </span>
        <div className="min-w-0 flex-1">
          <PhotoStrip photos={labelPhotos} />
        </div>
      </div>
    </div>
  );
}
