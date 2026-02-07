import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReadingService } from './reading.service';
import { Readings } from '../entities/readings.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Controller('reading')
export class ReadingController {
  // Mapa para controlar el tiempo de guardado por CADA sensor individualmente
  private lastSavedTimes = new Map<number, number>();
  
  // 10 minutos en milisegundos (Anti-spam para MQTT)
  private readonly SAVE_INTERVAL = 10 * 60 * 1000;

  constructor(private readonly readingService: ReadingService) {}

  // ==========================================
  // 📡 MQTT (Desde el ESP32) - LÓGICA INTACTA
  // ==========================================
  @MessagePattern('sensores/data') 
  async handleSensorData(@Payload() data: any) {
    const now = Date.now();
    let payload = data;

    // Aseguramos que sea un objeto JSON
    if (typeof data === 'string') {
        try {
            payload = JSON.parse(data);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            return;
        }
    }

    if (!payload.sensor_id) return;

    // Lógica de "Debounce": Solo guardar 1 vez cada 10 mins por sensor
    const lastTime = this.lastSavedTimes.get(payload.sensor_id) || 0;
    if (now - lastTime < this.SAVE_INTERVAL) {
      return; 
    }

    console.log(`✅ [MQTT] Guardando dato del Sensor ${payload.sensor_id}: ${payload.value}`);
    this.lastSavedTimes.set(payload.sensor_id, now);
    
    return this.readingService.create(payload);
  }

  // ==========================================
  // ☀️ ZONA SOLAR (NUEVOS ENDPOINTS)
  // ==========================================

  // 1. FORZAR SINCRONIZACIÓN (Botón de pánico)
  // Llama a la API oficial y guarda el total en el Sensor 4
  @Get('solar/sync-test')
  async forceSolarSync() {
    await this.readingService.syncSolarData();
    return { message: '✅ Sincronización manual ejecutada. Revisa la consola del servidor.' };
  }

  // 2. DATOS PARA EL GRÁFICO (Curva Solar)
  // Lee de tu Base de Datos local (Sensor 4)
  @Get('solar/detail')
  getSolarDetail() {
    return this.readingService.getSolarDetailLocal();
  }

  // 3. TARJETAS DE RESUMEN (Energía/Dinero Hoy y Mes)
  @Get('solar/cards')
  getSolarCards() {
    return this.readingService.getSolarCardsSummary();
  }

  // ==========================================
  // 🌐 HTTP - DASHBOARD GENERAL
  // ==========================================

  @Get('summary-db')
  getAverageSummaryFromDB() {
    return this.readingService.getAverageSummaryFromDB();
  }

  @Get('dashboard/daily-metrics')
  getDashboardMetrics(@Query('days') days: number = 7) {
    return this.readingService.getDashboardDailyMetrics(days);
  }

  @Get('analysis/campus')
  getCampusAnalysis(@Query('mode') mode: string) {
    return this.readingService.getCampusAnalysis(mode);
  }

  // ==========================================
  // 🌐 HTTP - TABLAS Y PAGINACIÓN
  // ==========================================

  // Tabla Principal
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

  // Tabla Filtrada
  @Get('filter')
  async getFiltered(
    @Query('type') type: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('blockId') blockId?: number,
    @Query('buildingId') buildingId?: number,
    @Query('roomId') roomId?: number,
  ) {
    if (!type) {
      throw new Error('El parámetro "type" es obligatorio (Temperature, Humidity, CO2)');
    }
    return this.readingService.getFilteredReadings(type, page, limit, blockId, buildingId, roomId);
  }

  // Conteo Total
  @Get('filter/count')
  async getFilteredCount(
    @Query('type') type: string,
    @Query('blockId') blockId?: number,
    @Query('buildingId') buildingId?: number,
    @Query('roomId') roomId?: number,
  ) {
    if (!type) {
        throw new Error('El parámetro "type" es obligatorio');
    }
    return this.readingService.getFilteredReadingsCount(type, blockId, buildingId, roomId);
  }

  // ==========================================
  // 🛠️ CREACIÓN MANUAL (HTTP POST)
  // ==========================================
  @Post()
  create(@Body() dto: CreateReadingDto): Promise<Readings> {
    return this.readingService.create(dto);
  }

  // URL: /reading/metrics/history?type=Temperature&days=7&blockId=1
  @Get('metrics/history')
  async getMetricsHistory(
    @Query('type') type: string,
    @Query('days') days: number = 7,
    @Query('blockId') blockId?: number,
    @Query('buildingId') buildingId?: number,
    @Query('roomId') roomId?: number,
  ) {
    if (!type) throw new Error('El parámetro "type" es obligatorio');
    
    return this.readingService.getHistoryMetrics(type, days, blockId, buildingId, roomId);
  }

  // 5. NUEVO ENDPOINT: Impacto Ecológico Total
  // URL: http://localhost:8080/reading/solar/impact
  @Get('solar/impact')
  getSolarImpact() {
    return this.readingService.getSolarEcoImpact();
  }
}