import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_ACTION_LABELS, describeAdminAction, summarizeAuditMetadata } from "./auditLog";

describe("auditLog", () => {
  it("toda ação gravada pelas migrations tem rótulo legível", () => {
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    const sql = readdirSync(dir)
      .map((file) => readFileSync(path.join(dir, file), "utf8"))
      .join("\n");
    const actions = new Set(Array.from(sql.matchAll(/'([a-z_]+\.[a-z_]+)'/g), (match) => match[1]));
    const logged = Array.from(actions).filter((action) => /^(user|professional|category|report|review|service_request|appointment|beta_readiness)\./.test(action));
    expect(logged.length).toBeGreaterThan(0);
    for (const action of logged) {
      expect(ADMIN_ACTION_LABELS, action).toHaveProperty([action]);
    }
  });

  it("descreve ação desconhecida pelo próprio código", () => {
    expect(describeAdminAction("user.suspended")).toBe("Suspendeu usuário");
    expect(describeAdminAction("x.y")).toBe("x.y");
  });

  it("resume metadata de transição e de alterações", () => {
    expect(summarizeAuditMetadata({ from: "open", to: "cancelled" })).toBe("open → cancelled");
    expect(summarizeAuditMetadata({ slug: "pintor", changes: { is_active: { from: true, to: false } } })).toBe(
      "is_active: true → false",
    );
    expect(summarizeAuditMetadata(null)).toBe("");
  });
});
