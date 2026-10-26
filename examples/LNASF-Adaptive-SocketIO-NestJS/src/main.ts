import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { getAllowedOrigins } from "./chat-config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: getAllowedOrigins(), credentials: true });
  const port = Number.parseInt(process.env.PORT ?? "5000", 10);
  await app.listen(port);
  console.log(`NestJS Socket.IO chat backend listening on port ${port}`);
}

void bootstrap();
