import type { Metadata } from "next";

import { HomeShell } from "../componentes/home-shell";
import { getCatalogItems } from "../lib/catalogo-api";
import { usuarioDoServidor } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Acompanhe filmes, séries, jogos e livros",
  description:
    "Organize o que você assiste, joga e lê. Marque episódios, dê notas, siga amigos e receba alertas de estreias. Grátis.",
  openGraph: {
    title: "Trak | Acompanhe filmes, séries, jogos e livros",
    description: "Organize o que você assiste, joga e lê, em um só lugar.",
    type: "website"
  }
};

export default async function Home() {
  const [{ items, offline }, usuario] = await Promise.all([getCatalogItems(), usuarioDoServidor()]);
  const destaques = offline ? [] : items.filter((item) => item.coverUrl).slice(0, 8);

  return <HomeShell destaques={destaques} initialLoggedIn={Boolean(usuario)} />;
}
