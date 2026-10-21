import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, ProfessionalProfileRow, ReviewRow } from "@/lib/database.types";
import { ProfessionalProfileForm } from "../ProfessionalProfileForm";
import { PauseToggle } from "./PauseToggle";
import { Card } from "@/components/ui/Card";

export default async function ProfessionalProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirect=/pro/perfil");
  }

  const { data: professional } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle<ProfessionalProfileRow>();

  if (!professional) {
    redirect("/pro/onboarding");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  const { data: myCategoryLinks } = await supabase
    .from("professional_categories")
    .select("category_id")
    .eq("professional_id", user!.id);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("professional_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<ReviewRow[]>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Meu perfil profissional</h1>
      </div>

      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium text-neutral-900">Receber novos pedidos</p>
          <p className="text-xs text-neutral-500">Pause quando não quiser receber novos pedidos.</p>
        </div>
        <PauseToggle isActive={professional.is_active} />
      </Card>

      <ProfessionalProfileForm
        categories={categories ?? []}
        defaultBio={professional.bio}
        defaultServiceAreas={professional.service_areas.join(", ")}
        defaultRadius={professional.service_radius_km}
        defaultCategoryIds={(myCategoryLinks ?? []).map((c) => c.category_id)}
      />

      <div>
        <h2 className="mb-2 text-lg font-bold text-neutral-900">
          Avaliações ({professional.review_count}) · ⭐ {professional.average_rating.toFixed(1)}
        </h2>
        {reviews && reviews.length === 0 && <p className="text-sm text-neutral-500">Ainda sem avaliações.</p>}
        <div className="flex flex-col gap-2">
          {reviews?.map((review) => (
            <Card key={review.id}>
              <p className="text-sm font-semibold">{"⭐".repeat(review.rating)}</p>
              {review.comment && <p className="text-sm text-neutral-600">{review.comment}</p>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
