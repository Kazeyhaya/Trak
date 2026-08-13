import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SupabaseModule } from "./comum/supabase/supabase.module";
import { CatalogoModule } from "./modulos/catalogo/catalogo.module";
import { ComentariosModule } from "./modulos/comentarios/comentarios.module";
import { FavoritosModule } from "./modulos/favoritos/favoritos.module";
import { TrackingModule } from "./modulos/tracking/tracking.module";

@Module({
  imports: [SupabaseModule, CatalogoModule, ComentariosModule, FavoritosModule, TrackingModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
