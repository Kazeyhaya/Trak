// Todas as rotas do backend ficam sob o prefixo global "/api" (main.ts).
// Normaliza a URL configurada para tolerar barra final e "/api" esquecido,
// como em NEXT_PUBLIC_API_BASE_URL=https://minha-api.onrender.com
export function normalizarApiBase(valor: string | undefined) {
  const base = (valor?.trim() || "http://localhost:3001/api").replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export const API_BASE_URL = normalizarApiBase(process.env.NEXT_PUBLIC_API_BASE_URL);
