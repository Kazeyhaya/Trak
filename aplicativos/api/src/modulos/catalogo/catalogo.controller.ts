import { Controller, Get, Param } from "@nestjs/common";
import { CatalogoService } from "./catalogo.service";

@Controller("catalogo")
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  listar() {
    return this.catalogoService.listar();
  }

  @Get(":id")
  buscarPorId(@Param("id") id: string) {
    return this.catalogoService.buscarPorId(id);
  }
}
