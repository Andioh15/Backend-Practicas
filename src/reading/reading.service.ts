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
import { ExportReadingsDto } from '../reports/dtos/export-readings.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnModuleInit } from '@nestjs/common'


@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);
  private readonly INVERTER_DB_IDS = [4];

  private readonly N8N_WEBHOOK_URL = "https://andioh.app.n8n.cloud/webhook-test/459c5db4-1809-438d-9e46-4205bc50bcd8";

  constructor(
    @InjectRepository(Readings)
    private readingRepository: Repository<Readings>,

    @InjectRepository(Sensors)
    private sensorRepository: Repository<Sensors>,

    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private dataSource: DataSource,
  ) { }

  // ==========================================================
  // METODO AUXILIAR: Obtener Hora Actual de Ecuador
  // ==========================================================
  private getEcuadorDate(): Date {
    const ecuadorString = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' });
    return new Date(ecuadorString);
  }

  // ==========================================================
  // METODO MATEMATICO: Redondeo de Tiempo (Time Snapping)
  // ==========================================================
  private getRoundedDate(intervalMinutes: number): Date {
    const now = this.getEcuadorDate();
    const ms = 1000 * 60 * intervalMinutes;
    const roundedTime = Math.round(now.getTime() / ms) * ms;
    return new Date(roundedTime);
  }

  // ==========================================================
  // CORRECCION DE ZONA HORARIA PARA FRONTEND
  // ==========================================================
  private fixTimezone(data: any[]) {
    return data.map(row => {
      const field = row.reading_timestamp ? 'reading_timestamp' : (row.local_ts ? 'local_ts' : null);
      if (!field || !row[field]) return row;

      const d = new Date(row[field]);
      const pad = (n: number) => n.toString().padStart(2, '0');

      const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const flatString = `${fecha} ${hora}:${pad(d.getSeconds())}`;

      row[field] = flatString;
      row.fecha_str = fecha;
      row.hora_str = hora;

      return row;
    });
  }

  // ==========================================================
  // 1. CREAR LECTURA + 🚨 ALERTA N8N
  // ==========================================================
  async create(dto: CreateReadingDto | any): Promise<Readings> {
    const timestampToSave = this.getRoundedDate(10);

    // 1. Evitar duplicados
    await this.readingRepository.query(
      `DELETE FROM readings WHERE sensor_id = $1 AND reading_timestamp = $2`,
      [dto.sensor_id, timestampToSave]
    );

    // 2. Guardar
    const newReading = this.readingRepository.create({
      sensor_id: dto.sensor_id,
      value: dto.value,
      reading_timestamp: timestampToSave,
    });

    const savedData = await this.readingRepository.save(newReading);

    // 3. 🚨 VERIFICAR ALERTAS (No usamos await para no bloquear)
    this.checkAlerts(dto.sensor_id, dto.value);

    return savedData;
  }

  // ==========================================================
  // 🚨 LÓGICA DE ENVÍO A N8N
  // ==========================================================
  private async checkAlerts(sensorId: number, value: number) {
    let alertMessage = '';
    let isCritical = false;

    // Reglas basadas en tus sensores
    // ID 1 = CO2 (ppm)
    if (sensorId === 1 && value > 1000) {
      alertMessage = `⚠️ ALTA CONCENTRACIÓN DE CO2: ${value} ppm.`;
      isCritical = true;
    }
    // ID 2 = Temperatura (°C)
    else if (sensorId === 2 && value > 50) {
      alertMessage = `🔥 ALERTA TEMPERATURA CRÍTICA: ${value}°C detectados.`;
      isCritical = true;
    }
    // ID 3 = Humedad (%)
    else if (sensorId === 3 && (value < 10 || value > 90)) {
      alertMessage = `💧 HUMEDAD ANORMAL: ${value}%.`;
      isCritical = true;
    }

    if (isCritical) {
      this.logger.warn(`🚨 Disparando Webhook N8N: ${alertMessage}`);
      try {
        await lastValueFrom(this.httpService.post(this.N8N_WEBHOOK_URL, {
          sensor_id: sensorId,
          value: value,
          message: alertMessage,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        this.logger.error(`❌ Error al contactar n8n: ${error.message}`);
      }
    }
  }

  // ==========================================================
  // 7. SOLAR: SINCRONIZACION -> Intervalo de 1 Hora (:00:00)
  // ==========================================================
  @Cron(CronExpression.EVERY_HOUR)
  async syncSolarData() {
    this.logger.log('Sincronizando Planta Solar...');
    const systemId = this.configService.get<string>('VCOM_SYSTEM_ID');
    const apiKey = this.configService.get<string>('VCOM_API_KEY');
    const mainSensorId = this.INVERTER_DB_IDS[0];

    if (!systemId || !apiKey) return;

    const exactHourTimestamp = this.getRoundedDate(60);
    const dateStr = exactHourTimestamp.toISOString().split('T')[0];

    const url = `http://ws.meteocontrol.de/api/sites/${systemId}/data/energygeneration`;

    try {
      const response = await lastValueFrom(this.httpService.get(url, { params: { apiKey, type: 'day', date: dateStr } }));
      const json = response.data;
      if (!json?.chartData?.data) return;

      let sumPowerKw = 0;
      json.chartData.data.forEach((point: any) => {
        const val = point[1];
        if (val !== null && !isNaN(val)) sumPowerKw += val;
      });
      const totalEnergyKwh = sumPowerKw / 12;

      this.logger.log(`Planta Total (${exactHourTimestamp.toLocaleTimeString()}): ${totalEnergyKwh.toFixed(2)} kWh`);

      await this.readingRepository.query(
        `DELETE FROM readings WHERE sensor_id = $1 AND reading_timestamp = $2`,
        [mainSensorId, exactHourTimestamp]
      );

      await this.readingRepository.save({
        sensor_id: mainSensorId,
        value: parseFloat(totalEnergyKwh.toFixed(2)),
        reading_timestamp: exactHourTimestamp
      });

    } catch (error: any) {
      this.logger.error(`Error Solar: ${error.message}`);
    }
  }

  // ==========================================================
  // METODOS DE CONSULTA Y REPORTES
  // ==========================================================

  async findAllPaginated(blockId?: number, buildingId?: number, roomId?: number, limit = 25, offset = 0) {
    const data = await this.readingRepository.query('SELECT * FROM get_last_readings($1, $2, $3, $4, $5)', [blockId, buildingId, roomId, limit, offset]);
    return this.fixTimezone(data);
  }

  async getFilteredReadings(type: string, page: number, limit: number, blockId?: number, buildingId?: number, roomId?: number) {
    const data = await this.readingRepository.query('SELECT * FROM get_filtered_readings($1, $2, $3, $4, $5, $6)', [type, page, limit, blockId, buildingId, roomId]);
    return this.fixTimezone(data);
  }

  async getHistoryMetrics(type: string, days: number = 7, blockId?: number, buildingId?: number, roomId?: number) {
    const rawData = await this.readingRepository.query('SELECT * FROM get_daily_metrics($1, $2, $3, $4, $5)', [type === 'solar' ? 'Energy' : type, days, blockId, buildingId, roomId]);
    const fixedData = this.fixTimezone(rawData);
    return { success: true, type, data: fixedData.map(row => ({ date: row.chart_date, value: parseFloat(row.chart_value), extra: parseFloat(row.chart_extra) })) };
  }

  // ==========================================================
  // ⚡ AQUI ESTABA EL ERROR: ARREGLADO EL ARRAY [0]
  // ==========================================================
  async getSolarCardsSummary() {
    const PRECIO = 0.12;
    const qToday = `SELECT COALESCE(MAX(value), 0) as val FROM readings WHERE sensor_id = $1 AND reading_timestamp::date = CURRENT_DATE`;
    const qMonth = `SELECT SUM(daily_max) as val FROM (SELECT MAX(value) as daily_max FROM readings WHERE sensor_id = $1 AND to_char(reading_timestamp, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM') GROUP BY reading_timestamp::date) t`;

    // CORRECCION: Usamos INVERTER_DB_IDS[0] para pasar el numero 4, no el array [4]
    const [resT, resM] = await Promise.all([
      this.readingRepository.query(qToday, [this.INVERTER_DB_IDS[0]]),
      this.readingRepository.query(qMonth, [this.INVERTER_DB_IDS[0]])
    ]);

    const todayKwh = resT[0] ? parseFloat(resT[0].val) : 0;
    const monthKwh = resM[0] ? parseFloat(resM[0].val) : 0;

    return {
      success: true,
      cards: {
        today: { energy_kwh: parseFloat(todayKwh.toFixed(2)), money_saved: parseFloat((todayKwh * PRECIO).toFixed(2)) },
        month: { energy_kwh: parseFloat(monthKwh.toFixed(2)), money_saved: parseFloat((monthKwh * PRECIO).toFixed(2)) }
      }
    };
  }

  async getSolarEcoImpact() {
    // CORRECCION: Aseguramos indice [0] aqui tambien
    const r = await this.readingRepository.query('SELECT * FROM get_solar_lifetime_impact($1)', [this.INVERTER_DB_IDS[0]]);
    return {
      success: true,
      lifetime_data: {
        energy_kwh: parseFloat(parseFloat(r[0].total_energy_kwh).toFixed(2)),
        money_saved: parseFloat(parseFloat(r[0].total_money_saved).toFixed(2)),
        co2_kg: parseInt(r[0].total_co2_kg),
        trees_planted: parseInt(r[0].total_trees)
      }
    };
  }

  async getAverageSummaryFromDB() {
    const r = await this.readingRepository.query('SELECT * FROM get_average_summary()');
    return r[0];
  }

  async getDashboardDailyMetrics(days = 7) {
    const d = await this.readingRepository.query('SELECT * FROM get_dashboard_daily_metrics($1)', [days]);
    return this.fixTimezone(d);
  }

  async getCampusAnalysis(m: string) {
    const d = await this.readingRepository.query('SELECT * FROM get_campus_analysis($1)', [m.toLowerCase()]);
    return this.fixTimezone(d);
  }

  async getFilteredReadingsCount(t: string, b?: number, bu?: number, r?: number) {
    const res = await this.readingRepository.query('SELECT get_filtered_readings_count($1, $2, $3, $4) as total', [t, b, bu, r]);
    return res[0];
  }

  async getSolarDetailLocal() {
    // AQUI SI se usa ANY($1), asi que pasamos el array completo
    const q = `
       WITH hourly_data AS (
         SELECT sensor_id, value as accumulated, reading_timestamp as local_ts 
         FROM readings 
         WHERE sensor_id = ANY($1) AND reading_timestamp::date = CURRENT_DATE
       ) 
       SELECT to_char(local_ts, 'HH24:00') as time, sensor_id, accumulated, 
       accumulated - COALESCE(LAG(accumulated) OVER (PARTITION BY sensor_id ORDER BY local_ts), 0) as production 
       FROM hourly_data ORDER BY local_ts ASC;
     `;
    const rawData = await this.readingRepository.query(q, [this.INVERTER_DB_IDS]);
    const data = this.fixTimezone(rawData);

    const seriesMap = new Map();
    this.INVERTER_DB_IDS.forEach(id => {
      seriesMap.set(id, { label: `Planta Solar`, totalToday: 0, data: [] });
    });

    data.forEach((row: any) => {
      const sensorData = seriesMap.get(row.sensor_id);
      if (sensorData) {
        let prod = parseFloat(row.production);
        if (prod < 0) prod = 0;
        if ((row.time === '06:00' || row.time === '07:00') && sensorData.data.length === 0) {
          prod = parseFloat(row.accumulated);
        }
        sensorData.data.push({ time: row.time, value: parseFloat(prod.toFixed(2)) });
        sensorData.totalToday = parseFloat(row.accumulated);
      }
    });

    let grandTotal = 0;
    seriesMap.forEach(val => grandTotal += val.totalToday);
    const PRECIO_KWH = 0.12;
    const FACTOR_CO2 = 0.4844;

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

  async generateCsvReport(filters: ExportReadingsDto): Promise<string> {
    const { startDate, endDate, type, blockId, buildingId, roomId } = filters;

    // 1. Llamada a la Función SQL Rápida ⚡
    // Pasamos NULL si el dato no existe para que el SQL sepa ignorar ese filtro
    const rawData = await this.readingRepository.query(
      'SELECT * FROM get_readings_export($1, $2, $3, $4, $5, $6)',
      [
        startDate,
        endDate,
        (type && type !== 'Todos los Datos') ? type : null,
        blockId || null,
        buildingId || null,
        roomId || null
      ]
    );

    // 2. Construcción del CSV (Ahora es súper rápido porque no hay lógica compleja)
    const headers = ['Fecha', 'Hora', 'Tipo Sensor', 'Valor', 'Unidad', 'Bloque', 'Edificio', 'Sala'];

    // Mapeamos los resultados limpios que vienen de la BD
    const rows = rawData.map(row => {
      return [
        row.fecha,
        row.hora,
        row.tipo_sensor,
        row.valor,       // Ya viene redondeado desde SQL
        row.unidad,
        `"${row.bloque}"`,   // Comillas por si hay espacios
        `"${row.edificio}"`,
        `"${row.sala}"`
      ].join(',');
    });

    // Unimos encabezado + filas
    return [headers.join(','), ...rows].join('\n');
  }

  // ==========================================================
  // 📊 RESUMEN PARA EL CHATBOT (N8N)
  // ==========================================================
  async getSummary() {
    // Llamamos a la función SQL que acabamos de crear
    const data = await this.readingRepository.query('SELECT * FROM get_monitor_status()');

    // Extraemos la primera fila (siempre devuelve 1 fila)
    const result = data[0] || {};

    return {
      // Formateamos los números para que se vean bonitos en WhatsApp
      avg_co2: Number(result.last_co2 || 0).toFixed(0), // Sin decimales
      avg_temp: Number(result.last_temp || 0).toFixed(1), // 1 decimal
      avg_hum: Number(result.last_hum || 0).toFixed(0)   // Sin decimales
    };
  }


  


  // ==========================================================
  // 🤖 INTEGRACIÓN CON GEMINI
  // ==========================================================
  async askGemini(prompt: string) {
    try {
      // 1. Obtener la API Key de las variables de entorno
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('La API Key de Gemini no está configurada.');
      }

      // 2. Inicializar el modelo
      const genAI = new GoogleGenerativeAI(apiKey);
      // Usamos flash por ser rápido y económico, ideal para APIs
      // Prueba con el nombre base, que es el más compatible
      // Sustituye por este en tu reading.service.ts
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
      }, {
        apiVersion: 'v1' // <--- Forzamos la versión estable en lugar de la beta
      });

      // 3. Generar contenido
      const result = await model.generateContent(prompt);
      const response = await result.response;

      return {
        success: true,
        answer: response.text()
      };

    } catch (error) {
      this.logger.error(`❌ Error consultando Gemini: ${error.message}`);
      return {
        success: false,
        error: 'No pude conectar con la IA en este momento.'
      };
    }
  }



}