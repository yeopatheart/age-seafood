// "박영희 2"처럼 이름 뒤에 붙은 번호를 떼어낸다 — 같은 사람인지 비교할 때는 번호를 빼고
// 이름만 봐야 한다. vision-actions.ts(정규화)와 actions.ts("이미 등록된 고객명" 목록 생성)가
// 함께 쓴다. "use server" 파일은 비동기 함수만 export할 수 있어서 별도 파일로 뺐다.
export function splitTrailingNumber(raw: string): { base: string; suffix: string } {
  const match = raw.match(/^(.*?)\s*([0-9]+)$/);
  if (match) return { base: match[1].trim(), suffix: ` ${match[2]}` };
  return { base: raw.trim(), suffix: "" };
}
