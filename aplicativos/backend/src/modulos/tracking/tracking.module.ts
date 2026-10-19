import { Module } from "@nestjs/common";
import { CatalogoModule } from "../catalogo/catalogo.module";
import { SocialModule } from "../social/social.module";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";

@Module({
  imports: [CatalogoModule, SocialModule],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService]
})
export class TrackingModule {}
