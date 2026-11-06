import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { AutenticacaoOpcionalGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioOpcional } from "../../comum/autenticacao/usuario-auth.decorator";
import { CatalogoService } from "./catalogo.service";

@Controller("catalogo")
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  // Publico; com login, inclui conteudo +18 se a pessoa liberou no perfil.
  @UseGuards(AutenticacaoOpcionalGuard)
  @Get()
  async listar(
    @Query("q") q?: string,
    @Query("type") type?: string,
    @Query("genre") genre?: string,
    @Query("lang") lang?: string,
    @UsuarioOpcional() usuario?: UsuarioAuth
  ) {
    const incluirAdulto = await this.catalogoService.permiteAdulto(usuario?.id);
    return this.catalogoService.listar(q, type, genre, lang, incluirAdulto);
  }

  @Get(":id")
  buscarPorId(@Param("id") id: string, @Query("lang") lang?: string) {
    return this.catalogoService.buscarPorId(id, lang);
  }

  @Get(":id/extras")
  extras(@Param("id") id: string) {
    return this.catalogoService.extras(id);
  }

  @Get(":id/temporadas")
  listarTemporadas(@Param("id") id: string) {
    return this.catalogoService.listarTemporadas(id);
  }

  @Get(":id/temporadas/:temporada")
  listarEpisodios(@Param("id") id: string, @Param("temporada", ParseIntPipe) temporada: number) {
    return this.catalogoService.listarEpisodios(id, temporada);
  }

  @Get(":id/temporadas/:temporada/episodios/:episodio/creditos")
  creditosEpisodio(
    @Param("id") id: string,
    @Param("temporada", ParseIntPipe) temporada: number,
    @Param("episodio", ParseIntPipe) episodio: number
  ) {
    return this.catalogoService.creditosEpisodio(id, temporada, episodio);
  }

  @UseGuards(AutenticacaoOpcionalGuard)
  @Get(":id/relacionados")
  async relacionados(@Param("id") id: string, @UsuarioOpcional() usuario?: UsuarioAuth) {
    return this.catalogoService.relacionados(id, await this.catalogoService.permiteAdulto(usuario?.id));
  }

  @Get(":id/capas")
  capas(@Param("id") id: string) {
    return this.catalogoService.capas(id);
  }

  @Get(":id/creditos")
  creditosObra(@Param("id") id: string) {
    return this.catalogoService.creditosObra(id);
  }
}
