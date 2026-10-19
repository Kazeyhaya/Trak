import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { TrackingModule } from "../tracking/tracking.module";
import { ImportacaoController } from "./importacao.controller";
import { ImportacaoService } from "./importacao.service";

@Module({
  imports: [CatalogoModule, TrackingModule],
  controllers: [ImportacaoController],
  providers: [ImportacaoService]
})
export class ImportacaoModule {}
