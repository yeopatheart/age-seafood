// "박영희 2"처럼 이름 뒤에 붙은 번호를 떼어낸다 — 같은 사람인지 비교할 때는 번호를 빼고
// 이름만 봐야 한다. vision-actions.ts(정규화)와 actions.ts("이미 등록된 고객명" 목록 생성)가
// 함께 쓴다. "use server" 파일은 비동기 함수만 export할 수 있어서 별도 파일로 뺐다.
export function splitTrailingNumber(raw: string): { base: string; suffix: string } {
  const match = raw.match(/^(.*?)\s*([0-9]+)$/);
  if (match) return { base: match[1].trim(), suffix: ` ${match[2]}` };
  return { base: raw.trim(), suffix: "" };
}

// 두 문자열이 몇 글자나 다른지(편집 거리) 계산한다.
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// raw와 편집거리가 가까운 확정된 고객명이 있으면 "참고용 제안"으로만 돌려준다 — 예전에는 이
// 결과로 company_name을 자동으로 덮어썼는데(vision-actions.ts), "스시아타이"·"스시미우라"처럼
// 접두어가 같은 서로 다른 업체가 실제로 많아서 편집거리만으로는 다른 업체를 같은 업체로
// 잘못 합치는 사고가 났다(예: 실제로 다른 두 업체명이 전부 "스시라영"으로 저장됨). 이제는
// 확인 탭에서 사람에게 후보로만 보여주고, 실제 반영은 사람이 판단한다.
export function findSimilarCompanyName(raw: string, knownNames: string[]): string | null {
  const { base } = splitTrailingNumber(raw);
  if (!base) return null;

  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  for (const known of knownNames) {
    if (known === base) return null; // 이미 확정된 이름과 정확히 같으면 제안할 게 없다
    const distance = levenshtein(base, known);
    const threshold = base.length <= 2 ? 0 : base.length <= 4 ? 1 : 2;
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = known;
    }
  }
  return bestMatch;
}
