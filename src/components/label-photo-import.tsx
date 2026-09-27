"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { commitLabelPhotoGroups } from "@/app/deliveries/actions";
import { suggestTerminalName } from "@/app/deliveries/vision-actions";
import { Button } from "@/components/ui/button";

type Group = { id: string; name: string };
type Photo = { id: string; storagePath: string; previewUrl: string; groupId: string };

const NEW_GROUP = "__new__";

export function LabelPhotoImport({
  defaultDate,
  knownTerminals,
}: {
  defaultDate: string;
  knownTerminals: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // 업로드 도중 같은 터미널명으로 온 사진들을 그룹 하나로 합치기 위한 동기 캐시.
  // React state는 비동기라 여러 사진이 동시에 끝날 때 그룹 id를 놓칠 수 있어 ref로 잡는다.
  const groupIdByNameRef = useRef<Map<string, string>>(new Map());

  const [date, setDate] = useState(defaultDate);
  const [groups, setGroups] = useState<Group[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getOrCreateGroupId(name: string) {
    const existing = groupIdByNameRef.current.get(name);
    if (existing) return { id: existing, isNew: false };
    const id = crypto.randomUUID();
    groupIdByNameRef.current.set(name, id);
    return { id, isNew: true };
  }

  function addPhotoToGroup(storagePath: string, previewUrl: string, suggestedName: string | null) {
    const name = suggestedName?.trim() ?? "";
    const { id, isNew } = getOrCreateGroupId(name);
    if (isNew) setGroups((prev) => [...prev, { id, name }]);
    setPhotos((prev) => [...prev, { id: crypto.randomUUID(), storagePath, previewUrl, groupId: id }]);
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setProcessing(true);
    setProcessedCount(0);
    setTotalCount(files.length);

    const supabase = createClient();

    await Promise.all(
      files.map(async (file) => {
        try {
          let toUpload: File | Blob = file;
          try {
            toUpload = await compressImage(file);
          } catch {
            // 압축이 안 되는 환경이면 원본 그대로 올린다
          }
          const storagePath = `label/${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage.from("label-photos").upload(storagePath, toUpload);
          if (uploadError) throw new Error(uploadError.message);

          const previewUrl = URL.createObjectURL(file);
          const suggested = await suggestTerminalName(storagePath, knownTerminals);
          addPhotoToGroup(storagePath, previewUrl, suggested);
        } catch {
          setError("일부 사진 업로드에 실패했습니다. 다시 시도해주세요.");
        } finally {
          setProcessedCount((c) => c + 1);
        }
      }),
    );

    setProcessing(false);
  }

  function renameGroup(groupId: string, name: string) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)));
  }

  function movePhoto(photoId: string, value: string) {
    if (value === NEW_GROUP) {
      const newGroup = { id: crypto.randomUUID(), name: "" };
      setGroups((prev) => [...prev, newGroup]);
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, groupId: newGroup.id } : p)));
      return;
    }
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, groupId: value } : p)));
  }

  const visibleGroups = groups.filter((g) => photos.some((p) => p.groupId === g.id));
  const canSave = !processing && !saving && visibleGroups.length > 0 && visibleGroups.every((g) => g.name.trim());

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = visibleGroups.map((g) => ({
        terminalName: g.name.trim(),
        storagePaths: photos.filter((p) => p.groupId === g.id).map((p) => p.storagePath),
      }));
      await commitLabelPhotoGroups(date, payload);
      router.push("/deliveries");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <label htmlFor="import-date" className="text-lg font-medium">
          날짜
        </label>
        <input
          id="import-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-2xl border-2 border-zinc-200 px-3 text-lg"
        />
      </div>

      <div>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="min-h-20 w-full rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center text-xl font-bold text-zinc-900 disabled:opacity-50"
        >
          {processing ? `분류 중... (${processedCount}/${totalCount})` : "📷 라벨 사진 여러 장 선택"}
        </button>
      </div>

      {visibleGroups.map((group) => {
        const groupPhotos = photos.filter((p) => p.groupId === group.id);
        return (
          <div key={group.id} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
            <input
              value={group.name}
              onChange={(e) => renameGroup(group.id, e.target.value)}
              placeholder="터미널명을 입력해주세요"
              className="h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 text-lg font-bold"
            />
            <p className="text-base text-zinc-600">{groupPhotos.length}장</p>
            <div className="grid grid-cols-3 gap-2">
              {groupPhotos.map((photo) => (
                <div key={photo.id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 URL이라 next/image 대상이 아님 */}
                  <img
                    src={photo.previewUrl}
                    alt="라벨 사진"
                    className="aspect-square w-full rounded-2xl border border-zinc-200 object-cover"
                  />
                  <select
                    value={group.id}
                    onChange={(e) => movePhoto(photo.id, e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 text-sm"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name || "(이름 없음)"}
                      </option>
                    ))}
                    <option value={NEW_GROUP}>새 그룹으로 분리</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {visibleGroups.length > 0 && (
        <Button onClick={handleSave} disabled={!canSave} className="w-full">
          {saving ? "저장 중..." : "저장"}
        </Button>
      )}

      {!canSave && visibleGroups.some((g) => !g.name.trim()) && (
        <p className="text-lg text-red-600">이름이 비어 있는 그룹이 있습니다 — 터미널명을 입력해주세요.</p>
      )}

      {error && <p className="text-lg text-red-600">{error}</p>}
    </div>
  );
}
