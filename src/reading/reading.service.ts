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

  // ⚠️ IDs de tus sensores en la Base de Datos (Según tu captura son 4, 5, 6, 7, 8)
  private readonly INVERTER_DB_IDS = [4, 5, 6, 7, 8]; 

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
  // 1. INSERCIÓN DE DATOS (MQTT y HTTP POST)
  // ==========================================================
  async create(dto: CreateReadingDto | any): Promise<Readings> {
    const newReading = this.readingRepository.create({
      sensor_id: dto.sensor_id,
      value: dto.value,
      reading_timestamp: dto.reading_timestamp ? new Date(dto.reading_timestamp) : new Date(),
    });

    return await this.readingRepository.save(newReading);
  }

  // ==========================================================
  // 2. DASHBOARD: TARJETAS SUPERIORES
  // ==========================================================
  async getAverageSummaryFromDB(): Promise<any> {
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];
  }

  // ==========================================================
  // 3. DASHBOARD: GRÁFICO PRINCIPAL
  // ==========================================================
  async getDashboardDailyMetrics(days: number = 7) {
    return this.readingRepository.query(
      'SELECT * FROM get_dashboard_daily_metrics($1)',
      [days]
    );
  }

  // ==========================================================
  // 4. PESTAÑAS DE ANÁLISIS
  // ==========================================================
  async getCampusAnalysis(mode: string) {
    if (!mode) throw new Error('El parámetro "mode" es obligatorio.');

    const validModes = ['semanal', 'mensual', 'anual'];
    const selectedMode = mode.toLowerCase();

    if (!validModes.includes(selectedMode)) {
      throw new Error('Modo inválido. Use: semanal, mensual, anual');
    }

    return this.readingRepository.query(
      'SELECT * FROM get_campus_analysis($1)',
      [selectedMode]
    );
  }

  // ==========================================================
  // 5. TABLA GENERAL
  // ==========================================================
  async findAllPaginated(blockId?: number, buildingId?: number, roomId?: number, limit = 25, offset = 0) {
    return this.readingRepository.query(
      'SELECT * FROM get_last_readings($1, $2, $3, $4, $5)', 
      [blockId, buildingId, roomId, limit, offset]
    );
  }

  // ==========================================================
  // 6. TABLAS FILTRADAS
  // ==========================================================
  async getFilteredReadings(type: string, page: number, limit: number, blockId?: number, buildingId?: number, roomId?: number) {
    return this.readingRepository.query(
      'SELECT * FROM get_filtered_readings($1, $2, $3, $4, $5, $6)',
      [type, page, limit, blockId, buildingId, roomId],
    );
  }

  async getFilteredReadingsCount(type: string, blockId?: number, buildingId?: number, roomId?: number) {
    const result = await this.readingRepository.query(
      'SELECT get_filtered_readings_count($1, $2, $3, $4) as total',
      [type, blockId, buildingId, roomId]
    );
    return result[0];
  }

  // ========================================================================
  // 7. SOLAR: CRON JOB (CORREGIDO Y DEFINITIVO)
  // ========================================================================
  @Cron(CronExpression.EVERY_HOUR)
  async syncSolarData() {
    this.logger.log('⏳ Iniciando sincronización de datos solares con VCOM...');

    // 1. Obtener Configuración
    // Asegúrate de que en .env la URL NO tenga parámetros:
    const vcomBaseUrl = this.configService.get<string>('VCOM_API_URL');
    const vcomCookie = this.configService.get<string>('VCOM_COOKIE');

    if (!vcomBaseUrl || !vcomCookie) {
        this.logger.error('❌ Faltan variables de entorno VCOM_API_URL o VCOM_COOKIE');
        return;
    }

    // 2. Generar Fecha Dinámica (HOY)
    // Formato requerido: YYYY-MM-DDT00:00:00
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; 
    const dynamicDate = `${dateStr}T00:00:00`;

    // 3. Definir Inversores (Extraídos de tu Postman)
    // Ordenamos del .1 al .5 para que coincidan con tus sensores 4,5,6,7,8
    const inverterIds = [
        'Id235422.1',
        'Id235422.2',
        'Id235422.3',
        'Id235422.4',
        'Id235422.5'
    ].join(',');

    try {
      // 4. Petición a VCOM con TODOS los parámetros de Postman
      const response = await lastValueFrom(
        this.httpService.get(vcomBaseUrl, { 
          headers: { 
            'Cookie': vcomCookie, 
            'Content-Type': 'application/json', 
            'X-Requested-With': 'XMLHttpRequest' 
          },
          // AQUÍ ESTÁ LA CLAVE: Pasamos los mismos parámetros que Postman
          params: {
            url: '/default/static/graph-with-table',
            displayType: 'highcharts',
            theme: 'light',
            systemId: '2127159',      // <--- ID DE TU SISTEMA
            type: 'Wechselrichter',
            key: 'RPP09',             // <--- LLAVE
            chartType: 'Wechselrichter',
            date: dynamicDate,        // <--- FECHA DE HOY
            displayMinuteValues: 'false',
            period: 'tag',
            inv: inverterIds          // <--- LOS 5 INVERSORES
          }
        })
      );
      
      // 5. Casteo seguro para evitar el error 'unknown'
      const rawData = response.data as any;

      // 6. Validar respuesta
      if (!rawData || !rawData.data) {
        this.logger.warn('⚠️ VCOM respondió OK pero el array "data" está vacío.');
        return;
      }

      // 7. Procesar y Guardar
      for (const [index, inverterSeries] of rawData.data.entries()) {
        const dbSensorId = this.INVERTER_DB_IDS[index];
        if (!dbSensorId) continue;

        // Filtramos puntos válidos (que no sean null)
        const dataPoints = inverterSeries.data.filter((p: any) => p[1] !== null);
        
        if (dataPoints.length > 0) {
          // Tomamos el último valor acumulado reportado
          const ultimoPunto = dataPoints[dataPoints.length - 1]; 
          const valorAcumulado = ultimoPunto[1]; 

          // SQL: Insertar solo si no existe ya un dato para esta hora
          await this.readingRepository.query(`
            INSERT INTO readings (sensor_id, value, reading_timestamp)
            SELECT $1, $2, NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM readings 
              WHERE sensor_id = $1 
              AND date_trunc('hour', reading_timestamp) = date_trunc('hour', NOW())
            );
          `, [dbSensorId, valorAcumulado]);
          
          this.logger.log(`✅ Inversor ${index + 1} (Sensor ${dbSensorId}) guardado: ${valorAcumulado} kWh`);
        }
      }

    } catch (error: any) {
      this.logger.error('❌ Error sincronizando solar:', error.message);
    }
  }

  // ========================================================================
  // 8. SOLAR: VISTA FRONTEND (Lee de la BD Local)
  // ========================================================================
  async getSolarDetailLocal() {
    const PRECIO_KWH = 0.12;
    const FACTOR_CO2 = 0.4844;

    const query = `
      WITH hourly_data AS (
        SELECT 
          sensor_id,
          value as accumulated,
          reading_timestamp,
          reading_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guayaquil' as local_ts
        FROM readings
        WHERE sensor_id = ANY($1)
          AND DATE(reading_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guayaquil') = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE
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
    const colors = ["#B68C05", "#0A88FF", "#D6707B", "#2CBD08", "#FFC125"];

    this.INVERTER_DB_IDS.forEach((id, idx) => {
      seriesMap.set(id, {
        label: `Inversor ${idx + 1}`,
        borderColor: colors[idx % colors.length],
        totalToday: 0,
        data: []
      });
    });

    let grandTotalKwh = 0;

    rawData.forEach((row: any) => {
      const sensorData = seriesMap.get(row.sensor_id);
      if (sensorData) {
        let prod = parseFloat(row.production);
        if (prod < 0) prod = 0; 
        
        // Ajuste para el primer dato del día (ej: amanecer)
        if ((row.time === '06:00' || row.time === '07:00') && sensorData.data.length === 0) {
             prod = parseFloat(row.accumulated);
        }

        sensorData.data.push({
          time: row.time,
          value: parseFloat(prod.toFixed(2))
        });
        
        sensorData.totalToday = parseFloat(row.accumulated);
      }
    });

    seriesMap.forEach(val => grandTotalKwh += val.totalToday);

    const summary = {
      energy_kwh: parseFloat(grandTotalKwh.toFixed(2)),
      money_usd: parseFloat((grandTotalKwh * PRECIO_KWH).toFixed(2)),
      co2_kg: parseFloat((grandTotalKwh * FACTOR_CO2).toFixed(2)),
      trees: Math.floor((grandTotalKwh * FACTOR_CO2) / 10)
    };

    return {
      success: true,
      date: new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }),
      summary: summary,
      series: Array.from(seriesMap.values())
    };
  }
}