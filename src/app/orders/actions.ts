"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const orderDate = String(formData.get("order_date"));
  const terminalName = String(formData.get("terminal_name")).trim();
  const customerName = String(formData.get("customer_name")).trim();
  const boxCount = Number(formData.get("box_count"));

  if (!terminalName || !customerName || !boxCount || boxCount <= 0) {
    throw new Error("터미널, 고객사명, 박스 수량을 확인해주세요.");
  }

  const { error } = await supabase.from("orders").insert({
    order_date: orderDate,
    terminal_name: terminalName,
    customer_name: customerName,
    box_count: boxCount,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/orders");
}

export async function updateOrder(orderId: string, updates: { box_count: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/orders");
}

export async function deleteOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/orders");
}
