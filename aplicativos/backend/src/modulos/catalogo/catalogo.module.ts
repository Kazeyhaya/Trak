import { Module } from "@nestjs/common";
import { CatalogoController } from "./catalogo.controller";
import { CatalogoService } from "./catalogo.service";
import { GoogleBooksService } from "./google-books.service";

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService, GoogleBooksService],
  exports: [CatalogoService, GoogleBooksService]
})
export class CatalogoModule {}
