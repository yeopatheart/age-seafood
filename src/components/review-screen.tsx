"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Calendar, Loader2 } from "lucide-react";
import { renameGroup, updateDepartureTime, confirmGroups, moveLabelPhoto } from "@/app/actions";
import { formatDepartureTime } from "@/lib/format-departure-time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteDeliveryButton } from "@/components/delete-delivery-button";
import { DeliveryPhotoRows } from "@/components/delivery-photo-rows";
import { NEW_GROUP } from "@/components/photo-strip";

type Photo = { id: string; url: string; photoType: "label" | "invoice"; companyName?: string | null };
type Group = {
  id: string;
  terminalName: string;
  departureTime: string | null;
  invoiceBoxCount: number | null;
  photos: Photo[];
};

export function ReviewScreen({
  tripDate,
  groups,
  totalLabelPhotos,
  terminalNames,
  pendingCount,
}: {
  tripDate: string;
  groups: Group[];
  totalLabelPhotos: number;
  terminalNames: string[];
  pendingCount: number;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleGroups = groups.filter((g) => !deletedIds.has(g.id));

  // 업로드 직후엔 AI 분류가 아직 백그라운드에서 진행 중일 수 있다 — 분류가 끝나는 대로(서버가
  // revalidatePath로 캐시를 갱신해두면) 화면에도 반영되도록 잠깐 동안만 주기적으로 새로고침한다.
  useEffect(() => {
    if (pendingCount === 0) return;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= 10) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [pendingCount, router]);

  // 분류 중 사진 수는 하나씩 줄어들다 0이 되므로, 처음 본 최대치를 기준으로 진행률(%)을 낸다.
  // 도중에 사진이 더 올라와서 대기 수가 다시 늘면 그 값을 새 기준으로 삼는다 — 렌더링 도중
  // 값을 조정하는 React 권장 패턴(이펙트 대신)으로, 이전 pendingCount와 비교해 변화를 감지한다.
  const [prevPendingCount, setPrevPendingCount] = useState(pendingCount);
  const [pendingBaseline, setPendingBaseline] = useState(pendingCount);
  if (pendingCount !== prevPendingCount) {
    setPrevPendingCount(pendingCount);
    if (pendingCount > pendingBaseline || pendingCount === 0) setPendingBaseline(pendingCount);
  }
  const progressPercent = pendingBaseline > 0 ? Math.round(((pendingBaseline - pendingCount) / pendingBaseline) * 100) : 0;

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRename(groupId: string, value: string, previousValue: string) {
    if (!value.trim() || value.trim() === previousValue) return;
    try {
      await renameGroup(groupId, value.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "이름 변경에 실패했습니다.");
    }
  }

  async function handleDepartureTimeChange(groupId: string, input: HTMLInputElement, previousValue: string | null) {
    const formatted = formatDepartureTime(input.value);
    if (formatted === formatDepartureTime(previousValue)) return;
    try {
      await updateDepartureTime(groupId, formatted);
      input.value = formatted;
    } catch (e) {
      setError(e instanceof Error ? e.message : "출발시간 변경에 실패했습니다.");
    }
  }

  async function handleMovePhoto(photoId: string, value: string) {
    const targetName = value === NEW_GROUP ? window.prompt("새 그룹 이름을 입력해주세요.")?.trim() : value;
    if (!targetName) return;
    try {
      await moveLabelPhoto(photoId, tripDate, targetName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 이동에 실패했습니다.");
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      await confirmGroups(Array.from(checked));
      setChecked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "확정에 실패했습니다.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-zinc-100 px-4 text-lg font-semibold text-zinc-900">
          <Calendar className="h-5 w-5 text-zinc-500" strokeWidth={2.25} />
          {tripDate}
        </div>
        <p className="text-right text-base font-medium text-zinc-500">
          전체 박스 <span className="font-bold text-zinc-900">{totalLabelPhotos}</span>개 | 터미널{" "}
          <span className="font-bold text-zinc-900">{visibleGroups.length}</span>개
        </p>
      </div>

      {pendingCount > 0 && (
        <div className="space-y-2 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="flex items-center gap-2 text-base font-medium text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI가 사진을 분류하고 있어요 ({pendingBaseline - pendingCount}/{pendingBaseline})
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {visibleGroups.length === 0 && pendingCount === 0 && (
        <Card className="text-center text-lg text-zinc-500">확인할 사진이 없습니다.</Card>
      )}

      {visibleGroups.map((group) => {
        const isChecked = checked.has(group.id);
        return (
          <Card
            key={group.id}
            className={`space-y-4 transition-shadow ${isChecked ? "ring-2 ring-[#10223d]" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <label className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleChecked(group.id)}
                  className="peer sr-only"
                  aria-label={`${group.terminalName} 확정 대상으로 선택`}
                />
                <span className="absolute inset-0 rounded-full border-2 border-zinc-300 bg-white transition-colors peer-checked:border-[#10223d] peer-checked:bg-[#10223d]" />
                <Check
                  className="relative h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  strokeWidth={3}
                />
              </label>
              <input
                defaultValue={group.terminalName}
                onBlur={(e) => handleRename(group.id, e.target.value, group.terminalName)}
                className="h-12 w-24 min-w-0 shrink rounded-xl bg-zinc-100 px-3 text-center text-base font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                defaultValue={formatDepartureTime(group.departureTime)}
                onBlur={(e) => handleDepartureTimeChange(group.id, e.target, group.departureTime)}
                placeholder="출발시간"
                className="h-12 w-16 shrink-0 rounded-xl bg-zinc-100 px-2 text-center text-base text-zinc-700 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1" />
              <DeleteDeliveryButton
                deliveryId={group.id}
                onDeleted={() => setDeletedIds((prev) => new Set(prev).add(group.id))}
              />
            </div>

            <DeliveryPhotoRows
              labelPhotos={group.photos.filter((p) => p.photoType === "label")}
              invoicePhotos={group.photos.filter((p) => p.photoType === "invoice")}
              invoiceBoxCount={group.invoiceBoxCount}
              moveOptions={terminalNames.filter((name) => name !== group.terminalName)}
              onMoveLabelPhoto={handleMovePhoto}
            />
          </Card>
        );
      })}

      {error && <p className="text-lg font-medium text-rose-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-20 z-10 border-t border-zinc-100 bg-white/95 p-3 backdrop-blur">
        <Button onClick={handleConfirm} disabled={checked.size === 0 || confirming} className="w-full">
          {confirming ? "확정 중..." : `확정하기 (${checked.size})`}
        </Button>
      </div>
    </div>
  );
}
