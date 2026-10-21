import { createClient } from "@/lib/supabase/server";
import type { ProfessionalProfileRow, ProfileRow } from "@/lib/database.types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<ProfileRow>();

  return profile;
}

export async function getCurrentProfessionalProfile(): Promise<ProfessionalProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfessionalProfileRow>();

  return data;
}

export async function requireUser() {
  const profile = await getCurrentUser();
  if (!profile) {
    throw new Error("not_authenticated");
  }
  return profile;
}
