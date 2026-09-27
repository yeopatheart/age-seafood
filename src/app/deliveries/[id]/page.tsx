import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PhotoCaptureButton } from "@/components/photo-capture-button";
import { PhotoGallery } from "@/components/photo-gallery";
import { InvoiceSection } from "@/components/invoice-section";
import { DeleteDeliveryButton } from "@/components/delete-delivery-button";
import { ReviewForm } from "@/components/review-form";
import { ReviewStatusBadge } from "@/components/review-status-badge";

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: delivery } = await supabase.from("bus_trips").select("*").eq("id", id).single();
  if (!delivery) notFound();

  const [{ data: photos }, { data: reviews }] = await Promise.all([
    supabase.from("label_photos").select("*").eq("bus_trip_id", id).order("taken_at", { ascending: false }),
    supabase.from("trip_reviews").select("*").eq("bus_trip_id", id).order("reviewed_at", { ascending: false }),
  ]);

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewed_by).filter((v): v is string => !!v))];
  const { data: reviewers } =
    reviewerIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", reviewerIds)
      : { data: [] };
  const reviewerNames = new Map((reviewers ?? []).map((r) => [r.id, r.display_name]));

  // 사진마다 서명 URL을 따로 요청하면 사진이 많아질수록 느려진다 — 한 번에 배치로 발급받는다.
  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signedUrls } =
    paths.length > 0 ? await supabase.storage.from("label-photos").createSignedUrls(paths, 3600) : { data: [] };
  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl ?? ""]));

  const toGalleryItems = (type: "label" | "invoice") =>
    (photos ?? [])
      .filter((p) => p.photo_type === type)
      .map((p) => ({ id: p.id, url: urlByPath.get(p.storage_path) ?? "" }));

  const labelPhotos = toGalleryItems("label");
  const invoicePhotos = toGalleryItems("invoice");
  const isReviewed = !!reviews && reviews.length > 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-zinc-900 p-5 text-white shadow-md">
        <div>
          <h1 className="text-2xl font-bold">{delivery.terminal_name}</h1>
          <p className="text-lg text-zinc-300">{delivery.trip_date}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReviewStatusBadge reviewed={isReviewed} />
          <DeleteDeliveryButton deliveryId={id} redirectTo="/deliveries" />
        </div>
      </div>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">택배박스 라벨 사진 ({labelPhotos.length}장)</h2>
        <PhotoCaptureButton deliveryId={id} photoType="label" label="라벨 사진 선택/촬영 (여러 장)" multiple />
        <PhotoGallery photos={labelPhotos} alt="박스 라벨 사진" emptyText="아직 라벨 사진이 없습니다." />
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">버스 송장 사진 ({invoicePhotos.length}장, 최대 1장)</h2>
        <InvoiceSection
          deliveryId={id}
          photos={invoicePhotos}
          confirmedCount={delivery.invoice_box_count}
          labelPhotoCount={labelPhotos.length}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">검수</h2>
        <ReviewForm deliveryId={id} />
      </section>

      {reviews && reviews.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">검수 이력</h2>
          <ul className="space-y-2">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-3xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <ReviewStatusBadge reviewed />
                  <span className="text-base text-zinc-700">
                    {review.reviewed_by ? (reviewerNames.get(review.reviewed_by) ?? "알 수 없음") : "알 수 없음"} ·{" "}
                    {new Date(review.reviewed_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                {review.note && <p className="mt-2 text-lg">{review.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
