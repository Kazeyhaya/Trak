import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { ComentariosModule } from "../comentarios/comentarios.module";
import { ModeracaoController } from "./moderacao.controller";
import { ModeracaoService } from "./moderacao.service";

@Module({
  imports: [CatalogoModule, ComentariosModule],
  controllers: [ModeracaoController],
  providers: [ModeracaoService]
})
export class ModeracaoModule {}
