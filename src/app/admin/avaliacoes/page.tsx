import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, ReviewRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { DeleteReviewButton } from "./DeleteReviewButton";

type ReviewWithNames = ReviewRow & { client: Pick<ProfileRow, "full_name"> | null };

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, client:profiles!reviews_client_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ReviewWithNames[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Avaliações</h1>
      <div className="flex flex-col gap-2">
        {reviews?.map((review) => (
          <Card key={review.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{"⭐".repeat(review.rating)}</p>
              <p className="text-xs text-neutral-500">por {review.client?.full_name ?? "cliente"}</p>
              {review.comment && <p className="mt-1 text-sm text-neutral-700">{review.comment}</p>}
            </div>
            <DeleteReviewButton reviewId={review.id} />
          </Card>
        ))}
      </div>
    </div>
  );
}
