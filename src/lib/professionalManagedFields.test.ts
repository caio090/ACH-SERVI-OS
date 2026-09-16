import { describe, expect, it } from "vitest";
import { sanitizeProfessionalManagedFieldUpdate, type ManagedProfessionalFields } from "./professionalManagedFields";

const OLD: ManagedProfessionalFields = {
  is_verified: false,
  average_rating: 4.2,
  review_count: 10,
  response_rate: 80,
};

const FORGED: ManagedProfessionalFields = {
  is_verified: true,
  average_rating: 5,
  review_count: 999,
  response_rate: 100,
};

describe("sanitizeProfessionalManagedFieldUpdate", () => {
  it("bloqueia o próprio profissional de se auto-verificar ou forjar métricas", () => {
    const result = sanitizeProfessionalManagedFieldUpdate({
      old: OLD,
      attempted: FORGED,
      isAdmin: false,
      triggerDepth: 1,
    });
    expect(result).toEqual(OLD);
  });

  it("permite admin alterar qualquer campo gerenciado", () => {
    const result = sanitizeProfessionalManagedFieldUpdate({
      old: OLD,
      attempted: FORGED,
      isAdmin: true,
      triggerDepth: 1,
    });
    expect(result).toEqual(FORGED);
  });

  it("permite trigger interno aninhado recalcular métricas, mas não is_verified", () => {
    const result = sanitizeProfessionalManagedFieldUpdate({
      old: OLD,
      attempted: { ...FORGED, average_rating: 4.8, review_count: 11, response_rate: 82 },
      isAdmin: false,
      triggerDepth: 2,
    });
    expect(result).toEqual({
      is_verified: false,
      average_rating: 4.8,
      review_count: 11,
      response_rate: 82,
    });
  });
});
