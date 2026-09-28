// 로그인한 사용자에게만 사진을 내려주는 프록시 경로(src/app/api/photos/[...path])를 가리킨다.
// 서명 URL과 달리 주소가 매번 바뀌지 않아서 브라우저가 사진을 캐시해 재사용할 수 있다.
export function photoUrl(storagePath: string): string {
  return `/api/photos/${storagePath}`;
}
