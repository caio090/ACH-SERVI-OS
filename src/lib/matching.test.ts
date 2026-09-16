import { describe, expect, it } from "vitest";
import { matchProfessionals, type MatchCandidateInput, type MatchRequestInput } from "./matching";

const CATEGORY_ELETRICISTA = "cat-eletricista";
const CATEGORY_ENCANADOR = "cat-encanador";

function baseRequest(overrides: Partial<MatchRequestInput> = {}): MatchRequestInput {
  return {
    categoryId: CATEGORY_ELETRICISTA,
    neighborhood: "Centro",
    desiredDate: "2026-09-21", // segunda-feira
    timeWindowStart: "09:00",
    timeWindowEnd: "11:00",
    ...overrides,
  };
}

function baseCandidate(overrides: Partial<MatchCandidateInput> = {}): MatchCandidateInput {
  return {
    professionalId: "pro-1",
    categoryIds: [CATEGORY_ELETRICISTA],
    serviceAreas: ["Centro"],
    isActive: true,
    isSuspended: false,
    bio: "",
    averageRating: 0,
    reviewCount: 0,
    responseRate: 0,
    lastAvailabilityUpdate: "2026-09-01T00:00:00.000Z",
    availabilityRules: [],
    availabilityExceptions: [],
    ...overrides,
  };
}

describe("matchProfessionals — filtros obrigatórios", () => {
  it("exclui profissional de categoria diferente", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({ categoryIds: [CATEGORY_ENCANADOR] }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("exclui profissional que não atende a região do pedido", () => {
    const result = matchProfessionals(baseRequest({ neighborhood: "Zona Norte" }), [
      baseCandidate({ serviceAreas: ["Centro"] }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("compara região ignorando maiúsculas/acentos", () => {
    const result = matchProfessionals(baseRequest({ neighborhood: "vila são josé" }), [
      baseCandidate({ serviceAreas: ["Vila São José"] }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("exclui profissional pausado (is_active = false)", () => {
    const result = matchProfessionals(baseRequest(), [baseCandidate({ isActive: false })]);
    expect(result).toHaveLength(0);
  });

  it("exclui profissional suspenso mesmo se ativo", () => {
    const result = matchProfessionals(baseRequest(), [baseCandidate({ isSuspended: true })]);
    expect(result).toHaveLength(0);
  });

  it("exclui perfil incompleto (sem categoria ou sem região)", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({ serviceAreas: [] }),
      baseCandidate({ professionalId: "pro-2", categoryIds: [] }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("inclui candidato elegível que passa em todos os filtros", () => {
    const result = matchProfessionals(baseRequest(), [baseCandidate()]);
    expect(result).toHaveLength(1);
    expect(result[0].professionalId).toBe("pro-1");
  });
});

describe("matchProfessionals — disponibilidade", () => {
  it("não exclui por disponibilidade quando não há nenhuma regra cadastrada (dado insuficiente)", () => {
    const result = matchProfessionals(baseRequest(), [baseCandidate({ availabilityRules: [] })]);
    expect(result).toHaveLength(1);
    expect(result[0].hasAvailabilityData).toBe(false);
  });

  it("inclui quando a regra do dia da semana cobre a janela pedida", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({
        availabilityRules: [{ weekday: 1, start_time: "08:00", end_time: "12:00" }],
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].hasAvailabilityData).toBe(true);
    expect(result[0].isAvailableForSlot).toBe(true);
  });

  it("exclui quando há regras cadastradas mas nenhuma cobre o dia pedido", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({
        // só atende terça-feira (weekday 2); pedido é numa segunda (weekday 1)
        availabilityRules: [{ weekday: 2, start_time: "08:00", end_time: "12:00" }],
      }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("exclui quando a regra do dia não sobrepõe o horário pedido", () => {
    const result = matchProfessionals(baseRequest({ timeWindowStart: "14:00", timeWindowEnd: "16:00" }), [
      baseCandidate({
        availabilityRules: [{ weekday: 1, start_time: "08:00", end_time: "12:00" }],
      }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("bloqueio pontual (exceção) vence a regra padrão", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({
        availabilityRules: [{ weekday: 1, start_time: "08:00", end_time: "12:00" }],
        availabilityExceptions: [
          { exception_date: "2026-09-21", is_available: false, start_time: null, end_time: null },
        ],
      }),
    ]);
    expect(result).toHaveLength(0);
  });

  it("abertura extra (exceção) libera um dia fora da regra padrão", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({
        availabilityRules: [],
        availabilityExceptions: [
          { exception_date: "2026-09-21", is_available: true, start_time: "09:00", end_time: "10:00" },
        ],
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].isAvailableForSlot).toBe(true);
  });
});

describe("matchProfessionals — desempate (ordenação)", () => {
  it("ordena por taxa de resposta (maior primeiro)", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({ professionalId: "baixa-resposta", responseRate: 20 }),
      baseCandidate({ professionalId: "alta-resposta", responseRate: 90 }),
    ]);
    expect(result.map((r) => r.professionalId)).toEqual(["alta-resposta", "baixa-resposta"]);
  });

  it("em empate de taxa de resposta, usa agenda atualizada mais recente", () => {
    const result = matchProfessionals(baseRequest(), [
      baseCandidate({
        professionalId: "agenda-antiga",
        responseRate: 50,
        lastAvailabilityUpdate: "2026-01-01T00:00:00.000Z",
      }),
      baseCandidate({
        professionalId: "agenda-recente",
        responseRate: 50,
        lastAvailabilityUpdate: "2026-09-01T00:00:00.000Z",
      }),
    ]);
    expect(result.map((r) => r.professionalId)).toEqual(["agenda-recente", "agenda-antiga"]);
  });
});
