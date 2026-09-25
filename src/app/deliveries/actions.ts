"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type PhotoType = Database["public"]["Tables"]["label_photos"]["Row"]["photo_type"];

// 배송(bus_trips 테이블)은 터미널명만으로 만든다. 버스 송장은 텍스트로 입력받지 않고
// 사진(photo_type='invoice')으로 남긴다.
export async function createDelivery(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

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
      created_by: user.id,
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

export async function addPhoto(deliveryId: string, storagePath: string, photoType: PhotoType) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 버스 송장 사진은 배송당 1장만 허용한다 — 새로 찍으면 기존 것을 지우고 교체한다.
  if (photoType === "invoice") {
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

  const { error } = await supabase.from("label_photos").insert({
    bus_trip_id: deliveryId,
    storage_path: storagePath,
    photo_type: photoType,
    taken_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deliveries/${deliveryId}`);
}

export async function submitReview(deliveryId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const note = String(formData.get("note") ?? "").trim();

  const { error } = await supabase.from("trip_reviews").insert({
    bus_trip_id: deliveryId,
    note: note || null,
    reviewed_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deliveries/${deliveryId}`);
  revalidatePath("/deliveries");
  revalidatePath("/history");
}
