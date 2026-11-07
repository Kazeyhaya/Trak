import { API_BASE_URL } from "../api-base";
import { supabase } from "../supabase-client";

export { API_BASE_URL };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente.") {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.";
    }
    // 500 traz detalhes internos (banco, configuracao): nao exibir. Os 503 da
    // API sao mensagens intencionais (ex.: importacao da Steam indisponivel).
    if (error.status >= 500 && error.status !== 503) {
      return "O servidor teve um problema. Tente novamente em instantes.";
    }
    return error.message;
  }
  return fallback;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new ApiError(message ?? "Algo deu errado. Tente novamente.", response.status);
  }

  // O Nest responde corpo vazio quando o controller retorna null.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const json = (body: unknown) => JSON.stringify(body);
