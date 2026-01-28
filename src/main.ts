// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. Crear la aplicación con Fastify
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(), // Asegúrate de instanciar el adaptador
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  // 2. Configurar el microservicio MQTT (Aplicación Híbrida)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: 'mqtt://34.174.85.207:1883', // Tu IP del broker
      // subscribeOptions: { qos: 1 }, // Opcional: configuración de calidad de servicio
    },
  });

  // 3. Iniciar Microservicios y la API REST
  // startAllMicroservices es esencial para que NestJS empiece a escuchar los tópicos de MQTT
  await app.startAllMicroservices();
  
  // Escuchamos en el puerto 8080 y en todas las interfaces de red (0.0.0.0)
  await app.listen(8080, '0.0.0.0');

  console.log(`---`);
  console.log(`🚀 API REST corriendo en: http://localhost:8080`);
  console.log(`📡 Escuchando microservicio MQTT en: 34.174.85.207:1883`);
  console.log(`---`);
}
bootstrap();