import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);
  private readonly INVERTER_DB_IDS = [4]; 

  constructor(
    @InjectRepository(Readings)
    private readingRepository: Repository<Readings>,

    @InjectRepository(Sensors)
    private sensorRepository: Repository<Sensors>,

    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  // ==========================================================
  // 🧹 FUNCIÓN MÁGICA: QUITA LA ZONA HORARIA (FIX 18:00 vs 23:00)
  // ==========================================================
  private fixTimezone(data: any[]) {
    return data.map(row => {
      // Si existe reading_timestamp y es un objeto Fecha
      if (row.reading_timestamp && row.reading_timestamp instanceof Date) {
          // Convertimos a String ISO y le quitamos la 'Z' y la 'T'
          // De: "2026-02-06T23:00:00.000Z" -> A: "2026-02-06 23:00:00"
          row.reading_timestamp = row.reading_timestamp.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
      }
      // Lo mismo para local_ts si existe
      if (row.local_ts && row.local_ts instanceof Date) {
           row.local_ts = row.local_ts.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
      }
      return row;
    });
  }

  // ==========================================================
  // 📊 GRÁFICOS HISTÓRICOS
  // ==========================================================
  async getHistoryMetrics(type: string, days: number = 7, blockId?: number, buildingId?: number, roomId?: number) {
    const validTypes = ['Temperature', 'Humidity', 'CO2', 'Energy'];
    let dbType = type;
    if (type.toLowerCase() === 'solar' || type.toLowerCase() === 'energia') dbType = 'Energy';
    
    if (!validTypes.includes(dbType)) throw new Error(`Tipo inválido`);

    const rawData = await this.readingRepository.query(
        'SELECT * FROM get_daily_metrics($1, $2, $3, $4, $5)', 
        [dbType, days, blockId, buildingId, roomId]
    );

    return {
      success: true,
      type: dbType,
      days: days,
      data: rawData.map(row => ({
        date: row.chart_date,      
        value: parseFloat(row.chart_value), 
        extra: parseFloat(row.chart_extra)  
      }))
    };
  }
  
  // ==========================================================
  // 1. CREAR LECTURA (MQTT / POST)
  // ==========================================================
  async create(dto: CreateReadingDto | any): Promise<Readings> {
    // Generamos hora Ecuador restando 5h al UTC del servidor
    const now = new Date();
    const ecuadorTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));

    const newReading = this.readingRepository.create({
      sensor_id: dto.sensor_id,
      value: dto.value,
      reading_timestamp: dto.reading_timestamp ? new Date(dto.reading_timestamp) : ecuadorTime,
    });
    return await this.readingRepository.save(newReading);
  }

  // ==========================================================
  // 2. DASHBOARD: TARJETAS
  // ==========================================================
  async getAverageSummaryFromDB(): Promise<any> {
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];
  }

  // ==========================================================
  // 3. DASHBOARD: GRÁFICO AMBIENTAL
  // ==========================================================
  async getDashboardDailyMetrics(days: number = 7) {
    return this.readingRepository.query('SELECT * FROM get_dashboard_daily_metrics($1)', [days]);
  }

  // ==========================================================
  // 4. ANÁLISIS CAMPUS
  // ==========================================================
  async getCampusAnalysis(mode: string) {
    if (!mode) throw new Error('Mode obligatorio');
    const validModes = ['semanal', 'mensual', 'anual'];
    if (!validModes.includes(mode.toLowerCase())) throw new Error('Modo inválido');
    return this.readingRepository.query('SELECT * FROM get_campus_analysis($1)', [mode.toLowerCase()]);
  }

  // ==========================================================
  // 5. TABLA PAGINADA (Aquí aplicamos el FIX)
  // ==========================================================
  async findAllPaginated(blockId?: number, buildingId?: number, roomId?: number, limit = 25, offset = 0) {
    const data = await this.readingRepository.query('SELECT * FROM get_last_readings($1, $2, $3, $4, $5)', [blockId, buildingId, roomId, limit, offset]);
    // 🧹 Limpiamos la hora antes de enviarla
    return this.fixTimezone(data);
  }

  // ==========================================================
  // 6. FILTROS Y CONTEOS (Aquí aplicamos el FIX)
  // ==========================================================
  async getFilteredReadings(type: string, page: number, limit: number, blockId?: number, buildingId?: number, roomId?: number) {
    const data = await this.readingRepository.query('SELECT * FROM get_filtered_readings($1, $2, $3, $4, $5, $6)', [type, page, limit, blockId, buildingId, roomId]);
    // 🧹 Limpiamos la hora antes de enviarla
    return this.fixTimezone(data);
  }

  async getFilteredReadingsCount(type: string, blockId?: number, buildingId?: number, roomId?: number) {
    const result = await this.readingRepository.query('SELECT get_filtered_readings_count($1, $2, $3, $4) as total', [type, blockId, buildingId, roomId]);
    return result[0];
  }

  // ========================================================================
  // 7. SOLAR: SINCRONIZACIÓN
  // ========================================================================
  @Cron(CronExpression.EVERY_HOUR)
  async syncSolarData() {
    this.logger.log('⏳ Sincronizando Planta Solar...');
    const systemId = this.configService.get<string>('VCOM_SYSTEM_ID');
    const apiKey = this.configService.get<string>('VCOM_API_KEY');
    const mainSensorId = this.INVERTER_DB_IDS[0]; 

    if (!systemId || !apiKey) { this.logger.error('❌ Faltan credenciales VCOM'); return; }

    // Hora Ecuador para pedir datos
    const now = new Date();
    const ecuadorTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const dateStr = ecuadorTime.toISOString().split('T')[0]; 

    const url = `http://ws.meteocontrol.de/api/sites/${systemId}/data/energygeneration`;

    try {
        const response = await lastValueFrom(this.httpService.get(url, { params: { apiKey, type: 'day', date: dateStr } }));
        const json = response.data;

        if (!json || !json.chartData || !json.chartData.data) { this.logger.warn('⚠️ API sin datos.'); return; }

        let sumPowerKw = 0;
        json.chartData.data.forEach((point: any) => {
            const val = point[1]; 
            if (val !== null && !isNaN(val)) sumPowerKw += val;
        });

        const totalEnergyKwh = sumPowerKw / 12; // Muestras de 5 min -> /12 para kWh

        if (totalEnergyKwh <= 0) { this.logger.log(`🌙 Planta sin producción.`); return; }
        
        this.logger.log(`🔋 Planta Total: ${totalEnergyKwh.toFixed(2)} kWh`);

        await this.readingRepository.query(`DELETE FROM readings WHERE sensor_id = $1 AND DATE(reading_timestamp) = $2::DATE`, [mainSensorId, dateStr]);

        // Insertamos usando la hora ajustada (ecuadorTime)
        await this.readingRepository.save({
            sensor_id: mainSensorId,
            value: parseFloat(totalEnergyKwh.toFixed(2)),
            reading_timestamp: ecuadorTime 
        });

    } catch (error: any) {
        this.logger.error(`❌ Error API VCOM: ${error.message}`);
    }
  }

  // ========================================================================
  // 8. VISTA FRONTEND: GRÁFICO SOLAR (Aquí aplicamos el FIX)
  // ========================================================================
  async getSolarDetailLocal() {
    const PRECIO_KWH = 0.12;
    const FACTOR_CO2 = 0.4844;

    const query = `
      WITH hourly_data AS (
        SELECT 
          sensor_id,
          value as accumulated,
          reading_timestamp as local_ts
        FROM readings
        WHERE sensor_id = ANY($1)
          AND DATE(reading_timestamp) = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE
      )
      SELECT 
        to_char(local_ts, 'HH24:00') as time,
        sensor_id,
        accumulated,
        accumulated - COALESCE(LAG(accumulated) OVER (PARTITION BY sensor_id ORDER BY local_ts), 0) as production
      FROM hourly_data
      ORDER BY local_ts ASC;
    `;

    const rawData = await this.readingRepository.query(query, [this.INVERTER_DB_IDS]);

    const seriesMap = new Map();
    const colors = ["#FFC107"]; 

    this.INVERTER_DB_IDS.forEach((id, idx) => {
      seriesMap.set(id, { label: `Planta Solar`, borderColor: colors[idx % colors.length], totalToday: 0, data: [] });
    });

    let grandTotalKwh = 0;

    rawData.forEach((row: any) => {
      const sensorData = seriesMap.get(row.sensor_id);
      if (sensorData) {
        let prod = parseFloat(row.production);
        if (prod < 0) prod = 0; 
        if ((row.time === '06:00' || row.time === '07:00') && sensorData.data.length === 0) prod = parseFloat(row.accumulated);

        sensorData.data.push({ time: row.time, value: parseFloat(prod.toFixed(2)) });
        sensorData.totalToday = parseFloat(row.accumulated);
      }
    });

    seriesMap.forEach(val => grandTotalKwh += val.totalToday);

    return {
      success: true,
      date: new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      summary: {
        energy_kwh: parseFloat(grandTotalKwh.toFixed(2)),
        money_usd: parseFloat((grandTotalKwh * PRECIO_KWH).toFixed(2)),
        co2_kg: parseFloat((grandTotalKwh * FACTOR_CO2).toFixed(2)),
        trees: Math.floor((grandTotalKwh * FACTOR_CO2) / 10)
      },
      series: Array.from(seriesMap.values())
    };
  }
  
  // ========================================================================
  // 9. SOLAR: TARJETAS KPI
  // ========================================================================
  async getSolarCardsSummary() {
    const PRECIO_KWH = 0.12;
    const queryToday = `SELECT COALESCE(SUM(max_val), 0) as total_kwh FROM (SELECT MAX(value) as max_val FROM readings WHERE sensor_id = ANY($1) AND DATE(reading_timestamp) = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE GROUP BY sensor_id) t;`;
    const queryMonth = `SELECT COALESCE(SUM(daily_max), 0) as total_kwh FROM (SELECT MAX(value) as daily_max FROM readings WHERE sensor_id = ANY($1) AND to_char(reading_timestamp, 'YYYY-MM') = to_char(NOW() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM') GROUP BY sensor_id, DATE(reading_timestamp)) t;`;

    const [resToday, resMonth] = await Promise.all([
      this.readingRepository.query(queryToday, [this.INVERTER_DB_IDS]),
      this.readingRepository.query(queryMonth, [this.INVERTER_DB_IDS])
    ]);

    const todayKwh = parseFloat(resToday[0].total_kwh);
    const monthKwh = parseFloat(resMonth[0].total_kwh);

    return {
      success: true,
      date: new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      cards: {
        today: { energy_kwh: parseFloat(todayKwh.toFixed(2)), money_saved: parseFloat((todayKwh * PRECIO_KWH).toFixed(2)) },
        month: { energy_kwh: parseFloat(monthKwh.toFixed(2)), money_saved: parseFloat((monthKwh * PRECIO_KWH).toFixed(2)) }
      }
    };
  }
}