import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SuspendButton } from "./SuspendButton";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-neutral-900">Usuários</h1>
      <div className="flex flex-col gap-2">
        {users?.map((profile) => (
          <Card key={profile.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-neutral-900">
                {profile.full_name || "(sem nome)"}{" "}
                {profile.role === "admin" && <Badge tone="brand">admin</Badge>}
              </p>
              <p className="text-xs text-neutral-500">{profile.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {profile.is_suspended ? <Badge tone="danger">Suspenso</Badge> : <Badge tone="success">Ativo</Badge>}
              <SuspendButton userId={profile.id} isSuspended={profile.is_suspended} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
