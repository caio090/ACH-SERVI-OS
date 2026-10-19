import "server-only";

export function hasPublicSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function allowMissingSupabaseForVisualPreview() {
  return process.env.NODE_ENV !== "production" && !hasPublicSupabaseConfig();
}

export function assertSupabaseConfigOutsideVisualPreview() {
  if (!hasPublicSupabaseConfig() && !allowMissingSupabaseForVisualPreview()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required outside the development visual preview.",
    );
  }
}
