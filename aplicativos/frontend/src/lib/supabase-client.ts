import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./supabase-config";

// A sessao fica em cookies (e nao no localStorage) para o servidor tambem ler.
// Returns null when env vars are absent (build-time / unconfigured)
export const supabase =
  supabaseUrl && supabaseAnonKey ? createBrowserClient(supabaseUrl, supabaseAnonKey) : null;
