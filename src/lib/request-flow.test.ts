import { describe, expect, it } from "vitest";
import {
  buildServiceRequestPayload,
  createEmptyRequestDraft,
  getNextRequestStep,
  getPreviousRequestStep,
  getRequestLoginUrl,
  parseStoredRequestDraft,
  requestPayloadToFormData,
  validateRequestStep,
  type RequestDraft,
} from "@/lib/request-flow";

function completeDraft(): RequestDraft {
  return {
    ...createEmptyRequestDraft(),
    categoryId: "3fbc75c2-5b14-4d6d-9122-70109b08b7ce",
    categorySlug: "eletricista",
    categoryName: "Eletricista",
    categoryIcon: "⚡",
    description: "A tomada da cozinha parou de funcionar ontem.",
    urgency: "now",
    neighborhood: "Centro",
    city: "São Paulo",
    dateChoice: "today",
    timeSlot: "morning",
  };
}

describe("client request flow", () => {
  it("moves between wizard steps without leaving the valid range", () => {
    expect(getNextRequestStep(1)).toBe(2);
    expect(getNextRequestStep(5)).toBe(5);
    expect(getPreviousRequestStep(5)).toBe(4);
    expect(getPreviousRequestStep(1)).toBe(1);
  });

  it("requires one valid decision in each step", () => {
    const draft = createEmptyRequestDraft();
    expect(validateRequestStep(draft, 1)).toContain("categoria");

    draft.categoryId = "category-id";
    expect(validateRequestStep(draft, 1)).toBeNull();
    expect(validateRequestStep(draft, 2)).toContain("15 caracteres");
  });

  it("restores a versioned draft from session storage data", () => {
    const draft = completeDraft();
    expect(parseStoredRequestDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parseStoredRequestDraft("not-json")).toBeNull();
  });

  it("builds a payload using only real service_requests columns", () => {
    expect(buildServiceRequestPayload(completeDraft(), "2026-10-19")).toEqual({
      category_id: "3fbc75c2-5b14-4d6d-9122-70109b08b7ce",
      description: "A tomada da cozinha parou de funcionar ontem.",
      neighborhood: "Centro",
      city: "São Paulo",
      desired_date: "2026-10-19",
      time_window_start: "08:00",
      time_window_end: "12:00",
      is_urgent: true,
    });
  });

  it("maps tomorrow and period values without inventing address fields", () => {
    const payload = buildServiceRequestPayload(
      { ...completeDraft(), urgency: "week", dateChoice: "tomorrow", timeSlot: "night" },
      "2026-10-19",
    );

    expect(payload.desired_date).toBe("2026-10-20");
    expect(payload.time_window_start).toBe("18:00");
    expect(payload.time_window_end).toBe("22:00");
    expect(payload.is_urgent).toBe(false);
    expect(payload).not.toHaveProperty("street");
    expect(payload).not.toHaveProperty("postal_code");
  });

  it("rejects a custom date in the past", () => {
    const draft = { ...completeDraft(), dateChoice: "custom" as const, customDate: "2026-10-18" };
    expect(() => buildServiceRequestPayload(draft, "2026-10-19")).toThrow("passado");
  });

  it("creates the server action FormData without losing booleans", () => {
    const formData = requestPayloadToFormData(
      buildServiceRequestPayload(completeDraft(), "2026-10-19"),
    );
    expect(formData.get("category_id")).toBe("3fbc75c2-5b14-4d6d-9122-70109b08b7ce");
    expect(formData.get("is_urgent")).toBe("on");
  });

  it("returns to the preserved flow after authentication", () => {
    expect(getRequestLoginUrl()).toBe("/entrar?redirect=%2Fpedir%3Fretomar%3D1");
  });
});
