"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDelivery } from "@/app/deliveries/actions";
import { Button } from "@/components/ui/button";

export function DeleteDeliveryButton({ deliveryId, redirectTo }: { deliveryId: string; redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("이 배송을 삭제할까요? 촬영한 사진과 검수 기록도 함께 삭제됩니다.")) {
      return;
    }
    setPending(true);
    await deleteDelivery(deliveryId);
    if (redirectTo) router.push(redirectTo);
    else setPending(false);
  }

  return (
    <Button variant="danger" onClick={handleDelete} disabled={pending}>
      {pending ? "삭제 중..." : "삭제"}
    </Button>
  );
}
