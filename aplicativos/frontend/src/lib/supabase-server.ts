import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./supabase-config";

// Cliente do Supabase para Server Components, lendo a sessao dos cookies.
export async function criarSupabaseServidor() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components nao podem gravar cookies; o proxy.ts renova a sessao.
        }
      }
    }
  });
}

export async function usuarioDoServidor() {
  const supabase = await criarSupabaseServidor();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function tokenDoServidor() {
  const supabase = await criarSupabaseServidor();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
