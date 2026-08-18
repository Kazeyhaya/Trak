"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase-client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; hasSession: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; hasSession: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: "AuthProvider não inicializado.", hasSession: false }),
  signUp: async () => ({ error: "AuthProvider não inicializado.", hasSession: false }),
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      persistToken(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      persistToken(nextSession);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) {
      return {
        error: "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        hasSession: false
      };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session) };
  }

  async function signUp(email: string, password: string) {
    if (!supabase) {
      return {
        error: "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        hasSession: false
      };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session) };
  }

  async function signOut() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function persistToken(session: Session | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (session?.access_token) {
    window.localStorage.setItem("trak_token", session.access_token);
  } else {
    window.localStorage.removeItem("trak_token");
  }
}
