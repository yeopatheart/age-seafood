import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/order-form";
import { OrderList } from "@/components/order-list";
import { DatePicker } from "@/components/date-picker";

function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const orderDate = date ?? todayKST();

  const supabase = await createClient();

  const [{ data: orders }, { data: pastOrders }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("order_date", orderDate)
      .order("terminal_name")
      .order("customer_name"),
    supabase.from("orders").select("terminal_name, customer_name").limit(500),
  ]);

  const terminalOptions = [...new Set((pastOrders ?? []).map((o) => o.terminal_name))].sort();
  const customerOptions = [...new Set((pastOrders ?? []).map((o) => o.customer_name))].sort();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">주문 리스트 — {orderDate}</h1>
        <DatePicker date={orderDate} />
      </div>

      <OrderForm date={orderDate} terminalOptions={terminalOptions} customerOptions={customerOptions} />

      <OrderList orders={orders ?? []} />
    </main>
  );
}
