import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, timeout } from 'rxjs'; // <--- Importamos timeout para evitar cuelgues
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  // IDs de los sensores en TU base de datos (Inversores 1 al 5)
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
  // 1. CREAR LECTURA (MQTT / POST)
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
  // 2. DASHBOARD: TARJETAS
  // ==========================================================
  async getAverageSummaryFromDB(): Promise<any> {
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];
  }

  // ==========================================================
  // 3. DASHBOARD: GRÁFICO PRINCIPAL
  // ==========================================================
  async getDashboardDailyMetrics(days: number = 7) {
    return this.readingRepository.query('SELECT * FROM get_dashboard_daily_metrics($1)', [days]);
  }

  // ==========================================================
  // 4. ANÁLISIS (Semanal/Mensual/Anual)
  // ==========================================================
  async getCampusAnalysis(mode: string) {
    if (!mode) throw new Error('Mode obligatorio');
    const validModes = ['semanal', 'mensual', 'anual'];
    if (!validModes.includes(mode.toLowerCase())) throw new Error('Modo inválido');
    
    return this.readingRepository.query('SELECT * FROM get_campus_analysis($1)', [mode.toLowerCase()]);
  }

  // ==========================================================
  // 5. TABLA PAGINADA
  // ==========================================================
  async findAllPaginated(blockId?: number, buildingId?: number, roomId?: number, limit = 25, offset = 0) {
    return this.readingRepository.query('SELECT * FROM get_last_readings($1, $2, $3, $4, $5)', [blockId, buildingId, roomId, limit, offset]);
  }

  // ==========================================================
  // 6. FILTROS Y CONTEOS
  // ==========================================================
  async getFilteredReadings(type: string, page: number, limit: number, blockId?: number, buildingId?: number, roomId?: number) {
    return this.readingRepository.query('SELECT * FROM get_filtered_readings($1, $2, $3, $4, $5, $6)', [type, page, limit, blockId, buildingId, roomId]);
  }

  async getFilteredReadingsCount(type: string, blockId?: number, buildingId?: number, roomId?: number) {
    const result = await this.readingRepository.query('SELECT get_filtered_readings_count($1, $2, $3, $4) as total', [type, blockId, buildingId, roomId]);
    return result[0];
  }

  // ========================================================================
  // 7. SOLAR: CRON JOB (MODO DETECTIVE 🕵️‍♂️)
  // ========================================================================
  @Cron(CronExpression.EVERY_HOUR)
  async syncSolarData() {
    this.logger.log('⏳ 1. Iniciando sincronización de datos solares...');

    // A. Obtener Variables
    const vcomBaseUrl = this.configService.get<string>('VCOM_API_URL');
    const vcomCookie = this.configService.get<string>('VCOM_COOKIE');

    if (!vcomBaseUrl || !vcomCookie) {
        this.logger.error('❌ Faltan variables de entorno. Revisa el .env');
        return;
    }

    // B. Generar Fecha (Ajustada a Ecuador GMT-5)
    const now = new Date();
    // Restamos 5 horas (en milisegundos) para obtener la fecha de Ecuador
    const ecuadorTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    const dateStr = ecuadorTime.toISOString().split('T')[0]; 
    const dynamicDate = `${dateStr}T00:00:00`;

    // Parámetros IDÉNTICOS a tu Postman exitoso
    const params = {
        url: '/default/static/graph-with-table',
        displayType: 'highcharts',
        theme: 'light',
        systemId: '2127159',
        type: 'Wechselrichter',
        key: 'RPP09',
        chartType: 'Wechselrichter',
        width: 'undefined',    
        height: '324.02325',   
        date: dynamicDate,
        displayMinuteValues: 'false',
        period: 'tag',
        inv: 'Id235422.1,Id235422.2,Id235422.3,Id235422.4,Id235422.5' // IDs ordenados
    };

    try {
      this.logger.log(`🚀 2. Enviando petición a: ${vcomBaseUrl}`);
      
      // C. Petición HTTP con Timeout de 10 segundos
      const response = await lastValueFrom(
        this.httpService.get(vcomBaseUrl, { 
          headers: { 
            'Cookie': vcomCookie, 
            'Content-Type': 'application/json', 
            'X-Requested-With': 'XMLHttpRequest' 
          },
          params: params
        }).pipe(timeout(10000)) 
      );
      
      this.logger.log(`📩 3. Respuesta recibida! Status: ${response.status}`);
      
      const rawData = response.data as any;

      // 🔍 DEBUG: Imprimir la estructura para ver si cambió
      // Si esto imprime HTML en vez de JSON, es que la cookie expiró o la URL está mal
      if (typeof rawData === 'string') {
         this.logger.warn('⚠️ La respuesta es un STRING (posiblemente HTML de error), no un JSON.');
         console.log(rawData.substring(0, 200)); 
         return;
      }

      if (!rawData || !rawData.data) {
        this.logger.warn('⚠️ 4. Alerta: El objeto "data" no existe en la respuesta.');
        console.log('Estructura recibida:', Object.keys(rawData));
        return;
      }

      this.logger.log(`📊 4. Procesando datos de ${rawData.data.length} inversores...`);

      // D. Procesar y Guardar
      for (const [index, inverterSeries] of rawData.data.entries()) {
        const dbSensorId = this.INVERTER_DB_IDS[index];
        if (!dbSensorId) continue;

        const dataPoints = inverterSeries.data.filter((p: any) => p[1] !== null);
        
        if (dataPoints.length > 0) {
          const ultimoPunto = dataPoints[dataPoints.length - 1]; 
          const valorAcumulado = ultimoPunto[1]; 

          await this.readingRepository.query(`
            INSERT INTO readings (sensor_id, value, reading_timestamp)
            SELECT $1, $2, NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM readings 
              WHERE sensor_id = $1 
              AND date_trunc('hour', reading_timestamp) = date_trunc('hour', NOW())
            );
          `, [dbSensorId, valorAcumulado]);
          
          this.logger.log(`✅ Inversor ${index + 1} (Sensor ${dbSensorId}) -> ${valorAcumulado} kWh`);
        } else {
            this.logger.log(`ℹ️ Inversor ${index + 1} sin datos recientes.`);
        }
      }

    } catch (error: any) {
      this.logger.error('❌ Error CRÍTICO en sincronización:');
      this.logger.error(error.message);
      if (error.response) {
         console.log('🔴 Detalle Error Servidor:', error.response.data);
         console.log('🔴 Status:', error.response.status);
      }
    }
  }

  // ========================================================================
  // 8. VISTA FRONTEND (Lee de la BD Local)
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
  // 9. SOLAR: TARJETAS DE RESUMEN (HOY vs MES) - ¡Desde BD Local! ⚡💰
  // ========================================================================
  async getSolarCardsSummary() {
    const PRECIO_KWH = 0.12; // Tu tarifa

    // 1. Calcular Total de HOY
    // Sumamos el valor máximo alcanzado por cada inversor en el día actual
    const queryToday = `
      SELECT COALESCE(SUM(max_val), 0) as total_kwh
      FROM (
          SELECT MAX(value) as max_val
          FROM readings
          WHERE sensor_id = ANY($1)
          AND DATE(reading_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guayaquil') = (NOW() AT TIME ZONE 'America/Guayaquil')::DATE
          GROUP BY sensor_id
      ) t;
    `;

    // 2. Calcular Total del MES
    // 1. Agrupamos por día y por sensor para sacar el máximo diario.
    // 2. Sumamos todos esos máximos.
    const queryMonth = `
      SELECT COALESCE(SUM(daily_max), 0) as total_kwh
      FROM (
          SELECT MAX(value) as daily_max
          FROM readings
          WHERE sensor_id = ANY($1)
          AND to_char(reading_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guayaquil', 'YYYY-MM') = to_char(NOW() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM')
          GROUP BY sensor_id, DATE(reading_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guayaquil')
      ) t;
    `;

    // Ejecutamos las consultas en paralelo
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
        today: {
          energy_kwh: parseFloat(todayKwh.toFixed(2)),
          money_saved: parseFloat((todayKwh * PRECIO_KWH).toFixed(2))
        },
        month: {
          energy_kwh: parseFloat(monthKwh.toFixed(2)),
          money_saved: parseFloat((monthKwh * PRECIO_KWH).toFixed(2))
        }
      }
    };
  }
}