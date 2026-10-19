import { Activity, getStatusLabel } from "./api";

// Frase da atividade, sem o nome de quem fez e sem o titulo do item.
export function descreverAtividade(atividade: Pick<Activity, "type" | "data" | "item">) {
  const { data } = atividade;
  const tipo = atividade.item?.type;

  switch (atividade.type) {
    case "STATUS":
      return data.status ? `marcou como “${getStatusLabel(data.status, tipo)}”` : "atualizou";
    case "RATING":
      return `deu ${data.rating} ${data.rating === 1 ? "estrela" : "estrelas"} para`;
    case "COMMENT":
      return "comentou em";
    case "FAVORITE":
      return "favoritou";
    case "EPISODES": {
      const qtd = data.count ?? 1;
      const temporada = data.season ? ` da T${data.season}` : "";
      return `assistiu ${qtd} ${qtd === 1 ? "episódio" : "episódios"}${temporada} de`;
    }
  }
}

// "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data.
export function tempoRelativo(iso: string, agora = new Date()) {
  const segundos = Math.max(0, (agora.getTime() - new Date(iso).getTime()) / 1000);

  if (segundos < 60) {
    return "agora";
  }
  if (segundos < 3600) {
    return `há ${Math.floor(segundos / 60)} min`;
  }
  if (segundos < 86400) {
    return `há ${Math.floor(segundos / 3600)} h`;
  }
  const dias = Math.floor(segundos / 86400);
  if (dias < 7) {
    return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  }
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(iso));
}
