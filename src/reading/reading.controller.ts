import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
  // 📡 MQTT (Desde el ESP32) - LÓGICA INTACTA
  // ==========================================
  @MessagePattern('sensores/data') 
  async handleSensorData(@Payload() data: any) {
    const now = Date.now();

    // 1. Parseo seguro del JSON
    let payload = data;
    if (typeof data === 'string') {
        try {
            payload = JSON.parse(data);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            return;
        }
    }

    // 2. Validar ID del sensor
    if (!payload.sensor_id) return;

    // 3. Verificar intervalo de 10 minutos
    const lastTime = this.lastSavedTimes.get(payload.sensor_id) || 0;

    if (now - lastTime < this.SAVE_INTERVAL) {
      return; // Ignorar si es muy pronto
    }

    // 4. Guardar y actualizar reloj
    console.log(`✅ [MQTT] Guardando dato del Sensor ${payload.sensor_id}: ${payload.value}`);
    this.lastSavedTimes.set(payload.sensor_id, now);
    
    return this.readingService.create(payload);
  }

  // ==========================================
  // 🌐 HTTP - ENDPOINTS DEL DASHBOARD
  // ==========================================

  // 1. Tarjetas de Resumen (Top Cards)
  // GET /reading/summary-db
  @Get('summary-db')
  getAverageSummaryFromDB() {
    return this.readingService.getAverageSummaryFromDB();
  }

  // 2. Gráfico Principal Diario (Tendencia últimos días)
  // GET /reading/dashboard/daily-metrics?days=7
  @Get('dashboard/daily-metrics')
  getDashboardMetrics(@Query('days') days: number = 7) {
    return this.readingService.getDashboardDailyMetrics(days);
  }

  // 3. Gráficos de Análisis (Pestañas Semanal/Mensual/Anual)
  // GET /reading/analysis/campus?mode=mensual
  @Get('analysis/campus')
  getCampusAnalysis(@Query('mode') mode: string) {
    return this.readingService.getCampusAnalysis(mode);
  }

  // ==========================================
  // 🌐 HTTP - TABLA DE DATOS Y CREACIÓN
  // ==========================================

  // 4. Tabla Detallada con Filtros y Paginación
  // GET /reading?blockId=1&limit=10
  @Get()
  async findAll(
    @Query('blockId') blockId?: number,
    @Query('buildingId') buildingId?: number,
    @Query('roomId') roomId?: number,
    @Query('limit') limit: number = 25,
    @Query('offset') offset: number = 0,
  ) {
    return this.readingService.findAllPaginated(blockId, buildingId, roomId, limit, offset);
  }

  // 5. Creación manual (Postman / Pruebas)
  @Post()
  create(@Body() dto: CreateReadingDto): Promise<Readings> {
    return this.readingService.create(dto);
  }
}