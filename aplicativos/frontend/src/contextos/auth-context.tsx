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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session) };
  }

  async function signUp(email: string, password: string) {
    if (!supabase) {
      return { error: naoConfigurado, hasSession: false };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session) };
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
