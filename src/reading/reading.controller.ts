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
    let payload = data;

    if (typeof data === 'string') {
        try {
            payload = JSON.parse(data);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            return;
        }
    }

    if (!payload.sensor_id) return;

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

  // 1. FORZAR SINCRONIZACIÓN (Botón de pánico para pruebas)
  // Llama a esto desde el navegador para descargar datos de VCOM a tu BD ahora mismo
  @Get('solar/sync-test')
  async forceSolarSync() {
    await this.readingService.syncSolarData();
    return { message: 'Sincronización manual ejecutada. Revisa la consola del servidor para ver los logs verdes.' };
  }

  // 2. DATOS PARA EL FRONTEND (Gráfico + KPIs)
  // Lee de tu Base de Datos local (rápido y seguro)
  @Get('solar/detail')
  getSolarDetail() {
    return this.readingService.getSolarDetailLocal();
  }

  // ==========================================
  // 🌐 HTTP - ENDPOINTS DEL DASHBOARD
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

  // Tabla Principal (Dashboard Home)
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

  // Tabla Filtrada (Para páginas de Temp, CO2, Humedad)
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

  // Conteo Total (Para la paginación de Temp, CO2, Humedad)
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
  // 🌐 HTTP - CREACIÓN MANUAL
  // ==========================================
  @Post()
  create(@Body() dto: CreateReadingDto): Promise<Readings> {
    return this.readingService.create(dto);
  }

  // 3. TARJETAS DE RESUMEN (Energía/Dinero Hoy y Mes)
  @Get('solar/cards')
  getSolarCards() {
    return this.readingService.getSolarCardsSummary();
  }
}