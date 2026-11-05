import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { AvaliarEpisodioDto } from "./dto/avaliar-episodio.dto";
import { DefinirVezesEpisodioDto } from "./dto/definir-vezes-episodio.dto";
import { MarcarEpisodiosDto } from "./dto/marcar-episodios.dto";
import { SalvarTrackingDto } from "./dto/salvar-tracking.dto";
import { TrackingService } from "./tracking.service";

@UseGuards(SupabaseAuthGuard)
@Controller("tracking")
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  listar(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.trackingService.listar(usuario.id);
  }

  @Get("items/:mediaItemId")
  buscar(@UsuarioLogado() usuario: UsuarioAuth, @Param("mediaItemId") mediaItemId: string) {
    return this.trackingService.buscar(usuario.id, mediaItemId);
  }

  @Post("items/:mediaItemId")
  salvar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: SalvarTrackingDto
  ) {
    return this.trackingService.salvar(usuario.id, mediaItemId, payload);
  }

  @Put("items/:mediaItemId")
  atualizar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: SalvarTrackingDto
  ) {
    return this.trackingService.salvar(usuario.id, mediaItemId, payload);
  }

  @Delete("items/:mediaItemId")
  remover(@UsuarioLogado() usuario: UsuarioAuth, @Param("mediaItemId") mediaItemId: string) {
    return this.trackingService.remover(usuario.id, mediaItemId);
  }

  @Get("items/:mediaItemId/episodios")
  listarEpisodios(@UsuarioLogado() usuario: UsuarioAuth, @Param("mediaItemId") mediaItemId: string) {
    return this.trackingService.listarEpisodios(usuario.id, mediaItemId);
  }

  @Put("items/:mediaItemId/episodios")
  marcarEpisodios(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: MarcarEpisodiosDto
  ) {
    return this.trackingService.marcarEpisodios(usuario.id, mediaItemId, payload);
  }

  @Patch("items/:mediaItemId/episodios")
  avaliarEpisodio(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: AvaliarEpisodioDto
  ) {
    return this.trackingService.avaliarEpisodio(usuario.id, mediaItemId, payload);
  }

  @Put("items/:mediaItemId/episodios/vezes")
  definirVezesEpisodio(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: DefinirVezesEpisodioDto
  ) {
    return this.trackingService.definirVezesEpisodio(usuario.id, mediaItemId, payload);
  }

  @Get("items/:mediaItemId/destaques-amigos")
  destaquesAmigos(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Query("season") season?: string
  ) {
    const seasonNumber = season !== undefined && season !== "" ? parseInt(season, 10) : undefined;
    return this.trackingService.destaquesAmigos(usuario.id, mediaItemId, Number.isNaN(seasonNumber) ? undefined : seasonNumber);
  }
}
