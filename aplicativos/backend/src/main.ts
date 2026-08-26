import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envFilePath = resolve(process.cwd(), ".env");
  if (existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" });
  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
