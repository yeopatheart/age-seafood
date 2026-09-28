"use client";

import { useState } from "react";
import { Check, Calendar } from "lucide-react";
import { moveLabelPhoto, renameGroup, updateDepartureTime, confirmGroups } from "@/app/actions";
import { formatDepartureTime } from "@/lib/format-departure-time";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteDeliveryButton } from "@/components/delete-delivery-button";
import { DeliveryPhotoRows } from "@/components/delivery-photo-rows";
import { NEW_GROUP } from "@/components/photo-strip";

type Photo = { id: string; url: string; photoType: "label" | "invoice" };
type Group = {
  id: string;
  terminalName: string;
  departureTime: string | null;
  labelPhotoCount: number;
  invoicePhotoCount: number;
  invoiceBoxCount: number | null;
  photos: Photo[];
};

export function ReviewScreen({
  tripDate,
  groups,
  terminalNames,
  totalLabelPhotos,
}: {
  tripDate: string;
  groups: Group[];
  terminalNames: string[];
  totalLabelPhotos: number;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleGroups = groups.filter((g) => !deletedIds.has(g.id));

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
    let targetName = value;
    if (value === NEW_GROUP) {
      const input = window.prompt("옮길 터미널명을 입력해주세요");
      if (!input || !input.trim()) return;
      targetName = input.trim();
    }
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
          전체 업로드 <span className="font-bold text-zinc-900">{totalLabelPhotos}</span>장 | 터미널{" "}
          <span className="font-bold text-zinc-900">{visibleGroups.length}</span>개
        </p>
      </div>

      {visibleGroups.length === 0 && (
        <Card className="text-center text-lg text-zinc-500">확인할 사진이 없습니다.</Card>
      )}

      {visibleGroups.map((group) => {
        const isChecked = checked.has(group.id);
        return (
          <Card
            key={group.id}
            className={`space-y-4 transition-shadow ${isChecked ? "ring-2 ring-blue-500" : ""}`}
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
                <span className="absolute inset-0 rounded-full border-2 border-zinc-300 bg-white transition-colors peer-checked:border-blue-600 peer-checked:bg-blue-600" />
                <Check
                  className="relative h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  strokeWidth={3}
                />
              </label>
              <input
                defaultValue={group.terminalName}
                onBlur={(e) => handleRename(group.id, e.target.value, group.terminalName)}
                className="h-11 w-24 min-w-0 shrink rounded-xl bg-zinc-100 px-2 text-center text-base font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                defaultValue={formatDepartureTime(group.departureTime)}
                onBlur={(e) => handleDepartureTimeChange(group.id, e.target, group.departureTime)}
                placeholder="출발시간"
                className="h-11 w-16 shrink-0 rounded-xl bg-zinc-100 px-1 text-center text-base text-zinc-700 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500"
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
              moveOptions={terminalNames}
              onMoveLabelPhoto={handleMovePhoto}
            />
          </Card>
        );
      })}

      {error && <p className="text-lg font-medium text-rose-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-zinc-100 bg-white/95 p-3 backdrop-blur">
        <Button onClick={handleConfirm} disabled={checked.size === 0 || confirming} className="w-full">
          {confirming ? "확정 중..." : `확정하기 (${checked.size})`}
        </Button>
      </div>
    </div>
  );
}
