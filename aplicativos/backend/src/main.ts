import { existsSync } from "node:fs";
import { resolve } from "node:path";

// O .env precisa ser carregado antes de qualquer modulo ler process.env.
const envFilePath = resolve(process.cwd(), ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { origensPermitidas } from "./comum/cors";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigins = origensPermitidas(process.env.CORS_ORIGIN);

  // Atras de um proxy (Render, Railway, Fly...), o IP real vem do X-Forwarded-For.
  // Sem isso o rate limit trataria todos os usuarios como um so IP.
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  }

  app.use(helmet());
  // Arquivos de importacao (Letterboxd/Trakt) podem passar do limite padrao de 100kb.
  app.useBodyParser("json", { limit: "6mb" });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: corsOrigins });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
  // Aparece nos logs do servidor (ex.: Render) para conferir a configuracao de CORS.
  new Logger("CORS").log(`Origens liberadas: ${corsOrigins.map(String).join(", ")}`);
}

void bootstrap();
