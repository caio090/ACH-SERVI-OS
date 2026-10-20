import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Postgres real (PGlite/WASM) com todas as migrations de supabase/migrations
 * aplicadas sobre um stub mínimo do ambiente Supabase (papéis anon/
 * authenticated/service_role, auth.uid() e schema storage). Permite testar
 * RLS, triggers e RPCs sem rede e sem tocar no projeto real.
 */

const ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");
const STUB_SQL = readFileSync(path.join(__dirname, "supabaseStub.sql"), "utf8");

export type Db = PGlite;
export type Tx = Transaction;

export function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

let snapshot: Promise<File | Blob> | null = null;

async function buildSnapshot() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(STUB_SQL);
  for (const file of listMigrationFiles()) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      await db.close();
      throw new Error(`Migration ${file} falhou: ${(error as Error).message}`);
    }
  }
  const dump = await db.dumpDataDir("none");
  await db.close();
  return dump;
}

/**
 * Banco novo e isolado por chamada. As migrations rodam uma vez por processo
 * e cada instância nasce de um snapshot desse estado. Feche com `db.close()`.
 */
export async function createTestDb(): Promise<Db> {
  snapshot ??= buildSnapshot();
  return new PGlite({ extensions: { pgcrypto }, loadDataDir: await snapshot });
}

/** Cria um usuário em auth.users (o trigger handle_new_user cria o profile). */
export async function createUser(
  db: Db,
  params: { id: string; email: string; fullName?: string; role?: "client" | "professional" | "admin"; metadata?: Record<string, unknown> },
) {
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    params.id,
    params.email,
    JSON.stringify({ full_name: params.fullName ?? params.email, ...params.metadata }),
  ]);
  if (params.role && params.role !== "client") {
    // Como um operador faria no SQL Editor: sem disparar o trigger que impede
    // não-admins de mudar o próprio papel (auth.uid() é nulo aqui).
    await db.transaction(async (tx) => {
      await tx.exec("set local session_replication_role = replica");
      await tx.query("update public.profiles set role = $2 where id = $1", [params.id, params.role]);
    });
  }
}

/**
 * Executa `fn` como um usuário autenticado (papel `authenticated` + JWT sub),
 * dentro de uma transação — erros de RLS/trigger fazem rollback e são
 * propagados para o teste.
 */
export async function asUser<T>(db: Db, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return fn(tx);
  });
}

/** Executa `fn` como visitante anônimo (papel `anon`, sem JWT). */
export async function asAnon<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    await tx.query("select set_config('request.jwt.claim.sub', '', true)");
    return fn(tx);
  });
}

/** Executa `fn` como o backend com service role (ignora RLS, sem auth.uid()). */
export async function asServiceRole<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    await tx.query("select set_config('request.jwt.claim.sub', '', true)");
    return fn(tx);
  });
}

export async function one<T>(tx: Tx | Db, sql: string, params: unknown[] = []): Promise<T> {
  const result = await tx.query<T>(sql, params);
  if (result.rows.length !== 1) {
    throw new Error(`Esperava 1 linha, recebi ${result.rows.length}: ${sql}`);
  }
  return result.rows[0];
}

export async function rows<T>(tx: Tx | Db, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await tx.query<T>(sql, params)).rows;
}

/**
 * Cenário base: cliente, profissional (com perfil e categoria) e um pedido
 * aberto com match pendente para esse profissional.
 */
export async function seedRequestWithMatch(db: Db) {
  await createUser(db, { id: IDS.client, email: "cliente.teste@example.com", fullName: "Cliente Teste" });
  await createUser(db, { id: IDS.professional, email: "pro.teste@example.com", fullName: "Profissional Teste" });
  const categoryId = (await one<{ id: string }>(db, "select id from public.categories where slug = 'eletricista'")).id;

  await asUser(db, IDS.professional, async (tx) => {
    await tx.query("insert into public.professional_profiles (id, service_areas) values ($1, '{Centro}')", [IDS.professional]);
    await tx.query("insert into public.professional_categories (professional_id, category_id) values ($1, $2)", [
      IDS.professional,
      categoryId,
    ]);
  });

  const requestId = await asUser(db, IDS.client, async (tx) =>
    (
      await one<{ id: string }>(
        tx,
        `insert into public.service_requests
          (client_id, category_id, description, neighborhood, city, desired_date, time_window_start, time_window_end, status)
         values ($1, $2, 'Pedido de teste do cenário base', 'Centro', 'Cidade Piloto', current_date + 3, '09:00', '12:00', 'open')
         returning id`,
        [IDS.client, categoryId],
      )
    ).id,
  );

  const matchId = await asUser(db, IDS.client, async (tx) =>
    (
      await one<{ id: string }>(
        tx,
        "insert into public.request_matches (request_id, professional_id) values ($1, $2) returning id",
        [requestId, IDS.professional],
      )
    ).id,
  );

  return { categoryId, requestId, matchId };
}

export const IDS = {
  client: "00000000-0000-4000-8000-00000000c001",
  professional: "00000000-0000-4000-8000-00000000f001",
  outsider: "00000000-0000-4000-8000-00000000e001",
  admin: "00000000-0000-4000-8000-00000000a001",
} as const;
