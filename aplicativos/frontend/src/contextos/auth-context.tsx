"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getMyProfile, Profile } from "../lib/api";
import { supabase } from "../lib/supabase-client";

type AuthResult = { error: string | null; hasSession: boolean };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const naoConfigurado = "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function traduzirErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) {
    return "Limite de envio de e-mails atingido no Supabase. Aguarde alguns minutos ou desative 'Confirm email' em Authentication → Providers → Email no painel do Supabase.";
  }
  if (m.includes("error sending confirmation email") || m.includes("unexpected_failure")) {
    return "Não foi possível enviar o e-mail de confirmação (ou houve erro no trigger do banco). Dica: no painel do Supabase, desative 'Confirm email' em Authentication → Providers → Email.";
  }
  if (m.includes("database error saving new user")) {
    return "Erro no banco ao criar usuário (verifique a tabela User e o trigger trak_criar_usuario no Supabase).";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Este e-mail já está cadastrado. Tente entrar com sua senha.";
  }
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar (ou desative a confirmação de e-mail no Supabase).";
  }
  if (m.includes("password should be at least")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "Informe um endereço de e-mail válido.";
  }
  return mensagem;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
  refreshProfile: async () => {},
  signIn: async () => ({ error: "AuthProvider não inicializado.", hasSession: false }),
  signUp: async () => ({ error: "AuthProvider não inicializado.", hasSession: false }),
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Sem Supabase configurado nao ha sessao para carregar.
  const [loading, setLoading] = useState(Boolean(supabase));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data.profile);
      setIsAdmin(data.isAdmin);
    } catch {
      // Perfil e opcional: API fora do ar ou migration nao aplicada.
      setProfile(null);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      return;
    }
    let active = true;
    getMyProfile()
      .then((data) => {
        if (active) {
          setProfile(data.profile);
          setIsAdmin(data.isAdmin);
        }
      })
      // Perfil e opcional: API fora do ar ou migration nao aplicada.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId]);

  async function signIn(email: string, password: string) {
    if (!supabase) {
      return { error: naoConfigurado, hasSession: false };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return { error: error ? traduzirErroAuth(error.message) : null, hasSession: Boolean(data.session) };
  }

  async function signUp(email: string, password: string) {
    if (!supabase) {
      return { error: naoConfigurado, hasSession: false };
    }
    const emailLimpo = email.trim().toLowerCase();
    const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: emailLimpo,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined
    });
    return { error: error ? traduzirErroAuth(error.message) : null, hasSession: Boolean(data.session) };
  }

  async function signOut() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile: user ? profile : null,
        isAdmin: user ? isAdmin : false,
        refreshProfile,
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
