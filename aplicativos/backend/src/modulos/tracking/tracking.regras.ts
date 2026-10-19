import { StatusTracking } from "./dto/salvar-tracking.dto";

// Porcentagem de episodios assistidos, limitada a 0..100.
export function calcularProgresso(assistidos: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((assistidos / total) * 100)));
}

// Status resultante depois de marcar episodios. Pausado e abandonado so mudam
// por escolha explicita do usuario, exceto quando a serie e concluida.
export function statusAposEpisodios(atual: StatusTracking | undefined, progresso: number): StatusTracking {
  if (progresso >= 100) {
    return "COMPLETED";
  }
  if (atual === "PAUSED" || atual === "DROPPED") {
    return atual;
  }
  return progresso > 0 ? "WATCHING" : (atual ?? "WANT");
}

// Ao concluir, o progresso vai para 100%.
export function normalizarAlteracao<T extends { status?: StatusTracking; progress?: number }>(payload: T): T {
  if (payload.status === "COMPLETED" && payload.progress === undefined) {
    return { ...payload, progress: 100 };
  }
  return payload;
}
