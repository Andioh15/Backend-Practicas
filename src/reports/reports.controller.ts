import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { WeeklyReportDto } from './dtos/weekly-report.dto';
import { MonthlyReportDto } from './dtos/monthly-report.dto';
import { YearlyReportDto } from './dtos/yearly-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly')
  async getWeeklyReport(@Query() queryParams: WeeklyReportDto) {
    return this.reportsService.getWeeklyReport(queryParams);
  }

  @Get('monthly')
  async getMonthlyReport(@Query() queryParams: MonthlyReportDto) {
    return this.reportsService.getMonthlyReport(queryParams);
  }

  @Get('yearly')
  async getYearlyReport(@Query() queryParams: YearlyReportDto) {
    return this.reportsService.getYearlyReport(queryParams);
  }
}