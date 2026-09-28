import { PhotoStrip } from "@/components/photo-strip";

type Photo = { id: string; url: string; companyName?: string | null };

// 버스송장 칩·택배송장 칩을 같은 너비로 고정해서 각 칩 옆에 그 종류의 사진이 나란히
// 오도록 한다 — 위에 칩 두 개를 몰아서 보여주고 아래에 사진을 전부 섞어 보여주면
// 어떤 사진이 어느 칩에 속하는지 줄이 안 맞아 헷갈린다는 피드백을 반영했다.
// 라벨(1줄)·수량(1줄)을 세로로 쌓아서 옆 사진 썸네일과 높이를 맞춘다 — 가로로 긴 알약
// 모양은 사진 높이의 절반도 안 차지해서 사진이 작아 보이는 낭비였다.
const CHIP_CLASS = "flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-zinc-100 text-zinc-600";

// "박영희 2"처럼 끝에 붙은 번호를 분리한다 — 문자열로 그냥 비교하면 "1" < "10" < "2" 순으로
// 잘못 정렬된다(사전식 비교라 숫자 크기를 모른다). 번호는 숫자로 따로 비교해야 한다.
function splitTrailingNumber(name: string): { base: string; number: number | null } {
  const match = name.match(/^(.*?)\s*([0-9]+)$/);
  if (match) return { base: match[1].trim(), number: Number(match[2]) };
  return { base: name, number: null };
}

// 업체명이 없는 사진(아직 인식 못 함)은 정렬 기준이 없으니 뒤로 보낸다. 같은 이름이면
// 번호가 오름차순(1, 2, 3...)이 되도록 숫자로 비교한다.
function sortByCompanyName(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    const nameA = a.companyName?.trim();
    const nameB = b.companyName?.trim();
    if (!nameA && !nameB) return 0;
    if (!nameA) return 1;
    if (!nameB) return -1;

    const pa = splitTrailingNumber(nameA);
    const pb = splitTrailingNumber(nameB);
    const baseCompare = pa.base.localeCompare(pb.base, "ko");
    if (baseCompare !== 0) return baseCompare;
    if (pa.number === null && pb.number === null) return 0;
    if (pa.number === null) return -1;
    if (pb.number === null) return 1;
    return pa.number - pb.number;
  });
}

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
          <span className="text-sm font-medium">버스송장</span>
          <span className="text-lg font-bold tabular-nums text-zinc-900">{invoicePhotos.length}장</span>
        </span>
        <div className="min-w-0 flex-1">
          <PhotoStrip photos={invoicePhotos} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={CHIP_CLASS}>
          <span className="text-sm font-medium">택배송장</span>
          <span className="text-lg font-bold tabular-nums text-zinc-900">{labelPhotos.length}장</span>
        </span>
        <div className="min-w-0 flex-1">
          <PhotoStrip photos={sortByCompanyName(labelPhotos)} moveOptions={moveOptions} onMove={onMoveLabelPhoto} />
        </div>
      </div>
    </div>
  );
}
