export function LabelPhotoGallery({ photos }: { photos: { id: string; url: string }[] }) {
  if (photos.length === 0) {
    return <p className="text-sm text-zinc-400">아직 촬영된 사진이 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element -- 서명 URL은 next/image 원격 패턴 등록 없이 바로 써야 함
        <img
          key={photo.id}
          src={photo.url}
          alt="박스 라벨 사진"
          className="aspect-square w-full rounded border object-cover"
        />
      ))}
    </div>
  );
}
