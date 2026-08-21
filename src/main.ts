import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. Crear la aplicación con Fastify
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(), 
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  // Habilitar CORS para que el frontend en Next.js pueda consultar tu API
  app.enableCors();

  // 2. Configurar el microservicio MQTT condicionalmente (Interruptor)
  if (process.env.ENABLE_MQTT === 'true') {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: `mqtt://${process.env.MOSQUITTO_HOST}:${process.env.MOSQUITTO_PORT}`,
      },
    });

    // Iniciar Microservicios SOLO si MQTT está activo
    await app.startAllMicroservices();
    console.log(`📡 Microservicio MQTT Conectado y Escuchando en: ${process.env.MOSQUITTO_HOST}`);
  } else {
    console.log(`⚠️ Microservicio MQTT Apagado (Modo Desarrollo local)`);
  }

  // 3. Iniciar la API REST
  // Toma el puerto de la variable de entorno o usa 8080 si no existe
  const port = process.env.PORT || 8080;

  // Escuchamos en la dirección '::' para aceptar conexiones IPv6 y IPv4 con Fastify
  await app.listen(port, '0.0.0.0');

  console.log(`---`);
  console.log(`🚀 API REST con Fastify corriendo en: http://localhost:${port}`);
  console.log(`---`);
}
bootstrap();