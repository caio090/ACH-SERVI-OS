import { describe, expect, it } from "vitest";
import { isReadinessStatus, summarizeByCategory, summarizeReadiness } from "./betaReadiness";

describe("prontidão do beta", () => {
  it("progresso conta só itens concluídos", () => {
    const summary = summarizeReadiness([
      { category: "produto", status: "done" },
      { category: "produto", status: "in_progress" },
      { category: "seguranca", status: "blocked" },
      { category: "juridico", status: "not_started" },
    ]);
    expect(summary).toEqual({ total: 4, counts: { done: 1, in_progress: 1, blocked: 1, not_started: 1 }, percentDone: 25 });
  });

  it("sem itens não inventa percentual", () => {
    expect(summarizeReadiness([]).percentDone).toBeNull();
  });

  it("agrupa por categoria na ordem do checklist e omite categorias vazias", () => {
    const groups = summarizeByCategory([
      { category: "seguranca", status: "done" },
      { category: "produto", status: "done" },
      { category: "produto", status: "blocked" },
    ]);
    expect(groups.map((group) => [group.category, group.percentDone])).toEqual([
      ["produto", 50],
      ["seguranca", 100],
    ]);
  });

  it("valida status", () => {
    expect(isReadinessStatus("blocked")).toBe(true);
    expect(isReadinessStatus("80%")).toBe(false);
  });
});
