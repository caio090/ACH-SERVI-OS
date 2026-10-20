/**
 * Retorno padrão de server actions chamadas pela UI. Em produção o Next.js
 * esconde a mensagem de erros lançados por server actions, então erros que o
 * usuário precisa ler (validação, limite de uso) voltam como valor.
 */
export type ActionResult = { ok: true } | { ok: false; error: string; retryAfterSeconds?: number };

export function actionOk(): ActionResult {
  return { ok: true };
}

export function actionError(error: string, retryAfterSeconds?: number): ActionResult {
  return retryAfterSeconds === undefined ? { ok: false, error } : { ok: false, error, retryAfterSeconds };
}
