"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CatalogItem, getMediaTypeLabel, MediaType } from "../lib/catalogo-api";
import { miniaturaCapa } from "../lib/imagens";

const TEMPO_POR_CAPA_MS = 4800;

// O verbo do titulo acompanha a capa da frente: cada tipo de midia tem o seu.
const VERBO: Record<MediaType, string> = {
  MOVIE: "assistiu",
  SERIES: "maratonou",
  GAME: "zerou",
  BOOK: "leu"
};

const COR: Record<MediaType, string> = {
  MOVIE: "var(--media-movie)",
  SERIES: "var(--media-series)",
  GAME: "var(--media-game)",
  BOOK: "var(--media-book)"
};

const VERBOS_EM_ORDEM: MediaType[] = ["MOVIE", "SERIES", "GAME", "BOOK"];

const NOME_DO_TIPO: Record<MediaType, string> = {
  MOVIE: "Filmes",
  SERIES: "Séries",
  GAME: "Jogos",
  BOOK: "Livros"
};

// Hero da landing: pilha de capas reais (filme, serie, jogo, livro) que gira sozinha,
// com o fundo tingido pela capa da frente e o verbo do titulo trocando junto.
export function LandingHero({ vitrine }: { vitrine: CatalogItem[] }) {
  const capas = vitrine.filter((item) => item.coverUrl);
  const total = capas.length;
  const [ativa, setAtiva] = useState(0);
  const [pausado, setPausado] = useState(false);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);

  const parar = useCallback(() => {
    if (relogio.current) {
      clearInterval(relogio.current);
      relogio.current = null;
    }
  }, []);

  useEffect(() => {
    parar();
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (pausado || total < 2 || semMovimento) {
      return;
    }
    relogio.current = setInterval(() => {
      if (!document.hidden) {
        setAtiva((atual) => (atual + 1) % total);
      }
    }, TEMPO_POR_CAPA_MS);
    return parar;
  }, [pausado, total, parar, ativa]);

  const frente = capas[ativa];
  const tipoAtivo: MediaType = frente?.type ?? "MOVIE";

  return (
    <section
      className="landing-hero"
      style={{ ["--cor-ativa" as string]: COR[tipoAtivo] }}
      aria-labelledby="landing-hero-titulo"
    >
      <div className="landing-hero-fundo" aria-hidden="true">
        {capas.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={miniaturaCapa(item.coverUrl, 120) ?? item.coverUrl ?? undefined}
            alt=""
            className={i === ativa ? "is-active" : undefined}
          />
        ))}
      </div>

      <div className="landing-hero-texto">
        {/* Os quatro tipos que cabem na estante; o da capa da frente se acende na sua cor. */}
        <ul className="landing-hero-tipos" aria-label="Filmes, séries, jogos e livros">
          {VERBOS_EM_ORDEM.map((tipo) => (
            <li
              key={tipo}
              className={tipo === tipoAtivo ? "is-active" : undefined}
              style={{ ["--cor-tipo" as string]: COR[tipo] }}
            >
              {NOME_DO_TIPO[tipo]}
            </li>
          ))}
        </ul>
        <h1 id="landing-hero-titulo">
          Tudo que você{" "}
          <span className="landing-hero-verbo" aria-live="off">
            {VERBOS_EM_ORDEM.map((tipo) => (
              <span key={tipo} className={tipo === tipoAtivo ? "is-active" : undefined} style={{ color: COR[tipo] }}>
                {VERBO[tipo]}
              </span>
            ))}
          </span>
          <br />
          num caderno só.
        </h1>
        <p>
          Marque o episódio, a página ou a hora jogada. Dê meia estrela, diga quem roubou a cena e coroe seus favoritos
          no Panteão.
        </p>
        <div className="landing-hero-acoes">
          <Link className="landing-hero-cta" href="/entrar">
            Criar minha estante
          </Link>
          <a className="landing-hero-link" href="#experimente">
            Experimentar sem conta ↓
          </a>
        </div>
      </div>

      {total > 0 && (
        <div
          className="landing-hero-vitrine"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
        >
          <div className="landing-hero-pilha" role="group" aria-roledescription="carrossel" aria-label="Em alta no Trak">
            {capas.map((item, i) => {
              const distancia = (i - ativa + total) % total;
              return (
                <Link
                  key={item.id}
                  href={`/itens/${item.id}`}
                  className="landing-hero-capa"
                  data-distancia={distancia <= 2 ? distancia : "oculta"}
                  tabIndex={distancia === 0 ? 0 : -1}
                  aria-hidden={distancia !== 0}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={miniaturaCapa(item.coverUrl, 280) ?? item.coverUrl ?? undefined}
                    alt={item.title}
                    loading={i < 3 ? "eager" : "lazy"}
                  />
                </Link>
              );
            })}
          </div>

          {frente && (
            <div className="landing-hero-legenda" key={frente.id}>
              <span>{getMediaTypeLabel(frente.type, frente.subtype)}</span>
              <strong>{frente.title}</strong>
              {frente.releaseYear && <small>{frente.releaseYear}</small>}
            </div>
          )}

          <div className="landing-hero-pontos">
            {capas.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Mostrar ${item.title}`}
                aria-current={i === ativa}
                className={i === ativa ? "is-active" : undefined}
                onClick={() => setAtiva(i)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const GESTOS = [
  {
    rotulo: "Progresso",
    verbo: "marque",
    texto: "O episódio da série, a página do seu exemplar, as horas de jogo. Cada coisa do jeito que ela é."
  },
  {
    rotulo: "Opinião",
    verbo: "avalie",
    texto: "Notas em meia estrela por obra e por episódio, e quem roubou a cena em cada um."
  },
  {
    rotulo: "Panteão",
    verbo: "coroe",
    texto: "Terminou? Escolha o personagem que fica com você. Seu perfil vira um salão dos favoritos."
  }
];

// Faixa com os tres gestos do Trak em letras enormes.
export function LandingGestos() {
  return (
    <section className="landing-gestos" aria-label="O que você faz no Trak">
      {GESTOS.map((gesto) => (
        <div key={gesto.verbo} className="landing-gesto">
          <span>{gesto.rotulo}</span>
          <strong>{gesto.verbo}</strong>
          <p>{gesto.texto}</p>
        </div>
      ))}
    </section>
  );
}
