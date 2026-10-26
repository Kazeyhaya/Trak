import { Module } from "@nestjs/common";
import { TurnstileController } from "./turnstile.controller";
import { TurnstileGuard } from "./turnstile.guard";
import { TurnstileService } from "./turnstile.service";

@Module({
  controllers: [TurnstileController],
  providers: [TurnstileService, TurnstileGuard],
  exports: [TurnstileService, TurnstileGuard]
})
export class TurnstileModule {}
