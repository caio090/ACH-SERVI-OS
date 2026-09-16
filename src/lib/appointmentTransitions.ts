import type { AppointmentStatus } from "@/lib/database.types";

// Espelha a regra aplicada pelo trigger de banco
// `validate_appointment_status_actor` (supabase/migrations/0014_appointment_status_hardening.sql).
// Mantida em sync com o trigger para falhar rápido no app antes do round-trip ao banco.
const PROFESSIONAL_ALLOWED_TRANSITIONS: Partial<Record<AppointmentStatus, readonly AppointmentStatus[]>> = {
  scheduled: ["in_service", "cancelled", "no_show"],
  in_service: ["completed", "cancelled"],
};

export function isValidProfessionalAppointmentTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return PROFESSIONAL_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidClientAppointmentTransition(_from: AppointmentStatus, to: AppointmentStatus): boolean {
  return to === "cancelled";
}
