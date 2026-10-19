import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { TrackingModule } from "../tracking/tracking.module";
import { RecomendacoesController } from "./recomendacoes.controller";
import { RecomendacoesService } from "./recomendacoes.service";

@Module({
  imports: [CatalogoModule, TrackingModule],
  controllers: [RecomendacoesController],
  providers: [RecomendacoesService]
})
export class RecomendacoesModule {}
