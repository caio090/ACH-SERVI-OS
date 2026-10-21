import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  AvailabilityExceptionRow,
  AvailabilityRuleRow,
  CategoryRow,
  PortfolioItemRow,
  PublicProfessionalProfileRow,
  ReviewRow,
} from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getNextAvailableSlot } from "@/lib/availability";
import { WEEKDAY_SHORT_LABELS } from "@/lib/constants";
import { ReportButton } from "@/components/ReportButton";

export default async function ProfessionalProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: professional } = await supabase
    .from("public_professional_profiles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<PublicProfessionalProfileRow>();

  if (!professional) {
    notFound();
  }

  const [{ data: categoryLinks }, { data: portfolio }, { data: reviews }, { data: rules }, { data: exceptions }] =
    await Promise.all([
      supabase.from("professional_categories").select("categories(*)").eq("professional_id", params.id),
      supabase
        .from("portfolio_items")
        .select("*")
        .eq("professional_id", params.id)
        .order("sort_order")
        .returns<PortfolioItemRow[]>(),
      supabase
        .from("reviews")
        .select("*")
        .eq("professional_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<ReviewRow[]>(),
      supabase.from("availability_rules").select("*").eq("professional_id", params.id).returns<AvailabilityRuleRow[]>(),
      supabase
        .from("availability_exceptions")
        .select("*")
        .eq("professional_id", params.id)
        .returns<AvailabilityExceptionRow[]>(),
    ]);

  const categories = (categoryLinks ?? [])
    .map((link) => link.categories as unknown as CategoryRow | null)
    .filter((c): c is CategoryRow => Boolean(c));

  const nextSlot = getNextAvailableSlot(rules ?? [], exceptions ?? []);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600">
          {professional.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">{professional.full_name}</h1>
            {professional.is_verified && <span title="Verificado">✅</span>}
          </div>
          <p className="text-sm text-neutral-500">
            {professional.city}
            {professional.neighborhood ? ` · ${professional.neighborhood}` : ""}
          </p>
          <p className="text-sm text-neutral-700">
            ⭐ {professional.average_rating.toFixed(1)} · {professional.review_count} avaliações
          </p>
        </div>
      </div>

      {professional.bio && <p className="text-sm text-neutral-700">{professional.bio}</p>}

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge key={category.id} tone="brand">
            <CategoryIcon category={category} className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            {category.name}
          </Badge>
        ))}
      </div>

      {professional.service_areas.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-neutral-900">Atende em</p>
          <p className="text-sm text-neutral-600">{professional.service_areas.join(", ")}</p>
        </Card>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Próximo horário</p>
          <p className="text-sm text-neutral-600">
            {nextSlot
              ? `${new Date(`${nextSlot.date}T00:00:00`).toLocaleDateString("pt-BR")} às ${nextSlot.startTime}`
              : "Agenda não informada"}
          </p>
        </div>
        <Link href="/pedidos/novo">
          <Button size="sm">Pedir serviço</Button>
        </Link>
      </Card>

      {rules && rules.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-semibold text-neutral-900">Horário padrão</p>
          <ul className="flex flex-col gap-1 text-sm text-neutral-600">
            {rules
              .sort((a, b) => a.weekday - b.weekday)
              .map((rule) => (
                <li key={rule.id}>
                  {WEEKDAY_SHORT_LABELS[rule.weekday]}: {rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}
                </li>
              ))}
          </ul>
        </Card>
      )}

      {portfolio && portfolio.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-bold text-neutral-900">Portfólio</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {portfolio.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border border-neutral-200">
                {supabaseUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/portfolio/${item.photo_path}`}
                    alt={item.title || "Foto do portfólio"}
                    className="aspect-square w-full object-cover"
                  />
                )}
                {item.title && <p className="p-2 text-xs font-medium text-neutral-700">{item.title}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-bold text-neutral-900">Avaliações</h2>
        {reviews && reviews.length === 0 && <p className="text-sm text-neutral-500">Ainda sem avaliações.</p>}
        <div className="flex flex-col gap-2">
          {reviews?.map((review) => (
            <Card key={review.id}>
              <p className="text-sm font-semibold text-neutral-900">{"⭐".repeat(review.rating)}</p>
              {review.comment && <p className="text-sm text-neutral-600">{review.comment}</p>}
            </Card>
          ))}
        </div>
      </div>

      <ReportButton targetType="user" targetId={professional.id} />
    </div>
  );
}
