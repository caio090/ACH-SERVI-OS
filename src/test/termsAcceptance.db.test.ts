import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, createUser, one, type Db } from "./db";

describe("0018 — aceite dos termos no cadastro", () => {
  let db: Db;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(() => db.close());

  it("grava a versão aceita e o horário do banco no perfil", async () => {
    const id = "00000000-0000-4000-8000-0000000d0001";
    await createUser(db, { id, email: "aceite@example.com", metadata: { terms_version: "2026-10-20-beta" } });
    const profile = await one<{ terms_version: string | null; terms_accepted_at: string | null; full_name: string }>(
      db,
      "select terms_version, terms_accepted_at, full_name from public.profiles where id = $1",
      [id],
    );
    expect(profile.terms_version).toBe("2026-10-20-beta");
    expect(profile.terms_accepted_at).not.toBeNull();
    expect(profile.full_name).toBe("aceite@example.com");
  });

  it("sem aceite no metadata, o perfil fica sem registro de aceite", async () => {
    const id = "00000000-0000-4000-8000-0000000d0002";
    await createUser(db, { id, email: "sem-aceite@example.com" });
    const profile = await one<{ terms_version: string | null; terms_accepted_at: string | null }>(
      db,
      "select terms_version, terms_accepted_at from public.profiles where id = $1",
      [id],
    );
    expect(profile).toEqual({ terms_version: null, terms_accepted_at: null });
  });
});
