// Espelha a lógica do trigger `prevent_professional_managed_field_escalation`
// (supabase/migrations/0012_professional_profile_managed_fields_hardening.sql,
// ajustada em 0013_professional_metric_trigger_compatibility.sql): campos
// calculados do perfil profissional só podem ser alterados por admin ou por
// um trigger interno aninhado (pg_trigger_depth() > 1, ex.: recálculo de
// rating após review).

export type ManagedProfessionalFields = {
  is_verified: boolean;
  average_rating: number;
  review_count: number;
  response_rate: number;
};

export function sanitizeProfessionalManagedFieldUpdate(params: {
  old: ManagedProfessionalFields;
  attempted: ManagedProfessionalFields;
  isAdmin: boolean;
  triggerDepth: number;
}): ManagedProfessionalFields {
  const { old, attempted, isAdmin, triggerDepth } = params;

  if (isAdmin) {
    return attempted;
  }

  const isNestedTrigger = triggerDepth > 1;

  return {
    is_verified: old.is_verified,
    average_rating: isNestedTrigger ? attempted.average_rating : old.average_rating,
    review_count: isNestedTrigger ? attempted.review_count : old.review_count,
    response_rate: isNestedTrigger ? attempted.response_rate : old.response_rate,
  };
}
