/**
 * Só aceita caminhos internos (ex.: "/pedidos/123"). Bloqueia URLs absolutas,
 * protocol-relative ("//site.com") e variações com barra invertida, que o
 * navegador trata como outro domínio — evita open redirect após o login.
 */
export function safeRedirectPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  return value;
}
