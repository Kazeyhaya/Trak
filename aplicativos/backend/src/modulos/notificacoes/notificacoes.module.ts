import { Module } from "@nestjs/common";
import { SupabaseModule } from "../../comum/supabase/supabase.module";
import { NotificacoesController } from "./notificacoes.controller";
import { NotificacoesService } from "./notificacoes.service";

@Module({
  imports: [SupabaseModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService],
  exports: [NotificacoesService]
})
export class NotificacoesModule {}
