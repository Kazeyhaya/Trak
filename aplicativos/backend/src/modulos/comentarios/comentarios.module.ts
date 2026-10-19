import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { ComentariosController } from "./comentarios.controller";
import { ComentariosService } from "./comentarios.service";

@Module({
  imports: [CatalogoModule],
  controllers: [ComentariosController],
  providers: [ComentariosService],
  exports: [ComentariosService]
})
export class ComentariosModule {}
