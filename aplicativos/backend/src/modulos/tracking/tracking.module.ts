import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";

@Module({
  imports: [CatalogoModule],
  controllers: [TrackingController],
  providers: [TrackingService]
})
export class TrackingModule {}
