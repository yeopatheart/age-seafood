import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderAssignmentList } from "@/components/order-assignment-list";
import { LabelCameraCapture } from "@/components/label-camera-capture";
import { LabelPhotoGallery } from "@/components/label-photo-gallery";
import { BusTripInvoiceForm } from "@/components/bus-trip-invoice-form";
import { ReconciliationChecklist } from "@/components/reconciliation-checklist";
import { MismatchBadge } from "@/components/mismatch-badge";
import { DeleteBusTripButton } from "@/components/delete-bus-trip-button";

export default async function BusTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase.from("bus_trips").select("*").eq("id", id).single();
  if (!trip) notFound();

  const [{ data: assignedOrders }, { data: unassignedOrders }, { data: photos }] = await Promise.all([
    supabase.from("orders").select("*").eq("bus_trip_id", id).order("customer_name"),
    supabase
      .from("orders")
      .select("*")
      .is("bus_trip_id", null)
      .eq("terminal_name", trip.terminal_name)
      .eq("order_date", trip.trip_date)
      .order("customer_name"),
    supabase.from("label_photos").select("*").eq("bus_trip_id", id).order("taken_at", { ascending: false }),
  ]);

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage.from("label-photos").createSignedUrl(photo.storage_path, 3600);
      return { id: photo.id, url: data?.signedUrl ?? "" };
    }),
  );

  const checkedBoxCount = (assignedOrders ?? [])
    .filter((o) => o.checked)
    .reduce((sum, o) => sum + o.box_count, 0);
  const isMismatch = trip.invoice_box_count === null ? null : checkedBoxCount !== trip.invoice_box_count;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {trip.terminal_name}
            {trip.bus_company && ` · ${trip.bus_company} (${trip.vehicle_number})`}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            {trip.trip_date}
            <MismatchBadge isMismatch={isMismatch} />
          </p>
        </div>
        <DeleteBusTripButton busTripId={id} redirectTo="/bus-trips" />
      </div>

      <OrderAssignmentList
        busTripId={id}
        assignedOrders={assignedOrders ?? []}
        unassignedOrders={unassignedOrders ?? []}
      />

      <section className="space-y-3">
        <h2 className="font-medium">라벨 사진</h2>
        <LabelCameraCapture busTripId={id} />
        <LabelPhotoGallery photos={photoUrls} />
      </section>

      <BusTripInvoiceForm trip={trip} />

      <ReconciliationChecklist orders={assignedOrders ?? []} invoiceBoxCount={trip.invoice_box_count} />
    </main>
  );
}
