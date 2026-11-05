"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Lock } from "lucide-react";

import { RatingStars } from "./rating-stars";
import { RewatchCounter } from "./rewatch-counter";
import { UiButton } from "./ui-button";
import { Episode, EpisodeCharacter, getEpisodes, getMediaCredits, getSeasons } from "../lib/api";
import { CatalogItem } from "../lib/catalogo-api";
import { miniaturaCapa } from "../lib/imagens";

type EstadoEpisodio = { nota: number | null; roubou: string | null; vezes: number };

const EPISODIOS_NA_DEMO = 6;
const PERSONAGENS_NA_DEMO = 6;

function jaExibido(data: string | null) {
  return Boolean(data) && new Date(`${data}T00:00:00Z`).getTime() <= Date.now();
}

// A ficha de verdade, com episodios e elenco reais de uma serie em alta, para quem
// ainda nao tem conta experimentar. Nada e gravado: o estado vive so nesta pagina.
export function LandingDemo({ destaques }: { destaques: CatalogItem[] }) {
  const serie = destaques.find((item) => item.type === "SERIES" && item.coverUrl) ?? null;
  const serieId = serie?.id;
  const [episodios, setEpisodios] = useState<Episode[]>([]);
  const [personagens, setPersonagens] = useState<EpisodeCharacter[]>([]);
  const [temporada, setTemporada] = useState<number | null>(null);
  const [marcados, setMarcados] = useState<Map<number, EstadoEpisodio>>(new Map());
  const [aberto, setAberto] = useState<number | null>(null);
  const [coroado, setCoroado] = useState<EpisodeCharacter | null>(null);

  useEffect(() => {
    if (!serieId) {
      return;
    }
    let ativo = true;
    (async () => {
      const temporadas = await getSeasons(serieId);
      const primeira = temporadas.find((t) => t.seasonNumber > 0);
      if (!primeira) {
        return;
      }
      const [lista, elenco] = await Promise.all([getEpisodes(serieId, primeira.seasonNumber), getMediaCredits(serieId)]);
      if (!ativo) {
        return;
      }
      setTemporada(primeira.seasonNumber);
      setEpisodios(lista.filter((e) => jaExibido(e.airDate)).slice(0, EPISODIOS_NA_DEMO));
      setPersonagens(elenco.filter((p) => p.avatarUrl).slice(0, PERSONAGENS_NA_DEMO));
    })().catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [serieId]);

  // Sem serie, episodios ou elenco, a demo nao teria o que mostrar: a pagina segue sem ela.
  if (!serie || episodios.length < 2 || personagens.length < 2 || temporada === null) {
    return null;
  }

  const vistos = marcados.size;
  const completo = vistos === episodios.length;
  const episodioAberto = aberto !== null ? episodios.find((e) => e.episodeNumber === aberto) : undefined;
  const estadoAberto = aberto !== null ? marcados.get(aberto) : undefined;
  const capa = miniaturaCapa(serie.coverUrl, 180) ?? serie.coverUrl ?? undefined;

  function alterar(numero: number, mudanca: Partial<EstadoEpisodio> | null) {
    setMarcados((atual) => {
      const proximo = new Map(atual);
      if (mudanca === null) {
        proximo.delete(numero);
      } else {
        proximo.set(numero, { ...(atual.get(numero) ?? { nota: null, roubou: null, vezes: 1 }), ...mudanca });
      }
      return proximo;
    });
  }

  function clicarEpisodio(numero: number) {
    if (!marcados.has(numero)) {
      alterar(numero, {});
    }
    setAberto(numero);
  }

  function desmarcar(numero: number) {
    alterar(numero, null);
    setAberto(null);
    setCoroado(null);
  }

  const avatarDe = (nome: string | null) => personagens.find((p) => p.character === nome)?.avatarUrl ?? null;

  return (
    <section className="landing-demo" aria-labelledby="landing-demo-titulo">
      <header className="landing-demo-header">
        <span className="hero-eyebrow">Experimente agora</span>
        <h2 id="landing-demo-titulo">Marque um episódio de {serie.title}.</h2>
        <p>Episódios e elenco reais, do jeito que ficam no Trak. Nada é salvo até você criar a conta.</p>
      </header>

      <div className="landing-demo-board">
        <aside className="landing-demo-obra">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capa} alt="" loading="lazy" decoding="async" />
          <div>
            <strong>{serie.title}</strong>
            <span>
              Temporada {temporada} · {vistos} de {episodios.length} episódios
            </span>
            <div className="landing-demo-progresso" aria-hidden="true">
              <span style={{ width: `${(vistos / episodios.length) * 100}%` }} />
            </div>
          </div>

          <div className={`landing-demo-panteao${completo ? " is-open" : ""}${coroado ? " is-crowned" : ""}`}>
            {coroado ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {coroado.avatarUrl && <img src={coroado.avatarUrl} alt="" loading="lazy" />}
                <div>
                  <span>
                    <Crown size={13} aria-hidden="true" /> No seu Panteão
                  </span>
                  <strong>{coroado.character}</strong>
                </div>
              </>
            ) : completo ? (
              <div>
                <span>
                  <Crown size={13} aria-hidden="true" /> Panteão destravado
                </span>
                <strong>Quem foi o personagem desta temporada para você?</strong>
              </div>
            ) : (
              <div>
                <span>
                  <Lock size={13} aria-hidden="true" /> Panteão
                </span>
                <strong>Abre quando você terminar os {episodios.length} episódios.</strong>
              </div>
            )}
          </div>
        </aside>

        <div className="landing-demo-acoes">
          <ol className="landing-demo-episodios">
            {episodios.map((episodio) => {
              const estado = marcados.get(episodio.episodeNumber);
              return (
                <li key={episodio.episodeNumber}>
                  <button
                    type="button"
                    className={`${estado ? "is-watched" : ""}${aberto === episodio.episodeNumber ? " is-open" : ""}`}
                    aria-pressed={Boolean(estado)}
                    onClick={() => clicarEpisodio(episodio.episodeNumber)}
                  >
                    <span className="landing-demo-ep-numero">
                      {estado ? <Check size={14} aria-hidden="true" /> : episodio.episodeNumber}
                    </span>
                    <span className="landing-demo-ep-nome">{episodio.name}</span>
                    {estado?.roubou && avatarDe(estado.roubou) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="landing-demo-ep-roubou" src={avatarDe(estado.roubou)!} alt={estado.roubou} />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="landing-demo-painel" aria-live="polite">
            {completo && !coroado ? (
              <>
                <p className="landing-demo-pergunta">Escolha quem vai para o seu Panteão</p>
                <Personagens lista={personagens} escolhido={null} onEscolher={setCoroado} />
              </>
            ) : coroado ? (
              <div className="landing-demo-final">
                <p>
                  Assim fica o seu perfil: cada obra concluída com um personagem coroado e cada episódio com quem roubou
                  a cena.
                </p>
                <UiButton href={`/entrar?next=${encodeURIComponent(`/itens/${serie.id}`)}`}>
                  Criar conta e começar a minha estante
                </UiButton>
              </div>
            ) : episodioAberto && estadoAberto ? (
              <>
                <div className="landing-demo-painel-topo">
                  <strong>
                    Ep. {episodioAberto.episodeNumber} · {episodioAberto.name}
                  </strong>
                  <button type="button" className="landing-demo-desmarcar" onClick={() => desmarcar(episodioAberto.episodeNumber)}>
                    Desmarcar
                  </button>
                </div>
                <RatingStars
                  value={estadoAberto.nota}
                  size="sm"
                  onChange={(nota) => alterar(episodioAberto.episodeNumber, { nota })}
                />
                <p className="landing-demo-pergunta">Quem roubou a cena?</p>
                <Personagens
                  lista={personagens}
                  escolhido={estadoAberto.roubou}
                  onEscolher={(p) =>
                    alterar(episodioAberto.episodeNumber, { roubou: estadoAberto.roubou === p.character ? null : p.character })
                  }
                />
                <RewatchCounter
                  compact
                  count={estadoAberto.vezes}
                  againLabel="Vi de novo"
                  onChange={(vezes) => alterar(episodioAberto.episodeNumber, { vezes })}
                />
              </>
            ) : (
              <p className="landing-demo-dica">
                {vistos === 0
                  ? "Toque em um episódio para marcar como visto."
                  : `Faltam ${episodios.length - vistos} para destravar o Panteão.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Personagens({
  lista,
  escolhido,
  onEscolher
}: {
  lista: EpisodeCharacter[];
  escolhido: string | null;
  onEscolher: (personagem: EpisodeCharacter) => void;
}) {
  return (
    <ul className="landing-demo-personagens">
      {lista.map((personagem) => (
        <li key={personagem.id}>
          <button
            type="button"
            aria-pressed={escolhido === personagem.character}
            className={escolhido === personagem.character ? "is-chosen" : undefined}
            onClick={() => onEscolher(personagem)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={personagem.avatarUrl ?? ""} alt="" loading="lazy" />
            <span>{personagem.character}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
