"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteDelivery } from "@/app/actions";

// 삭제가 끝나면 페이지 전체가 다시 조회될 때까지 기다리지 않고, onDeleted로 부모의 화면
// 목록에서 바로 지워서(로컬 상태) 체감 속도를 높인다. 서버의 revalidatePath는 그대로
// 백그라운드에서 일어나 다음 방문 시에도 정확하다.
export function DeleteDeliveryButton({
  deliveryId,
  redirectTo,
  onDeleted,
}: {
  deliveryId: string;
  redirectTo?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    if (!confirm("이 배송을 삭제할까요? 촬영한 사진과 검수 기록도 함께 삭제됩니다.")) {
      return;
    }
    setPending(true);
    setError(false);
    try {
      await deleteDelivery(deliveryId);
      if (redirectTo) router.push(redirectTo);
      else onDeleted?.();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="flex h-11 w-24 shrink-0 items-center justify-center gap-1 rounded-full text-sm font-semibold text-rose-500 transition-colors active:bg-rose-50 disabled:cursor-not-allowed"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "삭제 중..." : error ? "다시 시도" : "삭제"}
    </button>
  );
}
