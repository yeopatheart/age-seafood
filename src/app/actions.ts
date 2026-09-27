"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

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

// 촬영 탭에서 연속촬영 후 업로드하면 사진들이 이름별로 묶여 이 액션으로 한 번에 커밋된다.
// 그룹마다 (날짜, 터미널명)으로 배송을 find-or-create하고, 그 배송에 사진들을 batch insert한다.
export async function commitLabelPhotoGroups(
  tripDate: string,
  groups: { terminalName: string; storagePaths: string[] }[],
) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  for (const group of groups) {
    const terminalName = group.terminalName.trim();
    if (!terminalName || group.storagePaths.length === 0) continue;

    const deliveryId = await findOrCreateTrip(supabase, userId, tripDate, terminalName);

    const { error: insertError } = await supabase.from("label_photos").insert(
      group.storagePaths.map((storagePath) => ({
        bus_trip_id: deliveryId,
        storage_path: storagePath,
        photo_type: "label" as const,
        taken_by: userId,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  revalidateAll();
}

// 사진확인 탭에서 잘못 분류된 라벨 사진 한 장을 다른 터미널 그룹으로 옮긴다. 대상 그룹이
// 없으면(예: "새 그룹으로 분리") find-or-create로 새로 만든다.
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

// 버스 송장 사진을 올리면 OCR이 읽은 터미널명으로 그룹을 find-or-create해서 자동으로 붙인다.
// 터미널명을 못 읽었으면 "" 그룹(=미확인)으로 모인다 — 사람이 확인 탭에서 옮기거나 이름을
// 채워주면 된다. 배송당 송장 사진은 1장만 허용해서 새로 오면 기존 것을 지우고 교체한다.
export async function uploadBusInvoice(
  tripDate: string,
  storagePath: string,
  suggested: { terminalName: string | null; departureTime: string | null; boxCount: number | null },
) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const deliveryId = await findOrCreateTrip(supabase, userId, tripDate, suggested.terminalName?.trim() || "미확인");

  const { error: updateError } = await supabase
    .from("bus_trips")
    .update({
      departure_time: suggested.departureTime,
      invoice_box_count: suggested.boxCount,
    })
    .eq("id", deliveryId);
  if (updateError) throw new Error(updateError.message);

  const { data: existing } = await supabase
    .from("label_photos")
    .select("id, storage_path")
    .eq("bus_trip_id", deliveryId)
    .eq("photo_type", "invoice");

  if (existing && existing.length > 0) {
    await supabase.storage.from("label-photos").remove(existing.map((p) => p.storage_path));
    await supabase
      .from("label_photos")
      .delete()
      .in("id", existing.map((p) => p.id));
  }

  const { error: insertError } = await supabase.from("label_photos").insert({
    bus_trip_id: deliveryId,
    storage_path: storagePath,
    photo_type: "invoice",
    taken_by: userId,
  });
  if (insertError) throw new Error(insertError.message);

  revalidateAll();
}

// 버스 송장의 박스 수량은 OCR 제안값을 사람이 확인/수정한 뒤 이 액션으로 저장한다.
export async function confirmInvoiceBoxCount(deliveryId: string, count: number) {
  const supabase = await createClient();

  const { error } = await supabase.from("bus_trips").update({ invoice_box_count: count }).eq("id", deliveryId);
  if (error) throw new Error(error.message);

  revalidateAll();
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
