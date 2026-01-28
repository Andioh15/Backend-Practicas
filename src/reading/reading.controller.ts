import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReadingService } from './reading.service';
import { Readings } from '../entities/readings.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Controller('reading')
export class ReadingController {
  // Mapa para controlar el tiempo de guardado por CADA sensor individualmente
  private lastSavedTimes = new Map<number, number>();
  
  // 10 minutos en milisegundos
  private readonly SAVE_INTERVAL = 10 * 60 * 1000;

  constructor(private readonly readingService: ReadingService) {}

  // ==========================================
  // 📡 MQTT (Desde el ESP32)
  // ==========================================
  @MessagePattern('sensores/data') 
  async handleSensorData(@Payload() data: any) {
    const now = Date.now();

    // 1. Parseo seguro del JSON que llega del ESP32
    let payload = data;
    if (typeof data === 'string') {
        try {
            payload = JSON.parse(data);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            return;
        }
    }

    // 2. Validar que tengamos el ID del sensor
    if (!payload.sensor_id) return;

    // 3. Verificar si ya pasaron 10 minutos para ESTE sensor específico
    const lastTime = this.lastSavedTimes.get(payload.sensor_id) || 0;

    if (now - lastTime < this.SAVE_INTERVAL) {
      // Si no han pasado 10 min, ignoramos el dato y no hacemos nada
      return; 
    }

    // 4. Si pasó el tiempo, actualizamos el reloj y guardamos
    console.log(`✅ [MQTT] Guardando dato del Sensor ${payload.sensor_id}: ${payload.value}`);
    this.lastSavedTimes.set(payload.sensor_id, now);
    
    // Llamamos al servicio para insertar en la DB "readings"
    return this.readingService.create(payload);
  }

  // ==========================================
  // 🌐 HTTP (API REST existente)
  // ==========================================

  @Get()
  findAll(): Promise<Readings[]> {
    return this.readingService.findAll();
  }

  @Post()
  create(@Body() dto: CreateReadingDto): Promise<Readings> {
    return this.readingService.create(dto);
  }

  @Get('summary-db')
  getAverageSummaryFromDB() {
    return this.readingService.getAverageSummaryFromDB();
  }
}