import { createClient } from "@/lib/supabase/server";
import type { ProfessionalProfileRow, ProfileRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VerifyButton } from "./VerifyButton";

type ProfessionalWithProfile = ProfessionalProfileRow & { profiles: Pick<ProfileRow, "full_name" | "email"> | null };

export default async function AdminProfessionalsPage() {
  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professional_profiles")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .returns<ProfessionalWithProfile[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Profissionais</h1>
      <div className="flex flex-col gap-2">
        {professionals?.map((professional) => (
          <Card key={professional.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-neutral-900">{professional.profiles?.full_name}</p>
              <p className="text-xs text-neutral-500">
                {professional.profiles?.email} · ⭐ {professional.average_rating.toFixed(1)} ({professional.review_count})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!professional.is_active && <Badge tone="warning">Pausado</Badge>}
              {professional.is_verified && <Badge tone="success">Verificado</Badge>}
              <VerifyButton professionalId={professional.id} isVerified={professional.is_verified} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
