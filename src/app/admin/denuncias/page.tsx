import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, ReportRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportActions } from "./ReportActions";

type ReportWithReporter = ReportRow & { reporter: Pick<ProfileRow, "full_name"> | null };

const statusTone = { open: "warning", reviewed: "neutral", dismissed: "neutral", actioned: "success" } as const;
const statusLabel = { open: "Aberta", reviewed: "Revisada", dismissed: "Arquivada", actioned: "Ação tomada" } as const;

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .returns<ReportWithReporter[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Denúncias</h1>

      {reports && reports.length === 0 && <EmptyState icon="🚩" title="Nenhuma denúncia registrada" />}

      <div className="flex flex-col gap-2">
        {reports?.map((report) => (
          <Card key={report.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900">
                {report.target_type} · {report.reporter?.full_name ?? "usuário"}
              </p>
              <Badge tone={statusTone[report.status]}>{statusLabel[report.status]}</Badge>
            </div>
            <p className="text-sm text-neutral-700">{report.reason}</p>
            {report.status === "open" && <ReportActions reportId={report.id} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
