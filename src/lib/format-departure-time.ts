// OCR이 읽거나 사람이 입력한 출발시간은 "0930", "930", "9:30" 등 제각각일 수 있어
// 화면에는 항상 "HH:MM"으로 통일해서 보여준다. 패턴에 안 맞으면 원본 그대로 둔다
// (AI가 시간이 아닌 다른 값을 잘못 읽었을 때 값이 사라지지 않도록).
export function formatDepartureTime(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const [, hour, minute] = colonMatch;
    return `${hour.padStart(2, "0")}:${minute}`;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 3 || digitsOnly.length === 4) {
    const padded = digitsOnly.padStart(4, "0");
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }

  return trimmed;
}
