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
  // 🛠️ MÉTODO AUXILIAR: HORA REAL ECUADOR (Para Guardar)
  // ==========================================================
  private getEcuadorDate(): Date {
    // Crea la fecha visual de Ecuador ignorando la zona horaria del sistema
    const ecuadorString = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' });
    return new Date(ecuadorString);
  }

  // ==========================================================
  // 🧹 FIX DEFINITIVO: COMPENSACIÓN +5 HORAS
  // ==========================================================
  private fixTimezone(data: any[]) {
    return data.map(row => {
      let dateObj: Date;

      // 1. Intentamos obtener la fecha de un objeto Timestamp nativo
      if (row.reading_timestamp) {
        dateObj = new Date(row.reading_timestamp);
      } 
      else if (row.local_ts) {
        dateObj = new Date(row.local_ts);
      }
      // 2. Si no hay timestamp, reconstruimos desde los strings del SQL (si existen)
      // Agregamos 'T' o espacio para que JS lo parsee correctamente
      else if (row.fecha && row.hora) {
        dateObj = new Date(`${row.fecha} ${row.hora}`);
      } 
      else {
        return row; // No hay datos de tiempo, retornamos fila intacta
      }

      // 3. 🚨 LA CURA: SUMAR 5 HORAS 🚨
      // El sistema está leyendo '00:00' (BD) como '19:00' (JS). 
      // Sumamos 5 horas (en milisegundos) para volver a '00:00'.
      const timeMs = dateObj.getTime();
      const fixedDate = new Date(timeMs + 0/*(5 * 60 * 60 * 1000)*/);

      // 4. Extracción de los componentes de la fecha YA CORREGIDA
      // Usamos UTC methods para obtener el valor literal del objeto corregido
      const year = fixedDate.getUTCFullYear();
      const month = String(fixedDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fixedDate.getUTCDate()).padStart(2, '0');
      const hours = String(fixedDate.getUTCHours()).padStart(2, '0');
      const minutes = String(fixedDate.getUTCMinutes()).padStart(2, '0');

      const dateStr = `${year}-${month}-${day}`;
      const timeStr = `${hours}:${minutes}`;

      // 5. Sobrescribimos TODO para asegurar que el Front reciba el texto correcto
      row.fecha = dateStr;
      row.hora = timeStr;
      row.fecha_str = dateStr;
      row.hora_str = timeStr;
      
      // Actualizamos también el campo original por si el front lo usa
      if (row.reading_timestamp) row.reading_timestamp = `${dateStr} ${timeStr}`;
      if (row.local_ts) row.local_ts = `${dateStr} ${timeStr}`;

      return row;
    });
  }

  // ==========================================================
  // 1. CREAR LECTURA (POST / MQTT)
  // ==========================================================
  async create(dto: CreateReadingDto | any): Promise<Readings> {
    const timestampToSave = dto.reading_timestamp 
        ? new Date(dto.reading_timestamp) 
        : this.getEcuadorDate();

    const newReading = this.readingRepository.create({
      sensor_id: dto.sensor_id,
      value: dto.value,
      reading_timestamp: timestampToSave,
    });

    return await this.readingRepository.save(newReading);
  }

  // ==========================================================
  // 5. TABLA PAGINADA
  // ==========================================================
  async findAllPaginated(blockId?: number, buildingId?: number, roomId?: number, limit = 25, offset = 0) {
    const data = await this.readingRepository.query(
      'SELECT * FROM get_last_readings($1, $2, $3, $4, $5)', 
      [blockId, buildingId, roomId, limit, offset]
    );
    return this.fixTimezone(data);
  }

  // ==========================================================
  // 6. FILTROS
  // ==========================================================
  async getFilteredReadings(type: string, page: number, limit: number, blockId?: number, buildingId?: number, roomId?: number) {
    const data = await this.readingRepository.query(
      'SELECT * FROM get_filtered_readings($1, $2, $3, $4, $5, $6)', 
      [type, page, limit, blockId, buildingId, roomId]
    );
    return this.fixTimezone(data);
  }

  // ==========================================================
  // OTROS MÉTODOS DE SOPORTE
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
      data: rawData.map(row => ({
        date: row.chart_date,      
        value: parseFloat(row.chart_value), 
        extra: parseFloat(row.chart_extra)  
      }))
    };
  }

  async getAverageSummaryFromDB(): Promise<any> {
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];
  }

  async getDashboardDailyMetrics(days: number = 7) {
    return this.readingRepository.query('SELECT * FROM get_dashboard_daily_metrics($1)', [days]);
  }

  async getCampusAnalysis(mode: string) {
    if (!mode) throw new Error('Mode obligatorio');
    const validModes = ['semanal', 'mensual', 'anual'];
    if (!validModes.includes(mode.toLowerCase())) throw new Error('Modo inválido');
    return this.readingRepository.query('SELECT * FROM get_campus_analysis($1)', [mode.toLowerCase()]);
  }

  async getFilteredReadingsCount(type: string, blockId?: number, buildingId?: number, roomId?: number) {
    const result = await this.readingRepository.query('SELECT get_filtered_readings_count($1, $2, $3, $4) as total', [type, blockId, buildingId, roomId]);
    return result[0];
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncSolarData() {
    this.logger.log('⏳ Sincronizando Planta Solar...');
    const systemId = this.configService.get<string>('VCOM_SYSTEM_ID');
    const apiKey = this.configService.get<string>('VCOM_API_KEY');
    const mainSensorId = this.INVERTER_DB_IDS[0]; 

    if (!systemId || !apiKey) { this.logger.error('❌ Faltan credenciales VCOM'); return; }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    const ecuadorTime = this.getEcuadorDate();

    const url = `http://ws.meteocontrol.de/api/sites/${systemId}/data/energygeneration`;

    try {
        const response = await lastValueFrom(this.httpService.get(url, { params: { apiKey, type: 'day', date: dateStr } }));
        const json = response.data;
        if (!json || !json.chartData || !json.chartData.data) return;

        let sumPowerKw = 0;
        json.chartData.data.forEach((point: any) => {
            const val = point[1]; 
            if (val !== null && !isNaN(val)) sumPowerKw += val;
        });

        const totalEnergyKwh = sumPowerKw / 12;
        await this.readingRepository.query(`DELETE FROM readings WHERE sensor_id = $1 AND DATE(reading_timestamp) = $2::DATE`, [mainSensorId, dateStr]);
        await this.readingRepository.save({
            sensor_id: mainSensorId,
            value: parseFloat(totalEnergyKwh.toFixed(2)),
            reading_timestamp: ecuadorTime 
        });
        this.logger.log('✅ Datos solares guardados.');
    } catch (error: any) {
        this.logger.error(`❌ Error API VCOM: ${error.message}`);
    }
  }

  async getSolarDetailLocal() {
    const PRECIO_KWH = 0.12;
    const FACTOR_CO2 = 0.4844;
    const query = `
      WITH hourly_data AS (
        SELECT sensor_id, value as accumulated, reading_timestamp as local_ts
        FROM readings
        WHERE sensor_id = ANY($1)
          AND DATE(reading_timestamp) = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE
      )
      SELECT to_char(local_ts, 'HH24:00') as time, sensor_id, accumulated,
        accumulated - COALESCE(LAG(accumulated) OVER (PARTITION BY sensor_id ORDER BY local_ts), 0) as production
      FROM hourly_data ORDER BY local_ts ASC;
    `;
    const rawData = await this.readingRepository.query(query, [this.INVERTER_DB_IDS]);
    
    const seriesMap = new Map();
    this.INVERTER_DB_IDS.forEach(id => {
      seriesMap.set(id, { label: `Planta Solar`, totalToday: 0, data: [] });
    });

    rawData.forEach((row: any) => {
      const sensorData = seriesMap.get(row.sensor_id);
      if (sensorData) {
        let prod = parseFloat(row.production);
        if (prod < 0) prod = 0; 
        sensorData.data.push({ time: row.time, value: parseFloat(prod.toFixed(2)) });
        sensorData.totalToday = parseFloat(row.accumulated);
      }
    });

    let grandTotal = 0;
    seriesMap.forEach(val => grandTotal += val.totalToday);

    return {
      success: true,
      summary: {
        energy_kwh: parseFloat(grandTotal.toFixed(2)),
        money_usd: parseFloat((grandTotal * PRECIO_KWH).toFixed(2)),
        co2_kg: parseFloat((grandTotal * FACTOR_CO2).toFixed(2))
      },
      series: Array.from(seriesMap.values())
    };
  }

  async getSolarCardsSummary() {
    const PRECIO_KWH = 0.12;
    const queryToday = `SELECT COALESCE(SUM(max_val), 0) as total_kwh FROM (SELECT MAX(value) as max_val FROM readings WHERE sensor_id = ANY($1) AND DATE(reading_timestamp) = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE GROUP BY sensor_id) t;`;
    const resToday = await this.readingRepository.query(queryToday, [this.INVERTER_DB_IDS]);
    const todayKwh = parseFloat(resToday[0].total_kwh);

    return {
      success: true,
      cards: {
        today: { energy_kwh: parseFloat(todayKwh.toFixed(2)), money_saved: parseFloat((todayKwh * PRECIO_KWH).toFixed(2)) }
      }
    };
  }
}