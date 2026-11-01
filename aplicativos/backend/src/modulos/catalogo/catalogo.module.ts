import { Module } from "@nestjs/common";
import { CatalogoController } from "./catalogo.controller";
import { CatalogoService } from "./catalogo.service";
import { GoogleBooksService } from "./google-books.service";
import { HardcoverService } from "./hardcover.service";
import { IgdbService } from "./igdb.service";

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService, GoogleBooksService, HardcoverService, IgdbService],
  exports: [CatalogoService, GoogleBooksService, HardcoverService, IgdbService]
})
export class CatalogoModule {}
