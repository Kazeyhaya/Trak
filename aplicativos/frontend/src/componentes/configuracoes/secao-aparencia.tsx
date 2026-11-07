"use client";

import { useEffect, useState } from "react";

import { RodapeSecao } from "./rodape-secao";
import { useSecaoSalvavel } from "./usar-secao";
import { UiBadge } from "../ui-badge";
import { useAuth } from "../../contextos/auth-context";
import {
  CatalogItem,
  getFavorites,
  getTrackingItems,
  Profile,
  ProfileTheme,
  saveMyProfile
} from "../../lib/api";
import { miniaturaCapa } from "../../lib/imagens";

const TEMAS: Array<{ id: ProfileTheme; label: string; color: string }> = [
  { id: "emerald", label: "Esmeralda", color: "#7ce1c7" },
  { id: "ocean", label: "Oceano", color: "#6cb8ff" },
  { id: "cyberpunk", label: "Cyberpunk", color: "#c586ff" },
  { id: "amber", label: "Âmbar", color: "#ffbe5c" },
  { id: "crimson", label: "Carmesim", color: "#ff7a90" }
];

type Props = { profile: Profile | null; onAlterado: (alterado: boolean) => void };

type Numeros = { games: number; books: number; movies: number; series: number; hours: number };

// Contadores da pre-visualizacao, estimados a partir da estante.
function numerosDaEstante(trackings: Awaited<ReturnType<typeof getTrackingItems>>): Numeros {
  const numeros = { games: 0, books: 0, movies: 0, series: 0, hours: 0 };
  for (const t of trackings) {
    const progresso = Math.max(0, Math.min(100, t.progress ?? (t.status === "COMPLETED" ? 100 : 25)));
    const andamento = t.status === "WATCHING" || t.status === "PAUSED";
    switch (t.item?.type) {
      case "GAME":
        if (t.status === "COMPLETED") {
          numeros.games++;
          numeros.hours += 25;
        } else if (andamento) {
          numeros.hours += Math.max(2, Math.round(25 * (progresso / 100)));
        }
        break;
      case "BOOK":
        if (t.status === "COMPLETED") {
          numeros.books++;
          numeros.hours += 8;
        } else if (andamento) {
          numeros.hours += Math.max(1, Math.round(8 * (progresso / 100)));
        }
        break;
      case "MOVIE":
        if (t.status === "COMPLETED") {
          numeros.movies++;
          numeros.hours += 2;
        }
        break;
      case "SERIES":
        if (t.status === "COMPLETED") {
          numeros.series++;
          numeros.hours += 12;
        } else if (andamento) {
          numeros.hours += 5;
        }
        break;
    }
  }
  return numeros;
}

// Foto, capa e tema, com a pre-visualizacao do perfil no topo.
export function SecaoAparencia({ profile, onAlterado }: Props) {
  const { refreshProfile } = useAuth();
  const secao = useSecaoSalvavel({
    avatarUrl: profile?.avatarUrl ?? "",
    bannerUrl: profile?.bannerUrl ?? "",
    theme: String(profile?.theme ?? "emerald")
  });
  const { valores, alterar, alterado } = secao;
  const [obras, setObras] = useState<CatalogItem[]>([]);
  const [numeros, setNumeros] = useState<Numeros>({ games: 0, books: 0, movies: 0, series: 0, hours: 0 });

  useEffect(() => onAlterado(alterado), [alterado, onAlterado]);

  useEffect(() => {
    let ativo = true;
    Promise.all([getFavorites().catch(() => []), getTrackingItems().catch(() => [])]).then(([favoritos, estante]) => {
      if (!ativo) return;
      const vistos = new Set<string>();
      const comCapa: CatalogItem[] = [];
      for (const item of [...favoritos.map((f) => f.item), ...estante.map((e) => e.item)]) {
        if (item?.coverUrl && !vistos.has(item.id)) {
          vistos.add(item.id);
          comCapa.push(item);
        }
      }
      setObras(comCapa.slice(0, 12));
      setNumeros(numerosDaEstante(estante));
    });
    return () => {
      ativo = false;
    };
  }, []);

  const capaAtiva = valores.bannerUrl.trim() || obras[0]?.coverUrl || null;
  const nome = profile?.displayName?.trim() || (profile ? `@${profile.username}` : "Seu nome");
  const inicial = nome.replace("@", "").charAt(0).toUpperCase() || "T";

  function escolherFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) {
      return;
    }
    if (!arquivo.type.startsWith("image/")) {
      secao.setErro("Escolha um arquivo de imagem (PNG, JPG ou WebP).");
      return;
    }
    // Recorta o centro em 160x160 e guarda como JPEG.
    const leitor = new FileReader();
    leitor.onload = () => {
      const imagem = new window.Image();
      imagem.onload = () => {
        const lado = 160;
        const canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }
        const menor = Math.min(imagem.width, imagem.height);
        ctx.drawImage(imagem, (imagem.width - menor) / 2, (imagem.height - menor) / 2, menor, menor, 0, 0, lado, lado);
        alterar({ avatarUrl: canvas.toDataURL("image/jpeg", 0.85) });
        secao.setErro(null);
      };
      imagem.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  }

  function salvar() {
    void secao.salvar(async (alteracoes) => {
      await saveMyProfile({
        ...alteracoes,
        ...(alteracoes.avatarUrl !== undefined ? { avatarUrl: alteracoes.avatarUrl.trim() } : {}),
        ...(alteracoes.bannerUrl !== undefined ? { bannerUrl: alteracoes.bannerUrl.trim() } : {})
      });
      await refreshProfile();
    }, "Aparência salva.");
  }

  return (
    <section className="config-secao" aria-labelledby="config-aparencia-titulo">
      <header className="config-secao-cabecalho">
        <h2 id="config-aparencia-titulo">Aparência</h2>
        <p>Foto, capa e cores do seu perfil.</p>
      </header>

      <div className={`profile-showcase-banner theme-${valores.theme}`} aria-label="Pré-visualização do seu perfil">
        {capaAtiva && (
          <div className="profile-showcase-backdrop" style={{ backgroundImage: `url("${capaAtiva}")` }} aria-hidden="true" />
        )}
        <div className="profile-showcase-content">
          <div className="profile-identity-row">
            <div className="profile-avatar-badge" aria-hidden="true">
              {valores.avatarUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={valores.avatarUrl.trim()} alt="" />
              ) : (
                inicial
              )}
            </div>
            <div className="profile-identity-copy">
              <div className="status-chips">
                <UiBadge tone="primary">Pré-visualização</UiBadge>
              </div>
              <h2>{nome}</h2>
              {profile && <p className="profile-handle">@{profile.username}</p>}
            </div>
          </div>
          <div className="profile-cultural-badges">
            <div className="cultural-badge">
              <strong>{numeros.games}</strong>
              <span>Jogos zerados</span>
            </div>
            <div className="cultural-badge">
              <strong>{numeros.books}</strong>
              <span>Livros lidos</span>
            </div>
            <div className="cultural-badge">
              <strong>{numeros.movies + numeros.series}</strong>
              <span>Filmes e séries</span>
            </div>
            <div className="cultural-badge">
              <strong>~{numeros.hours}h</strong>
              <span>Horas no total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="field-stack">
        <div className="avatar-picker-row">
          <div className="avatar-picker-preview" aria-hidden="true">
            {valores.avatarUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={valores.avatarUrl.trim()} alt="" />
            ) : (
              inicial
            )}
          </div>
          <div className="avatar-picker-actions">
            <label className="secondary-button config-arquivo">
              Escolher foto do dispositivo
              <input type="file" accept="image/*" onChange={escolherFoto} />
            </label>
            {valores.avatarUrl && (
              <button type="button" className="filter-chip" onClick={() => alterar({ avatarUrl: "" })}>
                Remover foto
              </button>
            )}
          </div>
        </div>

        <label>
          Ou cole o link de uma foto (opcional)
          <input
            type="url"
            value={valores.avatarUrl.startsWith("data:") ? "" : valores.avatarUrl}
            maxLength={500}
            placeholder="https://exemplo.com/minha-foto.jpg"
            onChange={(event) => alterar({ avatarUrl: event.target.value })}
          />
        </label>

        <div>
          <span className="field-label">Cor de destaque</span>
          <div className="theme-selector" role="radiogroup" aria-label="Cor de destaque do perfil">
            {TEMAS.map((tema) => (
              <button
                key={tema.id}
                type="button"
                role="radio"
                aria-checked={valores.theme === tema.id}
                className={`theme-pill${valores.theme === tema.id ? " is-active" : ""}`}
                onClick={() => alterar({ theme: tema.id })}
              >
                <span className="theme-swatch" style={{ background: tema.color }} aria-hidden="true" />
                {tema.label}
              </button>
            ))}
          </div>
        </div>

        {obras.length > 0 && (
          <div className="banner-picker-block">
            <div className="label-row">
              <span className="banner-picker-title">Capa de fundo a partir das suas obras</span>
              {valores.bannerUrl && (
                <button type="button" className="synopsis-toggle" onClick={() => alterar({ bannerUrl: "" })}>
                  Usar fundo automático
                </button>
              )}
            </div>
            <div className="banner-picker-grid">
              {obras.map((obra) => {
                const capa = obra.coverUrl!;
                return (
                  <button
                    key={obra.id}
                    type="button"
                    className={`banner-thumb${valores.bannerUrl === capa ? " is-selected" : ""}`}
                    onClick={() => alterar({ bannerUrl: capa })}
                    title={`Usar "${obra.title}" como fundo do perfil`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={miniaturaCapa(capa, 120) ?? capa} alt={obra.title} />
                    <span>{obra.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label>
          Link de uma capa personalizada (opcional)
          <input
            type="url"
            value={valores.bannerUrl}
            maxLength={500}
            placeholder="https://exemplo.com/minha-capa.jpg"
            onChange={(event) => alterar({ bannerUrl: event.target.value })}
          />
          <small>Em branco, o fundo usa a capa da sua obra favorita.</small>
        </label>

      </div>

      <RodapeSecao
        alterado={alterado}
        salvando={secao.salvando}
        erro={secao.erro}
        aviso={secao.aviso}
        bloqueio={profile ? null : "Escolha um nome de usuário na seção Perfil primeiro."}
        onSalvar={salvar}
        onDescartar={secao.descartar}
      />
    </section>
  );
}
