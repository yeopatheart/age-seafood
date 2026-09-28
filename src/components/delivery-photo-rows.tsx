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
  moveOptions,
  onMoveLabelPhoto,
}: {
  labelPhotos: Photo[];
  invoicePhotos: Photo[];
  invoiceBoxCount: number | null;
  moveOptions?: string[];
  onMoveLabelPhoto?: (photoId: string, targetName: string) => void;
}) {
  // 박스 수량(버스송장에 적힌 신고 수량)과 실제로 올라온 택배송장 사진 장수를 대사한다.
  // 단순 일치/불일치만 보여주면 1개 차이와 10개 차이를 구분할 수 없어서, 차이 값과 방향을
  // 같이 보여준다 — 담당자가 뭘 먼저 봐야 할지 바로 판단할 수 있게.
  const diff = invoiceBoxCount === null ? null : invoiceBoxCount - labelPhotos.length;
  const matches = diff === 0;

  return (
    <div className="space-y-3">
      {invoiceBoxCount !== null && (
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-base font-semibold ${
            matches ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}
        >
          <span className="tabular-nums">{labelPhotos.length}</span>/<span className="tabular-nums">{invoiceBoxCount}</span>
          {matches ? " 일치" : diff! > 0 ? ` · ${diff}개 부족` : ` · ${Math.abs(diff!)}개 초과`}
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
          <PhotoStrip photos={labelPhotos} moveOptions={moveOptions} onMove={onMoveLabelPhoto} />
        </div>
      </div>
    </div>
  );
}
