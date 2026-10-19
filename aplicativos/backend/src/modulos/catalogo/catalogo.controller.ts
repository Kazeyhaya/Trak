import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogoService } from "./catalogo.service";

@Controller("catalogo")
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  listar(@Query("q") q?: string, @Query("type") type?: string) {
    return this.catalogoService.listar(q, type);
  }

  @Get(":id")
  buscarPorId(@Param("id") id: string) {
    return this.catalogoService.buscarPorId(id);
  }
}
