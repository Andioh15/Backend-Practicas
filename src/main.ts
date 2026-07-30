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
      url: `mqtt://${process.env.MOSQUITTO_HOST}:${process.env.MOSQUITTO_PORT}`, // Tu IP del broker
      // subscribeOptions: { qos: 1 }, // Opcional: configuración de calidad de servicio
    },
  });

  // 3. Iniciar Microservicios y la API REST
  // startAllMicroservices es esencial para que NestJS empiece a escuchar los tópicos de MQTT
  await app.startAllMicroservices();
  // Habilitar CORS para que el frontend pueda hacer peticiones desde el navegador
  app.enableCors();

  // Escuchamos en el puerto 8080 en la dirección '::' para aceptar conexiones IPv6 y IPv4
  // (evita errores de ECONNREFUSED cuando el cliente resuelve localhost a ::1)
  await app.listen(8080, '::');

  console.log(`---`);
  console.log(`🚀 API REST corriendo en: http://localhost:8080`);
  console.log(`📡 Escuchando microservicio MQTT en: ${process.env.MOSQUITTO_HOST}`);
  console.log(`---`);
}
bootstrap();