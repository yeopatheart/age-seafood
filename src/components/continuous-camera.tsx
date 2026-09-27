"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Shot = { id: string; blob: Blob; previewUrl: string };

function isCameraSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

// 상차 직전 여러 박스를 연달아 찍는 실제 작업 흐름에 맞춰, 셔터를 누를 때마다 앱으로
// 돌아가지 않고 카메라 화면 안에서 계속 여러 장을 찍은 뒤 한 번에 "업로드"할 수 있게 한다.
// getUserMedia가 막히거나 지원하지 않는 기기에서는 기존 방식(갤러리 다중선택)으로 폴백한다.
//
// 부모는 이 컴포넌트를 `open`일 때만 렌더링한다(마운트 = 열림, 언마운트 = 닫힘). 매번 새로
// 마운트되므로 상태가 항상 깨끗하게 시작되고, effect 안에서 이전 상태를 지우는 setState가
// 필요 없다.
export function ContinuousCamera({
  title,
  onClose,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (files: File[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const [shots, setShots] = useState<Shot[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(() =>
    isCameraSupported() ? null : "이 브라우저에서는 카메라를 직접 열 수 없습니다.",
  );
  const [starting, setStarting] = useState(isCameraSupported);

  useEffect(() => {
    if (!isCameraSupported()) return;

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setCameraError("카메라를 열 수 없습니다. 권한을 확인하거나 갤러리에서 선택해주세요.");
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    // 언마운트(닫힘) 시 남아있는 미리보기 URL을 정리한다.
    return () => {
      setShots((current) => {
        current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        return current;
      });
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setShots((prev) => [...prev, { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob) }]);
      },
      "image/jpeg",
      0.9,
    );
  }

  function removeShot(id: string) {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }

  function handleUpload() {
    const files = shots.map((s, i) => new File([s.blob], `capture-${i}.jpg`, { type: "image/jpeg" }));
    setShots([]);
    onSubmit(files);
  }

  function handleFallbackFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) onSubmit(files);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <button
          onClick={onClose}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-full transition-colors active:bg-white/10"
          aria-label="닫기"
        >
          <X className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      {cameraError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
          <p className="text-lg font-medium text-zinc-300">{cameraError}</p>
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFallbackFiles}
            className="hidden"
          />
          <Button onClick={() => fallbackInputRef.current?.click()}>갤러리에서 선택</Button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden bg-zinc-900">
            {starting && (
              <p className="absolute inset-0 flex items-center justify-center text-lg text-white">카메라 준비 중...</p>
            )}
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          </div>

          {shots.length > 0 && (
            <div className="flex gap-2 overflow-x-auto bg-zinc-950 p-3">
              {shots.map((shot) => (
                <div key={shot.id} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 URL이라 next/image 대상이 아님 */}
                  <img
                    src={shot.previewUrl}
                    alt="촬영한 사진"
                    className="h-20 w-20 rounded-2xl object-cover shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                  />
                  <button
                    onClick={() => removeShot(shot.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
                    aria-label="이 사진 삭제"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 bg-black p-6">
            <button
              onClick={capture}
              disabled={starting}
              className="h-20 w-20 rounded-full border-[5px] border-white bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition-transform active:scale-95 disabled:opacity-40"
              aria-label="촬영"
            />
          </div>

          {shots.length > 0 && (
            <div className="p-4 pb-8">
              <Button onClick={handleUpload} className="w-full">
                업로드 ({shots.length}장)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
