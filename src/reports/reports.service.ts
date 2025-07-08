import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyReportDto } from './dtos/weekly-report.dto';
import { MonthlyReportDto } from './dtos/monthly-report.dto';
import { YearlyReportDto } from './dtos/yearly-report.dto';
import { Readings } from 'src/entities/readings.entity';
import { LastReadingsDto } from './dtos/last-readings.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Readings) 
    private readonly connection: Repository<Readings>,
  ) {}

  async getWeeklyReport(params: WeeklyReportDto): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM get_weekly_averages($1, $2)',
      [params.startDate, params.measurementType]
    );
  }

  async getMonthlyReport(params: MonthlyReportDto): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM get_monthly_averages($1, $2, $3)',
      [params.month, params.year, params.measurementType]
    );
  }

  async getYearlyReport(params: YearlyReportDto): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM get_yearly_averages($1, $2)',
      [params.year, params.measurementType]
    );
  }

  async getReadingsByDay(date: string, measurementType: string): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM get_readings_by_day_full($1, $2)',
      [date, measurementType]
    );
  }

  async getReadingsByMonth(month: number, year: number, measurementType: string): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM get_readings_by_month_full($1, $2, $3)',
      [month, year, measurementType]
    );
  }

  async getReadingsByYear(year: number, measurementType: string): Promise<any[]> {
    return this.connection.query(
      'SELECT * FROM get_readings_by_year_full($1, $2)',
      [year, measurementType]
    );
  }

  async getLastReadings(params: LastReadingsDto): Promise<any[]> {
    // destructurar con valores por defecto
    const {
      blockId,
      buildingId,
      roomId,
      limit = 25,
      page  = 1,
    } = params;

    const offset = (page - 1) * limit;

    // Construir WHERE dinámico
    const whereClauses: string[] = [];
    const values: any[] = [];

    if (blockId != null) {
      values.push(blockId);
      whereClauses.push(`b.block_id    = $${values.length}`);
    }
    if (buildingId != null) {
      values.push(buildingId);
      whereClauses.push(`bu.building_id = $${values.length}`);
    }
    if (roomId != null) {
      values.push(roomId);
      whereClauses.push(`ro.room_id     = $${values.length}`);
    }

    // Añadir paginación
    values.push(limit, offset);
    const limitIndex  = values.length - 1;
    const offsetIndex = values.length;

    const whereSql = whereClauses.length
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    const sql = `
      SELECT
        DATE(r.reading_timestamp)                    AS fecha,
        TO_CHAR(r.reading_timestamp,'HH24:MI')        AS hora,
        r.value::NUMERIC(10,2)                       AS medicion,
        b.block_name                                 AS bloque,
        bu.building_name                             AS edificio,
        ro.room_name                                 AS aula
      FROM readings r
      JOIN sensors   s  ON r.sensor_id    = s.sensor_id
      JOIN rooms     ro ON s.room_id      = ro.room_id
      JOIN buildings bu ON ro.building_id = bu.building_id
      JOIN blocks    b  ON bu.block_id     = b.block_id
      ${whereSql}
      ORDER BY r.reading_timestamp DESC, r.reading_id DESC
      LIMIT  $${limitIndex}
      OFFSET $${offsetIndex}
    `;

    return this.connection.query(sql, values);
  }
}