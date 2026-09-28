"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLimiter } from "@/lib/concurrency-limit";
import { suggestTerminalName, suggestBusInvoiceInfo } from "@/app/vision-actions";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

const UNRECOGNIZED = "미확인";

// getUser()는 매 호출마다 Auth 서버로 네트워크 왕복을 한다. getClaims()는 JWKS를 로컬(웹크립토)로
// 캐시해서 검증하므로 훨씬 빠르다 — 사진 업로드처럼 자주 호출되는 액션에서 체감 속도 차이가 크다.
async function requireUserId(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new Error("로그인이 필요합니다.");
  return userId;
}

function revalidateAll() {
  revalidatePath("/capture");
  revalidatePath("/review");
  revalidatePath("/history");
}

// (날짜, 터미널명)으로 배송(bus_trips)을 찾아 재사용하거나 없으면 새로 만든다. 사진이 올라오는
// 즉시 그룹이 생기므로, 사람이 미리 "배송을 만드는" 진입점은 더 이상 없다.
async function findOrCreateTrip(
  supabase: SupabaseClient<Database>,
  userId: string,
  tripDate: string,
  terminalName: string,
) {
  const { data: existing } = await supabase
    .from("bus_trips")
    .select("id")
    .eq("trip_date", tripDate)
    .eq("terminal_name", terminalName)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("bus_trips")
    .insert({ trip_date: tripDate, terminal_name: terminalName, created_by: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

// 배송을 지우면 label_photos·trip_reviews 행은 cascade로 같이 지워지지만, Storage의 실제 파일은
// 별도로 지워야 고아 파일로 남지 않는다.
export async function deleteDelivery(deliveryId: string) {
  const supabase = await createClient();

  const { data: photos } = await supabase
    .from("label_photos")
    .select("storage_path")
    .eq("bus_trip_id", deliveryId);

  if (photos && photos.length > 0) {
    await supabase.storage.from("label-photos").remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("bus_trips").delete().eq("id", deliveryId);
  if (error) throw new Error(error.message);

  revalidateAll();
}

// 촬영 탭에서 연속촬영 후 업로드하면, 사진마다 Claude 호출(1.5~4초)이 끝나야 업로드가
// "끝난 것"처럼 보이는 게 리드타임의 진짜 원인이었다. 이제 사진은 일단 전부 "미확인" 그룹에
// 즉시 커밋해서 확인 탭에 바로 보이게 하고, AI 분류는 응답을 보낸 뒤(after) 백그라운드에서
// 계속한다 — 터미널명을 알아내는 대로 그 사진만 실제 그룹으로 옮긴다(사람이 "다른 그룹으로
// 이동"을 하는 것과 같은 동작을 AI가 대신 해주는 셈). formData는
// { storagePaths: JSON string[], knownTerminals: JSON string[], image_0, image_1, ... } —
// 이미지 순서는 storagePaths와 같다.
export async function commitLabelPhotosAsync(tripDate: string, formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const storagePaths = JSON.parse(formData.get("storagePaths") as string) as string[];
  if (storagePaths.length === 0) return;
  const knownTerminals = JSON.parse(formData.get("knownTerminals") as string) as string[];

  const unrecognizedTripId = await findOrCreateTrip(supabase, userId, tripDate, UNRECOGNIZED);
  const { error: insertError } = await supabase.from("label_photos").insert(
    storagePaths.map((storagePath) => ({
      bus_trip_id: unrecognizedTripId,
      storage_path: storagePath,
      photo_type: "label" as const,
      taken_by: userId,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  const { data: insertedPhotos } = await supabase
    .from("label_photos")
    .select("id, storage_path")
    .eq("bus_trip_id", unrecognizedTripId)
    .in("storage_path", storagePaths);
  const photoIdByPath = new Map((insertedPhotos ?? []).map((p) => [p.storage_path, p.id]));

  revalidateAll();

  after(async () => {
    const bgSupabase = await createClient();
    const limit = createLimiter(4);

    // AI 호출(느림)은 동시에 여러 개 진행하되, 그룹 생성은 한 번에 하나씩만 한다 — 같은 배치에
    // 같은 터미널로 갈 사진이 여럿이면, find-or-create가 동시에 겹쳐서 같은 이름의 그룹이
    // 두 개 생길 수 있기 때문이다(여러 사람이 동시에 올릴 때의 경쟁과 같은 문제).
    const classified = await Promise.all(
      storagePaths.map((storagePath, i) =>
        limit(async () => {
          const image = formData.get(`image_${i}`);
          const photoId = photoIdByPath.get(storagePath);
          if (!(image instanceof Blob) || !photoId) return null;

          const visionFormData = new FormData();
          visionFormData.set("image", image, "photo.jpg");
          visionFormData.set("knownTerminals", JSON.stringify(knownTerminals));

          const terminalName = await suggestTerminalName(visionFormData);
          return terminalName ? { photoId, terminalName } : null; // 인식 못 하면 "미확인"에 남는다
        }),
      ),
    );

    for (const result of classified) {
      if (!result) continue;
      const targetTripId = await findOrCreateTrip(bgSupabase, userId, tripDate, result.terminalName);
      await bgSupabase.from("label_photos").update({ bus_trip_id: targetTripId }).eq("id", result.photoId);
    }

    revalidateAll();
  });
}

// 확인 탭 확대 화면에서 "다른 그룹으로 이동"을 고르면 호출된다. AI가 라벨 사진 한 장을
// 엉뚱한 터미널로 분류했을 때, 그룹 전체를 지우지 않고 그 사진만 옮길 수 있어야 한다.
export async function moveLabelPhoto(photoId: string, tripDate: string, targetTerminalName: string) {
  const terminalName = targetTerminalName.trim();
  if (!terminalName) throw new Error("터미널명을 입력해주세요.");

  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const deliveryId = await findOrCreateTrip(supabase, userId, tripDate, terminalName);

  const { error } = await supabase.from("label_photos").update({ bus_trip_id: deliveryId }).eq("id", photoId);
  if (error) throw new Error(error.message);

  revalidateAll();
}

// 그룹(배송)의 터미널명을 고친다. 같은 이름의 다른 그룹과 자동으로 합쳐지지는 않는다 — 정말
// 합치려면 사진을 개별적으로 이동한다(알려진 한계).
export async function renameGroup(deliveryId: string, newName: string) {
  const terminalName = newName.trim();
  if (!terminalName) throw new Error("터미널명을 입력해주세요.");

  const supabase = await createClient();
  const { error } = await supabase.from("bus_trips").update({ terminal_name: terminalName }).eq("id", deliveryId);
  if (error) throw new Error(error.message);

  revalidateAll();
}

// 라벨 사진과 같은 이유로 버스송장도 일단 "미확인" 그룹에 즉시 커밋하고, OCR(터미널명·
// 출발시간·박스 수량)은 응답을 보낸 뒤 백그라운드에서 계속한다. 배송당 송장 사진은 1장만
// 허용해서, 대상 그룹에 이미 있던 송장 사진은 실제 터미널명을 알아낸 뒤 교체한다.
export async function uploadBusInvoicesAsync(tripDate: string, formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const storagePaths = JSON.parse(formData.get("storagePaths") as string) as string[];
  if (storagePaths.length === 0) return;
  const knownTerminals = JSON.parse(formData.get("knownTerminals") as string) as string[];

  const unrecognizedTripId = await findOrCreateTrip(supabase, userId, tripDate, UNRECOGNIZED);
  const { error: insertError } = await supabase.from("label_photos").insert(
    storagePaths.map((storagePath) => ({
      bus_trip_id: unrecognizedTripId,
      storage_path: storagePath,
      photo_type: "invoice" as const,
      taken_by: userId,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  const { data: insertedPhotos } = await supabase
    .from("label_photos")
    .select("id, storage_path")
    .eq("bus_trip_id", unrecognizedTripId)
    .eq("photo_type", "invoice")
    .in("storage_path", storagePaths);
  const photoIdByPath = new Map((insertedPhotos ?? []).map((p) => [p.storage_path, p.id]));

  revalidateAll();

  after(async () => {
    const bgSupabase = await createClient();
    const limit = createLimiter(4);

    // AI 호출(느림)은 동시에 여러 개 진행하되, 그룹 생성·교체는 한 번에 하나씩만 한다 — 같은
    // 배치에 같은 터미널로 갈 송장이 여럿이면 find-or-create가 겹칠 수 있기 때문이다.
    const classified = await Promise.all(
      storagePaths.map((storagePath, i) =>
        limit(async () => {
          const image = formData.get(`image_${i}`);
          const photoId = photoIdByPath.get(storagePath);
          if (!(image instanceof Blob) || !photoId) return null;

          const visionFormData = new FormData();
          visionFormData.set("image", image, "photo.jpg");
          visionFormData.set("knownTerminals", JSON.stringify(knownTerminals));

          const suggested = await suggestBusInvoiceInfo(visionFormData);
          const terminalName = suggested.terminalName?.trim();
          return terminalName ? { photoId, terminalName, suggested } : null; // 인식 못 하면 "미확인"에 남는다
        }),
      ),
    );

    for (const result of classified) {
      if (!result) continue;
      const { photoId, terminalName, suggested } = result;
      const targetTripId = await findOrCreateTrip(bgSupabase, userId, tripDate, terminalName);

      await bgSupabase
        .from("bus_trips")
        .update({ departure_time: suggested.departureTime, invoice_box_count: suggested.boxCount })
        .eq("id", targetTripId);

      const { data: existing } = await bgSupabase
        .from("label_photos")
        .select("id, storage_path")
        .eq("bus_trip_id", targetTripId)
        .eq("photo_type", "invoice")
        .neq("id", photoId);
      if (existing && existing.length > 0) {
        await bgSupabase.storage.from("label-photos").remove(existing.map((p) => p.storage_path));
        await bgSupabase
          .from("label_photos")
          .delete()
          .in("id", existing.map((p) => p.id));
      }

      await bgSupabase.from("label_photos").update({ bus_trip_id: targetTripId }).eq("id", photoId);
    }

    revalidateAll();
  });
}

// 출발시간도 박스 수량과 동일하게 OCR 제안값을 사람이 확인/수정할 수 있어야 한다(손글씨 오독 위험).
export async function updateDepartureTime(deliveryId: string, value: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bus_trips")
    .update({ departure_time: value.trim() || null })
    .eq("id", deliveryId);
  if (error) throw new Error(error.message);

  revalidateAll();
}

// 사진확인 탭에서 체크박스로 고른 그룹들을 한 번에 확정한다 — 하나씩 왕복하지 않고 한 번의
// insert로 trip_reviews에 기록한다. 이 기록이 생기는 순간 그룹은 이력 탭으로 넘어간다
// (trip_review_status.latest_reviewed_at 기준으로 사진확인/이력을 나누기 때문).
export async function confirmGroups(deliveryIds: string[], note?: string) {
  if (deliveryIds.length === 0) return;

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const trimmedNote = note?.trim() || null;
  const { error } = await supabase.from("trip_reviews").insert(
    deliveryIds.map((deliveryId) => ({
      bus_trip_id: deliveryId,
      note: trimmedNote,
      reviewed_by: userId,
    })),
  );
  if (error) throw new Error(error.message);

  revalidateAll();
}
