"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 버스 편은 터미널명만으로 먼저 만든다. 버스 송장(회사/차량번호/수량)은 버스 출발 직전
// 종이 송장을 받은 뒤에 updateBusTripInvoice로 채워 넣는다.
export async function createBusTrip(formData: FormData) {
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

  revalidatePath("/bus-trips");
  return data.id;
}

export async function updateBusTripInvoice(busTripId: string, formData: FormData) {
  const supabase = await createClient();

  const busCompany = String(formData.get("bus_company")).trim();
  const vehicleNumber = String(formData.get("vehicle_number")).trim();
  const invoiceBoxCount = Number(formData.get("invoice_box_count"));

  if (!busCompany || !vehicleNumber || !invoiceBoxCount) {
    throw new Error("버스회사, 차량번호, 송장 수량을 확인해주세요.");
  }

  const { error } = await supabase
    .from("bus_trips")
    .update({
      bus_company: busCompany,
      vehicle_number: vehicleNumber,
      invoice_box_count: invoiceBoxCount,
    })
    .eq("id", busTripId);
  if (error) throw new Error(error.message);

  revalidatePath(`/bus-trips/${busTripId}`);
  revalidatePath("/bus-trips");
}

export async function assignOrderToTrip(orderId: string, busTripId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ bus_trip_id: busTripId }).eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/bus-trips");
}

export async function toggleOrderChecked(orderId: string, checked: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ checked }).eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/bus-trips");
}

export async function addLabelPhoto(busTripId: string, storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("label_photos").insert({
    bus_trip_id: busTripId,
    storage_path: storagePath,
    taken_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/bus-trips/${busTripId}`);
}
