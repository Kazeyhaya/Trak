import { Module } from "@nestjs/common";
import { FavoritosController } from "./favoritos.controller";
import { FavoritosService } from "./favoritos.service";

@Module({
  controllers: [FavoritosController],
  providers: [FavoritosService]
})
export class FavoritosModule {}
