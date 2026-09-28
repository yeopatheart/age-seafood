// Supabase의 user_metadata는 타입상 [key: string]: any라서, 값을 꺼낼 때 any가 새지 않도록
// 여기서 한 번 string으로 좁혀둔다. 이름을 설정하지 않은 사용자는 빈 문자열을 받는다.
export function readDisplayName(userMetadata: { [key: string]: unknown } | null | undefined): string {
  const raw = userMetadata?.full_name;
  return typeof raw === "string" ? raw.trim() : "";
}
