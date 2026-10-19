import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { FavoritosController } from "./favoritos.controller";
import { FavoritosService } from "./favoritos.service";

@Module({
  imports: [CatalogoModule],
  controllers: [FavoritosController],
  providers: [FavoritosService]
})
export class FavoritosModule {}
