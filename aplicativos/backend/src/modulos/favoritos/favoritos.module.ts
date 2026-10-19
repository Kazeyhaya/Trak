import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { SocialModule } from "../social/social.module";
import { FavoritosController } from "./favoritos.controller";
import { FavoritosService } from "./favoritos.service";

@Module({
  imports: [CatalogoModule, SocialModule],
  controllers: [FavoritosController],
  providers: [FavoritosService]
})
export class FavoritosModule {}
