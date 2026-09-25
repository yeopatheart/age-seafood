"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBusTrip } from "@/app/bus-trips/actions";

export function DeleteBusTripButton({
  busTripId,
  redirectTo,
}: {
  busTripId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("이 버스 편을 삭제할까요? 배정된 주문은 미배정으로 돌아가고, 촬영한 사진도 함께 삭제됩니다.")) {
      return;
    }
    setPending(true);
    await deleteBusTrip(busTripId);
    if (redirectTo) router.push(redirectTo);
    else setPending(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
