import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Response } from 'express';
import { ReadingService } from './reading.service';
import { ReportsService } from '../reports/reports.service';
import { Readings } from '../entities/readings.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';
import { ExportReadingsDto } from '../reports/dtos/export-readings.dto';

@Controller('reading')
export class ReadingController {
  // Mapa para controlar el tiempo de guardado por CADA sensor individualmente
  private lastSavedTimes = new Map<number, number>();
  
  // 10 minutos en milisegundos (Anti-spam para MQTT)
  private readonly SAVE_INTERVAL = 10 * 60 * 1000;

  constructor(
    private readonly readingService: ReadingService,
    // Inyectamos ReportsService para usar la generación de CSV
    private readonly reportsService: ReportsService,
  ) {}

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
  @Get('solar/sync-test')
  async forceSolarSync() {
    await this.readingService.syncSolarData();
    return { message: '✅ Sincronización manual ejecutada. Revisa la consola del servidor.' };
  }

  // 2. DATOS PARA EL GRÁFICO (Curva Solar)
  @Get('solar/detail')
  getSolarDetail() {
    return this.readingService.getSolarDetailLocal();
  }

  // 3. TARJETAS DE RESUMEN (Energía/Dinero Hoy y Mes)
  @Get('solar/cards')
  getSolarCards() {
    return this.readingService.getSolarCardsSummary();
  }

  // 4. NUEVO ENDPOINT: Impacto Ecológico Total
  @Get('solar/impact')
  getSolarImpact() {
    return this.readingService.getSolarEcoImpact();
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

  // Historial para Gráficos
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

  // ==========================================
  // 📥 EXPORTAR CSV (CORREGIDO)
  // ==========================================
  @Get('export-csv')
  async exportCsv(@Query() query: ExportReadingsDto, @Res() res: any) { // 👈 Usamos 'any' para evitar conflictos de tipo
    // 1. Generar el CSV usando el servicio de REPORTES
    const csvData = await this.readingService.generateCsvReport(query);

    // 2. Configurar headers (Usamos .header en lugar de .setHeader para máxima compatibilidad)
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename=reporte_${query.startDate}_${query.endDate}.csv`);
    
    // 3. Enviar respuesta
    res.send(csvData);
  }

  @Get('summary')
  async getSummary() {
    return this.readingService.getSummary();
  }

  // ==========================================
  // 🧠 Endpoint para preguntar a Gemini
  // ==========================================
  @Post('ask-ai')
  async chat(@Body() body: any) {
  // 1. Obtener el último mensaje del usuario
  const lastMessage = body?.messages?.at(-1);
  const userMessage =
  lastMessage?.content ||
  lastMessage?.parts?.find(p => p.type === "text")?.text;


  if (!userMessage) {
    return {
      messages: [
        {
          role: "assistant",
          content: "No recibí ningún mensaje."
        }
      ]
    };
  }

  // 2. Llamar a Gemini
  const result = await this.readingService.askGemini(userMessage);

  if (!result.success) {
    return {
      role: "assistant",
      parts: [{ type: "text", text: "No pude conectar con la IA en este momento." }]
    };
  }

  return {
    role: "assistant",
    parts: [{ type: "text", text: result.answer }]
  };
}

}