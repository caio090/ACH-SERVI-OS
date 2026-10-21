"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { LEGAL_VERSION } from "@/lib/legal";

export interface AuthActionState {
  error?: string;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signIn(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const limit = await checkRateLimit("auth_sign_in");
  if (!limit.ok) {
    return { error: limit.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect(redirectTo);
}

export async function signUp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || !password) {
    return { error: "Preencha nome, e-mail e senha." };
  }

  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (formData.get("accept_terms") !== "on") {
    return { error: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade." };
  }

  const limit = await checkRateLimit("auth_sign_up");
  if (!limit.ok) {
    return { error: limit.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // terms_version é copiado para profiles pelo trigger handle_new_user (0018).
    options: { data: { full_name: fullName, terms_version: LEGAL_VERSION } },
  });

  if (error) {
    return { error: error.message.includes("already") ? "Este e-mail já está cadastrado." : "Não foi possível criar sua conta." };
  }

  redirect("/");
}
