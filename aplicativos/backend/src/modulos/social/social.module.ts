import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { AtividadesService } from "./atividades.service";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [CatalogoModule],
  controllers: [SocialController],
  providers: [SocialService, AtividadesService],
  exports: [AtividadesService]
})
export class SocialModule {}
