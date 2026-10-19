import { existsSync } from "node:fs";
import { resolve } from "node:path";

// O .env precisa ser carregado antes de qualquer modulo ler process.env.
const envFilePath = resolve(process.cwd(), ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: corsOrigins });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
