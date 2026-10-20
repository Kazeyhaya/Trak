// Interpreta CORS_ORIGIN (lista separada por virgulas) de forma tolerante:
// ignora espacos e barra final ("https://site.app/" vale como "https://site.app")
// e aceita curinga de subdominio ("https://*.vercel.app" para previews).
export function origensPermitidas(valor: string | undefined): Array<string | RegExp> {
  return (valor || "http://localhost:3000")
    .split(",")
    .map((origem) => origem.trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .map((origem) => {
      if (!origem.includes("*")) {
        return origem;
      }
      const escapada = origem.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+");
      return new RegExp(`^${escapada}$`);
    });
}
