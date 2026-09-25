import { renderAppIcon } from "@/lib/app-icon";

// iOS는 180x180을 권장 크기로 쓴다.
export function GET() {
  return renderAppIcon(180);
}
