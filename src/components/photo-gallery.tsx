export function PhotoGallery({
  photos,
  emptyText = "아직 촬영된 사진이 없습니다.",
  alt = "촬영된 사진",
}: {
  photos: { id: string; url: string }[];
  emptyText?: string;
  alt?: string;
}) {
  if (photos.length === 0) {
    return <p className="text-lg text-zinc-600">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element -- 서명 URL은 next/image 원격 패턴 등록 없이 바로 써야 함
        <img
          key={photo.id}
          src={photo.url}
          alt={alt}
          className="aspect-square w-full rounded-3xl border border-zinc-200 object-cover shadow-sm"
        />
      ))}
    </div>
  );
}
