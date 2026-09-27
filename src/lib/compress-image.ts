// 업로드 전 브라우저에서 미리 축소·압축한다 — 휴대폰 카메라 원본(수 MB)을 그대로 올리면
// 터미널 현장 같은 약한 네트워크에서 특히 느리다. 실패하면 원본을 그대로 쓴다.
export async function compressImage(file: File, maxDimension = 1600, quality = 0.75): Promise<File | Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob ?? file;
}
