import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { AtividadesService } from "./atividades.service";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [CatalogoModule, NotificacoesModule],
  controllers: [SocialController],
  providers: [SocialService, AtividadesService],
  exports: [AtividadesService]
})
export class SocialModule {}
