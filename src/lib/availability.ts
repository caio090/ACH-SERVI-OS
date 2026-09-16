import type { AvailabilityExceptionRow, AvailabilityRuleRow } from "@/lib/database.types";

const LOOKAHEAD_DAYS = 14;

/**
 * Aproximação simples do "próximo horário" do profissional, usada no perfil
 * público (Fase 4). Percorre os próximos dias e retorna a primeira janela
 * livre segundo a agenda padrão, respeitando bloqueios de exceção.
 */
export function getNextAvailableSlot(
  rules: Pick<AvailabilityRuleRow, "weekday" | "start_time">[],
  exceptions: Pick<AvailabilityExceptionRow, "exception_date" | "is_available">[],
  from: Date = new Date(),
): { date: string; startTime: string } | null {
  if (rules.length === 0) return null;

  const blockedDates = new Set(
    exceptions.filter((exception) => !exception.is_available).map((exception) => exception.exception_date),
  );

  for (let offset = 0; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const date = new Date(from);
    date.setUTCDate(date.getUTCDate() + offset);
    const isoDate = date.toISOString().slice(0, 10);

    if (blockedDates.has(isoDate)) continue;

    const weekday = date.getUTCDay();
    const rule = rules.find((r) => r.weekday === weekday);
    if (rule) {
      return { date: isoDate, startTime: rule.start_time.slice(0, 5) };
    }
  }

  return null;
}
