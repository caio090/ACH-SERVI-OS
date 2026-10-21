import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentRow, ReviewRow } from "@/lib/database.types";
import { ReviewForm } from "./ReviewForm";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect=/pedidos/${params.id}/avaliar`);
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle<AppointmentRow>();

  if (!appointment || appointment.status !== "completed") {
    notFound();
  }

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("*")
    .eq("appointment_id", appointment.id)
    .maybeSingle<ReviewRow>();

  if (existingReview) {
    redirect(`/pedidos/${params.id}`);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Avaliar atendimento</h1>
        <p className="mt-1 text-sm text-neutral-600">Como foi o serviço? Sua avaliação ajuda outros clientes.</p>
      </div>
      <ReviewForm appointmentId={appointment.id} professionalId={appointment.professional_id} requestId={params.id} />
    </div>
  );
}
