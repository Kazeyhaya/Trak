import type { Metadata } from "next";

import { HomeShell } from "../componentes/home-shell";
import { CatalogItem, getCatalogItems } from "../lib/catalogo-api";
import { tokenDoServidor, usuarioDoServidor } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Acompanhe filmes, séries, jogos e livros",
  description:
    "Organize o que você assiste, joga e lê. Marque episódios, dê notas, siga amigos e receba alertas de estreias.",
  openGraph: {
    title: "Trak | Acompanhe filmes, séries, jogos e livros",
    description: "Filmes, séries, jogos e livros num caderno só.",
    type: "website"
  }
};

export default async function Home() {
  const token = await tokenDoServidor();
  const [{ items, offline }, usuario] = await Promise.all([getCatalogItems("", "", "", token), usuarioDoServidor()]);
  const comCapa = offline ? [] : items.filter((item) => item.coverUrl);
  const destaques = comCapa.slice(0, 8);

  return <HomeShell destaques={destaques} vitrine={intercalarTipos(comCapa, 8)} initialLoggedIn={Boolean(usuario)} />;
}

// A listagem vem em blocos (filmes, depois series, jogos, livros). A vitrine da landing
// alterna os tipos para mostrar logo de cara que filmes, series, jogos e livros cabem juntos.
function intercalarTipos(itens: CatalogItem[], limite: number) {
  const porTipo = new Map<string, CatalogItem[]>();
  for (const item of itens) {
    porTipo.set(item.type, [...(porTipo.get(item.type) ?? []), item]);
  }
  const filas = [...porTipo.values()];
  const resultado: CatalogItem[] = [];
  for (let i = 0; resultado.length < limite && filas.some((fila) => i < fila.length); i++) {
    for (const fila of filas) {
      if (fila[i] && resultado.length < limite) {
        resultado.push(fila[i]);
      }
    }
  }
  return resultado;
}
