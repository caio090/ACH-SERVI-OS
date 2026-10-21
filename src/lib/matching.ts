/**
 * Matching do MVP — Fase 6 do plano mestre.
 *
 * Determinístico e simples, sem IA/ranking opaco. Critérios, em ordem de
 * prioridade (ver docs/ACHO_SERVICO_PLANO_MESTRE.md, "Regra central" e
 * "Fluxo do cliente"):
 *   1. categoria/especialidade compatível (filtro)
 *   2. região/bairro atendido (filtro)
 *   3. disponibilidade compatível com data/faixa de horário (filtro, quando há dados)
 *   4. conta ativa / não pausada (filtro)
 *   5. qualidade mínima do perfil completo (filtro)
 *   6. taxa de resposta / agenda atualizada recentemente (desempate)
 */

export interface AvailabilityRuleInput {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityExceptionInput {
  exception_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface MatchCandidateInput {
  professionalId: string;
  categoryIds: string[];
  serviceAreas: string[];
  isActive: boolean;
  isSuspended: boolean;
  bio: string;
  averageRating: number;
  reviewCount: number;
  responseRate: number;
  lastAvailabilityUpdate: string;
  availabilityRules: AvailabilityRuleInput[];
  availabilityExceptions: AvailabilityExceptionInput[];
}

export interface MatchRequestInput {
  categoryId: string;
  neighborhood: string;
  desiredDate: string; // YYYY-MM-DD
  timeWindowStart: string; // HH:mm[:ss]
  timeWindowEnd: string; // HH:mm[:ss]
}

export interface MatchResult {
  professionalId: string;
  hasAvailabilityData: boolean;
  isAvailableForSlot: boolean;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function getWeekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

function isProfileComplete(candidate: MatchCandidateInput): boolean {
  return candidate.categoryIds.length > 0 && candidate.serviceAreas.length > 0;
}

function matchesCategory(candidate: MatchCandidateInput, categoryId: string): boolean {
  return candidate.categoryIds.includes(categoryId);
}

function matchesRegion(candidate: MatchCandidateInput, neighborhood: string): boolean {
  const target = normalizeText(neighborhood);
  return candidate.serviceAreas.some((area) => normalizeText(area) === target);
}

/**
 * Retorna se o profissional tem disponibilidade compatível para a data/faixa
 * de horário pedida, e se havia dados suficientes para avaliar. Quando não
 * há nenhuma regra de agenda cadastrada, o profissional não é excluído por
 * disponibilidade (dado insuficiente não deve virar exclusão automática).
 */
function evaluateAvailability(
  candidate: MatchCandidateInput,
  request: MatchRequestInput,
): { hasData: boolean; isAvailable: boolean } {
  const exception = candidate.availabilityExceptions.find(
    (item) => item.exception_date === request.desiredDate,
  );

  if (exception) {
    if (!exception.is_available) {
      return { hasData: true, isAvailable: false };
    }
    if (exception.start_time && exception.end_time) {
      return {
        hasData: true,
        isAvailable: rangesOverlap(
          request.timeWindowStart,
          request.timeWindowEnd,
          exception.start_time,
          exception.end_time,
        ),
      };
    }
    return { hasData: true, isAvailable: true };
  }

  if (candidate.availabilityRules.length === 0) {
    return { hasData: false, isAvailable: true };
  }

  const weekday = getWeekday(request.desiredDate);
  const rulesForDay = candidate.availabilityRules.filter((rule) => rule.weekday === weekday);

  if (rulesForDay.length === 0) {
    return { hasData: true, isAvailable: false };
  }

  const isAvailable = rulesForDay.some((rule) =>
    rangesOverlap(request.timeWindowStart, request.timeWindowEnd, rule.start_time, rule.end_time),
  );

  return { hasData: true, isAvailable };
}

/**
 * Filtra e ordena os profissionais elegíveis para um pedido. A ordenação
 * (desempate) usa taxa de resposta e recência de atualização de agenda,
 * apenas entre os que já passaram por todos os filtros obrigatórios.
 */
export function matchProfessionals(
  request: MatchRequestInput,
  candidates: MatchCandidateInput[],
): MatchResult[] {
  const eligible = candidates
    .filter((c) => !c.isSuspended && c.isActive)
    .filter((c) => matchesCategory(c, request.categoryId))
    .filter((c) => matchesRegion(c, request.neighborhood))
    .filter((c) => isProfileComplete(c))
    .map((c) => {
      const availability = evaluateAvailability(c, request);
      return { candidate: c, availability };
    })
    .filter((entry) => !entry.availability.hasData || entry.availability.isAvailable);

  eligible.sort((a, b) => {
    if (b.candidate.responseRate !== a.candidate.responseRate) {
      return b.candidate.responseRate - a.candidate.responseRate;
    }
    return (
      new Date(b.candidate.lastAvailabilityUpdate).getTime() -
      new Date(a.candidate.lastAvailabilityUpdate).getTime()
    );
  });

  return eligible.map((entry) => ({
    professionalId: entry.candidate.professionalId,
    hasAvailabilityData: entry.availability.hasData,
    isAvailableForSlot: entry.availability.isAvailable,
  }));
}
