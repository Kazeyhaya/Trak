import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { CatalogoService } from "./catalogo.service";

@Controller("catalogo")
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  listar(
    @Query("q") q?: string,
    @Query("type") type?: string,
    @Query("genre") genre?: string
  ) {
    return this.catalogoService.listar(q, type, genre);
  }

  @Get(":id")
  buscarPorId(@Param("id") id: string) {
    return this.catalogoService.buscarPorId(id);
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

  @Get(":id/relacionados")
  relacionados(@Param("id") id: string) {
    return this.catalogoService.relacionados(id);
  }
}
