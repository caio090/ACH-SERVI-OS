import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentRow, AvailabilityExceptionRow, AvailabilityRuleRow, ServiceRequestRow } from "@/lib/database.types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { APPOINTMENT_STATUS_LABELS, WEEKDAY_LABELS } from "@/lib/constants";
import { AddAvailabilityRuleForm } from "./AddAvailabilityRuleForm";
import { AddAvailabilityExceptionForm } from "./AddAvailabilityExceptionForm";
import { DeleteRuleButton, DeleteExceptionButton } from "./DeleteButtons";
import { AppointmentActions } from "./AppointmentActions";

type AppointmentWithRequest = AppointmentRow & { service_requests: ServiceRequestRow | null };

export default async function ProfessionalAgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?redirect=/pro/agenda");
  }

  const { data: professional } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  if (!professional) {
    redirect("/pro/onboarding");
  }

  const [{ data: rules }, { data: exceptions }, { data: appointments }] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("*")
      .eq("professional_id", user!.id)
      .order("weekday")
      .returns<AvailabilityRuleRow[]>(),
    supabase
      .from("availability_exceptions")
      .select("*")
      .eq("professional_id", user!.id)
      .order("exception_date")
      .returns<AvailabilityExceptionRow[]>(),
    supabase
      .from("appointments")
      .select("*, service_requests(*)")
      .eq("professional_id", user!.id)
      .in("status", ["scheduled", "in_service"])
      .order("scheduled_date")
      .returns<AppointmentWithRequest[]>(),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 py-4">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Próximos atendimentos</h1>
        {(!appointments || appointments.length === 0) && (
          <EmptyState icon="🗓️" title="Nenhum atendimento agendado ainda" />
        )}
        {appointments?.map((appointment) => (
          <Card key={appointment.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-neutral-900">
                {new Date(`${appointment.scheduled_date}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                {appointment.time_window_start.slice(0, 5)}
              </p>
              <Badge tone={appointment.status === "in_service" ? "warning" : "success"}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </Badge>
            </div>
            <p className="text-sm text-neutral-600">{appointment.service_requests?.description}</p>
            <p className="text-xs text-neutral-500">📍 {appointment.service_address}</p>
            <AppointmentActions
              appointmentId={appointment.id}
              requestId={appointment.request_id}
              status={appointment.status}
            />
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-900">Agenda padrão</h2>
        <div className="flex flex-col gap-2">
          {rules && rules.length === 0 && <p className="text-sm text-neutral-500">Nenhum horário cadastrado.</p>}
          {rules?.map((rule) => (
            <Card key={rule.id} className="flex items-center justify-between">
              <span className="text-sm text-neutral-800">
                {WEEKDAY_LABELS[rule.weekday]}: {rule.start_time.slice(0, 5)}–{rule.end_time.slice(0, 5)}
              </span>
              <DeleteRuleButton id={rule.id} />
            </Card>
          ))}
        </div>
        <AddAvailabilityRuleForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-900">Exceções (folgas/aberturas extras)</h2>
        <div className="flex flex-col gap-2">
          {exceptions && exceptions.length === 0 && <p className="text-sm text-neutral-500">Nenhuma exceção cadastrada.</p>}
          {exceptions?.map((exception) => (
            <Card key={exception.id} className="flex items-center justify-between">
              <span className="text-sm text-neutral-800">
                {new Date(`${exception.exception_date}T00:00:00`).toLocaleDateString("pt-BR")} —{" "}
                {exception.is_available ? "Abertura extra" : "Bloqueio"}
                {exception.reason ? ` (${exception.reason})` : ""}
              </span>
              <DeleteExceptionButton id={exception.id} />
            </Card>
          ))}
        </div>
        <AddAvailabilityExceptionForm />
      </section>
    </div>
  );
}
