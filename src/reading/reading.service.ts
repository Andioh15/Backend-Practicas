import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(Readings)
    private readingRepository: Repository<Readings>,

    @InjectRepository(Sensors)
    private sensorRepository: Repository<Sensors>,

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
  // 2. DASHBOARD: TARJETAS SUPERIORES (Snapshot actual)
  // ==========================================================
  async getAverageSummaryFromDB(): Promise<any> {
    // Alimenta: Temperatura promedio, CO2 actual, Ahorro energético, etc.
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];
  }

  // ==========================================================
  // 3. DASHBOARD: GRÁFICO PRINCIPAL (Promedios Globales)
  // ==========================================================
  async getDashboardDailyMetrics(days: number = 7) {
    // Retorna: Fecha | Temp Promedio | Hum Promedio | CO2 Promedio (De todo el campus)
    return this.readingRepository.query(
      'SELECT * FROM get_dashboard_daily_metrics($1)',
      [days]
    );
  }

  // ==========================================================
  // 4. PESTAÑAS DE ANÁLISIS (Semanal / Mensual / Anual)
  // ==========================================================
  async getCampusAnalysis(mode: string) {
    const validModes = ['semanal', 'mensual', 'anual'];
    const selectedMode = mode.toLowerCase();

    if (!validModes.includes(selectedMode)) {
      throw new Error('Modo inválido. Use: semanal, mensual, anual');
    }

    // Retorna: Etiqueta (Lunes/Enero/2024) | Temp | Hum | CO2
    return this.readingRepository.query(
      'SELECT * FROM get_campus_analysis($1)',
      [selectedMode]
    );
  }

  // ==========================================================
  // 5. TABLA DETALLADA (Paginación y Filtros)
  // ==========================================================
  async findAllPaginated(
    blockId?: number, 
    buildingId?: number, 
    roomId?: number, 
    limit = 25, 
    offset = 0
  ) {
    // Llama a la función optimizada que filtra por ubicación
    return this.readingRepository.query(
      'SELECT * FROM get_last_readings($1, $2, $3, $4, $5)', 
      [blockId, buildingId, roomId, limit, offset]
    );
  }
}