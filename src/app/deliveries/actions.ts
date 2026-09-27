"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type PhotoType = Database["public"]["Tables"]["label_photos"]["Row"]["photo_type"];

// getUser()는 매 호출마다 Auth 서버로 네트워크 왕복을 한다. getClaims()는 JWKS를 로컬(웹크립토)로
// 캐시해서 검증하므로 훨씬 빠르다 — 사진 업로드처럼 자주 호출되는 액션에서 체감 속도 차이가 크다.
async function requireUserId(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new Error("로그인이 필요합니다.");
  return userId;
}

// 배송(bus_trips 테이블)은 터미널명만으로 만든다. 버스 송장은 텍스트로 입력받지 않고
// 사진(photo_type='invoice')으로 남긴다.
export async function createDelivery(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const tripDate = String(formData.get("trip_date"));
  const terminalName = String(formData.get("terminal_name")).trim();

  if (!terminalName) {
    throw new Error("터미널을 입력해주세요.");
  }

  const { data, error } = await supabase
    .from("bus_trips")
    .insert({
      trip_date: tripDate,
      terminal_name: terminalName,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/deliveries");
  return data.id;
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

  revalidatePath("/deliveries");
  revalidatePath("/history");
}

// 여러 장을 한 번에 올릴 때 파일마다 서버 액션을 따로 호출하면 그때마다 페이지 전체가
// 다시 계산돼(서명 URL 재발급 포함) 느려진다. 한 번의 insert + 한 번의 revalidate로 처리한다.
export async function addPhotos(
  deliveryId: string,
  photos: { storagePath: string; photoType: PhotoType }[],
) {
  if (photos.length === 0) return;

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  // 버스 송장 사진은 배송당 1장만 허용한다 — 새로 찍으면 기존 것을 지우고 교체한다.
  if (photos.some((p) => p.photoType === "invoice")) {
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
  }

  const { error } = await supabase.from("label_photos").insert(
    photos.map((p) => ({
      bus_trip_id: deliveryId,
      storage_path: p.storagePath,
      photo_type: p.photoType,
      taken_by: userId,
    })),
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/deliveries/${deliveryId}`);
}

// 라벨 사진 일괄 업로드 화면에서 확정한 그룹들을 한 번에 커밋한다. 그룹마다 (날짜, 터미널명)으로
// 기존 배송을 찾아 재사용하거나 새로 만들고, 그 배송에 사진들을 batch insert한다.
export async function commitLabelPhotoGroups(
  tripDate: string,
  groups: { terminalName: string; storagePaths: string[] }[],
) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  for (const group of groups) {
    const terminalName = group.terminalName.trim();
    if (!terminalName || group.storagePaths.length === 0) continue;

    const { data: existing } = await supabase
      .from("bus_trips")
      .select("id")
      .eq("trip_date", tripDate)
      .eq("terminal_name", terminalName)
      .maybeSingle();

    let deliveryId = existing?.id;
    if (!deliveryId) {
      const { data: created, error: createError } = await supabase
        .from("bus_trips")
        .insert({ trip_date: tripDate, terminal_name: terminalName, created_by: userId })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      deliveryId = created.id;
    }

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

  revalidatePath("/deliveries");
  revalidatePath("/history");
}

export async function submitReview(deliveryId: string, formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const note = String(formData.get("note") ?? "").trim();

  const { error } = await supabase.from("trip_reviews").insert({
    bus_trip_id: deliveryId,
    note: note || null,
    reviewed_by: userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deliveries/${deliveryId}`);
  revalidatePath("/deliveries");
  revalidatePath("/history");
}
