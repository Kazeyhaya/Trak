import { StatusTracking } from "../tracking/dto/salvar-tracking.dto";

export const LISTAS_LETTERBOXD = ["watched", "ratings", "diary", "watchlist"] as const;
export type ListaLetterboxd = (typeof LISTAS_LETTERBOXD)[number];

export type LinhaLetterboxd = {
  titulo: string;
  ano: number | null;
  rating: number | null;
  status: StatusTracking;
};

export type ItemTrakt = {
  tmdbId: number;
  tipo: "MOVIE" | "SERIES";
  titulo: string;
  status: StatusTracking;
  rating: number | null;
  episodios: Array<{ season: number; episode: number }>;
};

export type JogoSteam = { nome: string; minutos: number };

export type PerfilSteam = { tipo: "id"; valor: string } | { tipo: "vanity"; valor: string };

// CSV (RFC 4180): aspas, virgulas e quebras de linha dentro de aspas, BOM e CRLF.
export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;
  const conteudo = texto.replace(/^﻿/, "");

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];

    if (entreAspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && conteudo[i + 1] === "\n") {
        i++;
      }
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }

  if (campo || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((valor) => valor.trim() !== ""));
}

// Converte uma nota de outra escala para 1..5 (sem zero).
export function converterNota(valor: number, maximo: number) {
  if (!Number.isFinite(valor) || valor <= 0) {
    return null;
  }
  return Math.min(5, Math.max(1, Math.round((valor / maximo) * 5)));
}

// Exportacao do Letterboxd: watched.csv, ratings.csv, diary.csv ou watchlist.csv.
export function linhasLetterboxd(csv: string, lista: ListaLetterboxd): LinhaLetterboxd[] {
  const [cabecalho, ...linhas] = parseCsv(csv);
  if (!cabecalho) {
    return [];
  }

  const coluna = (nome: string) => cabecalho.findIndex((c) => c.trim().toLowerCase() === nome);
  const iNome = coluna("name");
  const iAno = coluna("year");
  const iNota = coluna("rating");

  if (iNome < 0) {
    throw new Error("O arquivo nao parece ser uma exportacao do Letterboxd (coluna Name ausente).");
  }

  const vistos = new Set<string>();

  return linhas.flatMap((linha) => {
    const titulo = linha[iNome]?.trim();
    if (!titulo) {
      return [];
    }
    const ano = iAno >= 0 && /^\d{4}$/.test(linha[iAno]?.trim() ?? "") ? Number(linha[iAno]) : null;
    const chave = `${titulo.toLowerCase()}|${ano ?? ""}`;
    // O diario repete filmes assistidos mais de uma vez.
    if (vistos.has(chave)) {
      return [];
    }
    vistos.add(chave);

    return [
      {
        titulo,
        ano,
        rating: iNota >= 0 ? converterNota(Number(linha[iNota]), 5) : null,
        status: lista === "watchlist" ? "WANT" : "COMPLETED"
      }
    ];
  });
}

type EntradaTrakt = {
  type?: string;
  rating?: number;
  plays?: number;
  listed_at?: string;
  last_watched_at?: string;
  movie?: { title?: string; ids?: { tmdb?: number | null } };
  show?: { title?: string; ids?: { tmdb?: number | null } };
  seasons?: Array<{ number: number; episodes?: Array<{ number: number }> }>;
};

// Exportacao do Trakt: watched-*.json, ratings-*.json ou watchlist-*.json.
export function itensTrakt(json: unknown): ItemTrakt[] {
  if (!Array.isArray(json)) {
    throw new Error("O arquivo do Trakt deve conter uma lista JSON.");
  }

  return (json as EntradaTrakt[]).flatMap((entrada) => {
    // Avaliacoes de episodios ou temporadas avulsas sao ignoradas.
    if (entrada.type && entrada.type !== "movie" && entrada.type !== "show") {
      return [];
    }

    const midia = entrada.movie ?? entrada.show;
    const tmdbId = midia?.ids?.tmdb;
    if (!midia || !tmdbId) {
      return [];
    }

    const tipo = entrada.movie ? "MOVIE" : "SERIES";
    const naWatchlist = Boolean(entrada.listed_at) && !entrada.plays && !entrada.last_watched_at && !entrada.rating;
    const episodios = (entrada.seasons ?? []).flatMap((season) =>
      (season.episodes ?? []).map((episode) => ({ season: season.number, episode: episode.number }))
    );
    const status: StatusTracking = naWatchlist ? "WANT" : tipo === "MOVIE" ? "COMPLETED" : "WATCHING";

    return [
      {
        tmdbId,
        tipo,
        titulo: midia.title ?? String(tmdbId),
        status,
        rating: entrada.rating ? converterNota(entrada.rating, 10) : null,
        episodios
      }
    ];
  });
}

// Aceita SteamID64, URL /profiles/<id>, URL /id/<nome> ou o nome personalizado.
export function interpretarPerfilSteam(entrada: string): PerfilSteam | null {
  const valor = entrada.trim().replace(/\/+$/, "");
  const porId = valor.match(/(?:^|\/profiles\/)(\d{17})$/);
  if (porId) {
    return { tipo: "id", valor: porId[1] };
  }
  const porNome = valor.match(/(?:^|\/id\/)([A-Za-z0-9_-]{2,32})$/);
  return porNome ? { tipo: "vanity", valor: porNome[1] } : null;
}

export function jogosSteam(resposta: unknown, limite = 150): JogoSteam[] {
  const jogos = (resposta as { response?: { games?: Array<{ name?: string; playtime_forever?: number }> } })
    ?.response?.games;

  return (jogos ?? [])
    .flatMap((jogo) => (jogo.name ? [{ nome: jogo.name, minutos: jogo.playtime_forever ?? 0 }] : []))
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, limite);
}
