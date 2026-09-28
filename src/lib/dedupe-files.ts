// 갤러리에서 같은 사진을 실수로 두 번 고르거나, 연속촬영 중 같은 프레임이 중복 저장되는
// 경우를 막는다. 내용(바이트) 기준 해시라 파일명이 달라도 잡아내고, 반대로 실제로 다른
// 사진이면(카메라 프레임은 미세하게라도 항상 달라짐) 잘못 걸러내지 않는다.
export async function dedupeFiles(files: File[]): Promise<{ unique: File[]; duplicateCount: number }> {
  const seen = new Set<string>();
  const unique: File[] = [];

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (seen.has(hash)) continue;
    seen.add(hash);
    unique.push(file);
  }

  return { unique, duplicateCount: files.length - unique.length };
}
