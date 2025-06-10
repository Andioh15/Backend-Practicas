// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  // Creamos la aplicación con FastifyAdapter:
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  await app.listen(8080, '0.0.0.0');
  console.log(`Servidor corriendo en http://localhost:8080`);
}
bootstrap();
