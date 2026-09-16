import { describe, expect, it } from "vitest";
import { getNextAvailableSlot } from "./availability";

// 2026-09-16 é uma quarta-feira (weekday 3).
const FROM = new Date("2026-09-16T00:00:00.000Z");

describe("getNextAvailableSlot", () => {
  it("retorna null quando não há nenhuma regra de agenda", () => {
    expect(getNextAvailableSlot([], [], FROM)).toBeNull();
  });

  it("encontra o próprio dia quando a regra cobre o weekday de hoje", () => {
    const result = getNextAvailableSlot(
      [{ weekday: 3, start_time: "09:00:00" }],
      [],
      FROM,
    );
    expect(result).toEqual({ date: "2026-09-16", startTime: "09:00" });
  });

  it("pula para o próximo dia que bate com a regra quando hoje não atende", () => {
    // atende só sexta-feira (weekday 5); hoje é quarta (16/09)
    const result = getNextAvailableSlot(
      [{ weekday: 5, start_time: "10:00:00" }],
      [],
      FROM,
    );
    expect(result).toEqual({ date: "2026-09-18", startTime: "10:00" });
  });

  it("pula uma data bloqueada por exceção e usa a próxima ocorrência da regra", () => {
    // atende toda quarta-feira, mas a quarta mais próxima (16/09) está bloqueada
    const result = getNextAvailableSlot(
      [{ weekday: 3, start_time: "09:00:00" }],
      [{ exception_date: "2026-09-16", is_available: false }],
      FROM,
    );
    expect(result).toEqual({ date: "2026-09-23", startTime: "09:00" });
  });

  it("retorna null quando toda a janela de 14 dias está bloqueada por exceções", () => {
    const dates = Array.from({ length: 15 }, (_, offset) => {
      const d = new Date(FROM);
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    });
    const result = getNextAvailableSlot(
      [{ weekday: 3, start_time: "09:00:00" }],
      dates.map((exception_date) => ({ exception_date, is_available: false })),
      FROM,
    );
    expect(result).toBeNull();
  });
});
