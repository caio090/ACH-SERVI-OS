import { describe, expect, it } from "vitest";
import type { ServiceRequestStatus } from "@/lib/database.types";
import {
  getRequestStatusTone,
  getRequestTimeline,
  isRequestTerminal,
} from "@/lib/request-status";

const stateOf = (status: ServiceRequestStatus, key: string) => getRequestTimeline(status).find((item) => item.key === key)?.state;

describe("service request status mapping", () => {
  it("separates active and finished requests", () => {
    expect(isRequestTerminal("open")).toBe(false);
    expect(isRequestTerminal("in_service")).toBe(false);
    expect(isRequestTerminal("completed")).toBe(true);
    expect(isRequestTerminal("cancelled")).toBe(true);
    expect(isRequestTerminal("expired")).toBe(true);
  });

  it("segue o fluxo criado → buscando → encontrado → agendamento → serviço → concluído", () => {
    expect(getRequestTimeline("open").map((item) => item.label)).toEqual([
      "Pedido criado",
      "Buscando profissional",
      "Profissional encontrado",
      "Agendamento",
      "Serviço",
      "Concluído",
    ]);
  });

  it("open = buscando profissional; reviewing = profissional já respondeu", () => {
    expect(stateOf("open", "created")).toBe("complete");
    expect(stateOf("open", "searching")).toBe("current");
    expect(stateOf("reviewing", "searching")).toBe("complete");
    expect(stateOf("reviewing", "found")).toBe("current");
    expect(stateOf("accepted", "found")).toBe("current");
  });

  it("marks the real current status and leaves future events disabled", () => {
    expect(stateOf("scheduled", "scheduled")).toBe("current");
    expect(stateOf("scheduled", "found")).toBe("complete");
    expect(stateOf("scheduled", "service")).toBe("upcoming");
  });

  it("concluído marca todas as etapas como feitas", () => {
    expect(getRequestTimeline("completed").every((item) => item.state === "complete")).toBe(true);
  });

  it("uses an explicit terminal event for cancelled requests", () => {
    const timeline = getRequestTimeline("cancelled");
    expect(timeline.at(-1)).toMatchObject({ key: "cancelled", state: "current" });
  });

  it("cobre todo status do enum do banco", () => {
    const all: ServiceRequestStatus[] = ["draft", "open", "reviewing", "accepted", "scheduled", "in_service", "completed", "cancelled", "expired"];
    for (const status of all) {
      expect(getRequestTimeline(status).some((item) => item.state !== "upcoming"), status).toBe(true);
    }
  });

  it("maps tones without introducing new database statuses", () => {
    expect(getRequestStatusTone("open")).toBe("brand");
    expect(getRequestStatusTone("accepted")).toBe("warning");
    expect(getRequestStatusTone("completed")).toBe("neutral");
  });
});
