import { createClient } from "@/lib/supabase/server";
import type { AdminActionLogRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeAdminAction, summarizeAuditMetadata } from "@/lib/auditLog";

const PAGE_SIZE = 100;

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("admin_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)
    .returns<AdminActionLogRow[]>();

  const adminIds = Array.from(new Set((logs ?? []).map((log) => log.admin_id)));
  const { data: admins } =
    adminIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", adminIds)
      : { data: [] as { id: string; full_name: string; email: string | null }[] };
  const adminNames = new Map((admins ?? []).map((admin) => [admin.id, admin.full_name || admin.email || admin.id]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Auditoria</h1>
        <p className="text-sm text-neutral-600">
          Últimas {PAGE_SIZE} ações administrativas. Registro gravado pelo banco, somente leitura.
        </p>
      </div>

      {(!logs || logs.length === 0) && <EmptyState icon="🗂️" title="Nenhuma ação administrativa registrada ainda" />}

      <div className="flex flex-col gap-2">
        {logs?.map((log) => (
          <Card key={log.id} className="flex flex-col gap-1 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-neutral-900">{describeAdminAction(log.action)}</span>
              <time className="text-xs text-neutral-500" dateTime={log.created_at}>
                {new Date(log.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </time>
            </div>
            <p className="text-xs text-neutral-600">
              Por {adminNames.get(log.admin_id) ?? log.admin_id} · {log.target_type}
              {log.target_id ? ` ${log.target_id.slice(0, 8)}…` : ""}
            </p>
            {summarizeAuditMetadata(log.metadata) && (
              <p className="text-xs text-neutral-500">{summarizeAuditMetadata(log.metadata)}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
