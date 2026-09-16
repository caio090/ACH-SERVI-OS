import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, ServiceRequestRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SERVICE_REQUEST_STATUS_LABELS } from "@/lib/constants";

type RequestWithCategory = ServiceRequestRow & { categories: Pick<CategoryRow, "name" | "icon"> | null };

export default async function AdminRequestsPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("service_requests")
    .select("*, categories(name, icon)")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<RequestWithCategory[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Pedidos</h1>
      <div className="flex flex-col gap-2">
        {requests?.map((request) => (
          <Card key={request.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-neutral-900">
                {request.categories?.icon} {request.categories?.name}
              </p>
              <p className="text-xs text-neutral-500">
                {request.neighborhood}, {request.city} ·{" "}
                {new Date(request.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Badge tone="brand">{SERVICE_REQUEST_STATUS_LABELS[request.status]}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
