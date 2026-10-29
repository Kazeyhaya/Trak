import { Module } from "@nestjs/common";
import { CatalogoController } from "./catalogo.controller";
import { CatalogoService } from "./catalogo.service";
import { GoogleBooksService } from "./google-books.service";
import { HardcoverService } from "./hardcover.service";

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService, GoogleBooksService, HardcoverService],
  exports: [CatalogoService, GoogleBooksService, HardcoverService]
})
export class CatalogoModule {}
