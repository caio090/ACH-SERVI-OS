import { describe, expect, it } from "vitest";
import {
  isValidClientAppointmentTransition,
  isValidProfessionalAppointmentTransition,
} from "./appointmentTransitions";
import type { AppointmentStatus } from "./database.types";

const ALL_STATUSES: AppointmentStatus[] = ["scheduled", "in_service", "completed", "cancelled", "no_show"];

describe("isValidProfessionalAppointmentTransition", () => {
  it("permite scheduled -> in_service | cancelled | no_show", () => {
    expect(isValidProfessionalAppointmentTransition("scheduled", "in_service")).toBe(true);
    expect(isValidProfessionalAppointmentTransition("scheduled", "cancelled")).toBe(true);
    expect(isValidProfessionalAppointmentTransition("scheduled", "no_show")).toBe(true);
  });

  it("bloqueia scheduled -> completed (precisa passar por in_service)", () => {
    expect(isValidProfessionalAppointmentTransition("scheduled", "completed")).toBe(false);
  });

  it("permite in_service -> completed | cancelled", () => {
    expect(isValidProfessionalAppointmentTransition("in_service", "completed")).toBe(true);
    expect(isValidProfessionalAppointmentTransition("in_service", "cancelled")).toBe(true);
  });

  it("bloqueia in_service -> no_show", () => {
    expect(isValidProfessionalAppointmentTransition("in_service", "no_show")).toBe(false);
  });

  it("bloqueia qualquer transição a partir de completed, cancelled ou no_show", () => {
    for (const from of ["completed", "cancelled", "no_show"] as const) {
      for (const to of ALL_STATUSES) {
        expect(isValidProfessionalAppointmentTransition(from, to)).toBe(false);
      }
    }
  });
});

describe("isValidClientAppointmentTransition", () => {
  it("permite cancelar a partir de qualquer status ativo", () => {
    expect(isValidClientAppointmentTransition("scheduled", "cancelled")).toBe(true);
    expect(isValidClientAppointmentTransition("in_service", "cancelled")).toBe(true);
  });

  it("bloqueia qualquer transição que não seja para cancelled", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (to === "cancelled") continue;
        expect(isValidClientAppointmentTransition(from, to)).toBe(false);
      }
    }
  });
});
