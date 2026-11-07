import { json, request } from "./base";

export type ImportResult = { total: number; imported: number; skipped: number; notFound: string[] };

export type LetterboxdList = "watched" | "ratings" | "diary" | "watchlist";

// A importacao roda em segundo plano: o envio devolve a tarefa, e o site acompanha o
// progresso por getImportTask ate o status sair de PROCESSANDO.
export type ImportTask = {
  id: string;
  fonte: "letterboxd" | "trakt" | "steam";
  chave: string;
  status: "PROCESSANDO" | "CONCLUIDA" | "FALHOU";
  total: number;
  processados: number;
  resultado: ImportResult | null;
  erro: string | null;
  createdAt: string;
};

// A API antiga respondia o resultado direto; vira uma tarefa ja concluida.
export function comoTarefa(resposta: ImportTask | ImportResult, fonte: ImportTask["fonte"]): ImportTask {
  if ("status" in resposta) {
    return resposta;
  }
  return {
    id: "",
    fonte,
    chave: fonte,
    status: "CONCLUIDA",
    total: resposta.total,
    processados: resposta.total,
    resultado: resposta,
    erro: null,
    createdAt: new Date().toISOString()
  };
}

export const importLetterboxd = async (csv: string, lista: LetterboxdList) =>
  comoTarefa(
    await request<ImportTask | ImportResult>("/importacao/letterboxd", { method: "POST", body: json({ csv, lista }) }),
    "letterboxd"
  );

export const importTrakt = async (fileContent: string) =>
  comoTarefa(
    await request<ImportTask | ImportResult>("/importacao/trakt", { method: "POST", body: json({ json: fileContent }) }),
    "trakt"
  );

export const importSteam = async (perfil: string) =>
  comoTarefa(await request<ImportTask | ImportResult>("/importacao/steam", { method: "POST", body: json({ perfil }) }), "steam");

export const getImportTask = (id: string) => request<ImportTask>(`/importacao/tarefas/${encodeURIComponent(id)}`);

export const getImportTasks = () => request<ImportTask[]>("/importacao/tarefas");
