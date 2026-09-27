import { PhotoStrip } from "@/components/photo-strip";

type Photo = { id: string; url: string };

// 택배송장 사진(여러 장, 넓게 스크롤)과 버스송장 사진(1장, 좁게)을 가로로 나란히 보여준다.
// 위에 이미 장수가 칩으로 표시되므로, 사진이 없을 때는 빈 칸을 그대로 두고 안내문구를
// 따로 보여주지 않는다.
// moveOptions·onMoveLabelPhoto가 주어지면(사진확인 탭 전용) 택배송장 사진을 확대해서 다른
// 터미널로 옮길 수 있다 — 이력 탭에서는 넘기지 않아 읽기 전용이 된다.
export function DeliveryPhotos({
  labelPhotos,
  invoicePhotos,
  moveOptions,
  onMoveLabelPhoto,
}: {
  labelPhotos: Photo[];
  invoicePhotos: Photo[];
  moveOptions?: string[];
  onMoveLabelPhoto?: (photoId: string, targetName: string) => void;
}) {
  if (labelPhotos.length === 0 && invoicePhotos.length === 0) return null;

  return (
    <div className="grid grid-cols-[8fr_2fr] gap-2">
      <PhotoStrip photos={labelPhotos} moveOptions={moveOptions} onMove={onMoveLabelPhoto} />
      <PhotoStrip photos={invoicePhotos} />
    </div>
  );
}
