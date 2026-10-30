import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { SocialModule } from "../social/social.module";
import { ComentariosController } from "./comentarios.controller";
import { ComentariosService } from "./comentarios.service";

@Module({
  imports: [CatalogoModule, SocialModule, NotificacoesModule],
  controllers: [ComentariosController],
  providers: [ComentariosService],
  exports: [ComentariosService]
})
export class ComentariosModule {}
