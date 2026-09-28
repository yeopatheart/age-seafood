import { Loader2 } from "lucide-react";

// 탭을 누르는 즉시 이 화면이 뜨고, 서버에서 데이터를 가져오는 동안 화면이 멈춘 것처럼
// 보이지 않게 한다 (Next.js App Router의 loading.tsx 컨벤션).
export default function ReviewLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
    </div>
  );
}
