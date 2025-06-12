import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyReportDto } from './dtos/weekly-report.dto';
import { MonthlyReportDto } from './dtos/monthly-report.dto';
import { YearlyReportDto } from './dtos/yearly-report.dto';
import { Readings } from 'src/entities/readings.entity';

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
}