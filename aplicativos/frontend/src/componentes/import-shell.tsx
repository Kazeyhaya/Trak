"use client";

import { useState } from "react";

import { SiteHeader } from "./site-header";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import {
  errorMessage,
  importLetterboxd,
  importSteam,
  importTrakt,
  ImportResult,
  LetterboxdList
} from "../lib/api";
import { listaPeloNome, validarArquivo } from "../lib/importacao";

type Fonte = "letterboxd" | "trakt" | "steam";

export function ImportShell() {
  const [running, setRunning] = useState<Fonte | null>(null);
  const [result, setResult] = useState<{ fonte: Fonte; data: ImportResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState<LetterboxdList>("watched");
  const [letterboxdFile, setLetterboxdFile] = useState<File | null>(null);
  const [traktFile, setTraktFile] = useState<File | null>(null);
  const [steamProfile, setSteamProfile] = useState("");

  async function run(fonte: Fonte, tarefa: () => Promise<ImportResult>) {
    setRunning(fonte);
    setError(null);
    setResult(null);
    try {
      setResult({ fonte, data: await tarefa() });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(null);
    }
  }

  function escolherArquivo(arquivo: File | undefined, extensoes: string[], definir: (file: File | null) => void) {
    setError(null);
    if (!arquivo) {
      definir(null);
      return;
    }
    const problema = validarArquivo(arquivo, extensoes);
    if (problema) {
      setError(problema);
      definir(null);
      return;
    }
    definir(arquivo);
  }

  const ocupado = running !== null;

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Importe seu histórico</h1>
          <p>
            Traga o que você já registrou em outros apps. Itens que já estão no seu Trak não são alterados. Até 500
            itens por importação.
          </p>
        </div>
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <UiCard className="import-card import-result" as="div">
          <strong role="status">
            Importação concluída: {result.data.imported} de {result.data.total} itens adicionados.
          </strong>
          {result.data.skipped > 0 && <p>{result.data.skipped} já estavam no seu Trak (ou passaram do limite).</p>}
          {result.data.notFound.length > 0 && (
            <details>
              <summary>{result.data.notFound.length} não encontrados</summary>
              <ul>
                {result.data.notFound.map((titulo) => (
                  <li key={titulo}>{titulo}</li>
                ))}
              </ul>
            </details>
          )}
        </UiCard>
      )}

      <section className="import-grid">
        <UiCard className="import-card">
          <h2>Letterboxd</h2>
          <p>
            Em letterboxd.com, vá em Settings → Data → Export your data. Descompacte o .zip e envie o watched.csv,
            ratings.csv, diary.csv ou watchlist.csv.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Arquivo CSV do Letterboxd"
            onChange={(event) =>
              escolherArquivo(event.target.files?.[0], [".csv"], (file) => {
                setLetterboxdFile(file);
                if (file) {
                  setLista(listaPeloNome(file.name));
                }
              })
            }
          />
          <label className="field-stack">
            Tipo de lista
            <select value={lista} onChange={(event) => setLista(event.target.value as LetterboxdList)}>
              <option value="watched">Assistidos (concluído)</option>
              <option value="ratings">Avaliações (concluído + nota)</option>
              <option value="diary">Diário (concluído + nota)</option>
              <option value="watchlist">Watchlist (quero ver)</option>
            </select>
          </label>
          <UiButton
            disabled={ocupado || !letterboxdFile}
            onClick={() => letterboxdFile && run("letterboxd", async () => importLetterboxd(await letterboxdFile.text(), lista))}
          >
            {running === "letterboxd" ? "Importando…" : "Importar do Letterboxd"}
          </UiButton>
        </UiCard>

        <UiCard className="import-card">
          <h2>Trakt</h2>
          <p>
            Em trakt.tv, vá em Settings → Data → Export. Envie um dos arquivos JSON: watched-movies, watched-shows,
            ratings-movies, ratings-shows ou watchlist. Os episódios assistidos também são importados.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Arquivo JSON do Trakt"
            onChange={(event) => escolherArquivo(event.target.files?.[0], [".json"], setTraktFile)}
          />
          <UiButton
            disabled={ocupado || !traktFile}
            onClick={() => traktFile && run("trakt", async () => importTrakt(await traktFile.text()))}
          >
            {running === "trakt" ? "Importando…" : "Importar do Trakt"}
          </UiButton>
        </UiCard>

        <UiCard className="import-card">
          <h2>Steam</h2>
          <p>
            Informe a URL do seu perfil ou o SteamID64. Em Privacidade, os “Detalhes do jogo” precisam estar públicos.
            Jogos com tempo de jogo entram como “Jogando”; os demais, como “Quero jogar”.
          </p>
          <label className="field-stack">
            Perfil da Steam
            <input
              type="text"
              value={steamProfile}
              placeholder="https://steamcommunity.com/id/seu_nome"
              onChange={(event) => setSteamProfile(event.target.value)}
            />
          </label>
          <UiButton
            disabled={ocupado || steamProfile.trim().length < 2}
            onClick={() => run("steam", () => importSteam(steamProfile.trim()))}
          >
            {running === "steam" ? "Importando…" : "Importar da Steam"}
          </UiButton>
        </UiCard>
      </section>
    </main>
  );
}
