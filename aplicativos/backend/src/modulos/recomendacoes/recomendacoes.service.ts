import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { CatalogoService } from "../catalogo/catalogo.service";
import { TrackingService } from "../tracking/tracking.service";
import { escolherSementes, ranquear } from "./recomendacoes.regras";

const MAX_ALERTAS_VERIFICADOS = 30;

@Injectable()
export class RecomendacoesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly catalogoService: CatalogoService,
    private readonly trackingService: TrackingService
  ) {}

  async recomendacoes(authUserId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const [registros, favoritos] = await Promise.all([
      this.trackingService.listarDoUsuario(userId),
      this.supabaseService.getClient().from("Favorite").select("mediaItemId").eq("userId", userId)
    ]);

    const idsFavoritos = new Set((favoritos.data ?? []).map((f) => f.mediaItemId as string));
    const sementes = escolherSementes(registros, idsFavoritos);

    if (sementes.length === 0) {
      return { seeds: [], items: [] };
    }

    const itens = await this.catalogoService.buscarSalvos(sementes.map((s) => s.mediaItemId));
    const relacionados = await Promise.all(
      sementes.map(async (semente) => ({
        semente: itens.get(semente.mediaItemId)?.title ?? "um item da sua lista",
        itens: await this.catalogoService.relacionados(semente.mediaItemId)
      }))
    );
    const jaAcompanhados = new Set([...registros.map((r) => r.mediaItemId), ...idsFavoritos]);

    return {
      seeds: sementes.map((s) => itens.get(s.mediaItemId)?.title ?? s.mediaItemId),
      items: ranquear(relacionados, jaAcompanhados)
    };
  }

  // Novos episodios e estreias do que o usuario acompanha ou quer ver.
  async alertas(authUserId: string) {
    const userId = await this.supabaseService.resolverUserId(authUserId);
    const registros = (await this.trackingService.listarDoUsuario(userId))
      .filter((r) => r.status !== "COMPLETED" && r.status !== "DROPPED")
      .slice(0, MAX_ALERTAS_VERIFICADOS);

    const [itens, novidades] = await Promise.all([
      this.catalogoService.buscarSalvos(registros.map((r) => r.mediaItemId)),
      Promise.all(registros.map((r) => this.catalogoService.novidades(r.mediaItemId)))
    ]);

    return registros
      .flatMap((registro, indice) => {
        const novidade = novidades[indice];
        return novidade
          ? [{ ...novidade, mediaItemId: registro.mediaItemId, item: itens.get(registro.mediaItemId) ?? null }]
          : [];
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
