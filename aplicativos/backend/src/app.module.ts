import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SupabaseModule } from "./comum/supabase/supabase.module";
import { TurnstileModule } from "./comum/turnstile/turnstile.module";
import { CatalogoModule } from "./modulos/catalogo/catalogo.module";
import { ComentariosModule } from "./modulos/comentarios/comentarios.module";
import { FavoritosModule } from "./modulos/favoritos/favoritos.module";
import { ImportacaoModule } from "./modulos/importacao/importacao.module";
import { ModeracaoModule } from "./modulos/moderacao/moderacao.module";
import { RecomendacoesModule } from "./modulos/recomendacoes/recomendacoes.module";
import { SocialModule } from "./modulos/social/social.module";
import { TrackingModule } from "./modulos/tracking/tracking.module";

@Module({
  imports: [
    // Limite padrao por IP; rotas sensiveis definem limites menores com @Throttle.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    TurnstileModule,
    CatalogoModule,
    ComentariosModule,
    FavoritosModule,
    TrackingModule,
    SocialModule,
    RecomendacoesModule,
    ImportacaoModule,
    ModeracaoModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
