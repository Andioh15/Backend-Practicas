import { Body, Controller, Get, Query, UsePipes,ValidationPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { WeeklyReportDto } from './dtos/weekly-report.dto';
import { MonthlyReportDto } from './dtos/monthly-report.dto';
import { YearlyReportDto } from './dtos/yearly-report.dto';
import { FullDayReportDto } from './dtos/full-day-report.dto';
import { FullMonthReportDto } from './dtos/full-month-report.dto';
import { FullYearReportDto } from './dtos/full-year-report.dto';
import { LastReadingsDto } from './dtos/last-readings.dto';

@Controller('reports')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  transformOptions: { enableImplicitConversion: true }
}))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly')
  async getWeeklyReport(@Body() queryParams: WeeklyReportDto) {
    return this.reportsService.getWeeklyReport(queryParams);
  }

  @Get('monthly')
  async getMonthlyReport(@Body() queryParams: MonthlyReportDto) {
    return this.reportsService.getMonthlyReport(queryParams);
  }

  @Get('yearly')
  async getYearlyReport(@Body() queryParams: YearlyReportDto) {
    return this.reportsService.getYearlyReport(queryParams);
  }

  @Get('full-day')
  async getReadingsByDay(@Body() queryParams: FullDayReportDto) {
    return this.reportsService.getReadingsByDay(
      queryParams.date,
      queryParams.measurementType
    );
  }

  @Get('full-month')
  async getReadingsByMonth(@Body() queryParams: FullMonthReportDto) {
    return this.reportsService.getReadingsByMonth(
      queryParams.month,
      queryParams.year,
      queryParams.measurementType
    );
  }

  @Get('full-year')
  async getReadingsByYear(@Body() queryParams: FullYearReportDto) {
    return this.reportsService.getReadingsByYear(
      queryParams.year,
      queryParams.measurementType
    );
  }

  @Get('last-readings')
  async getLastReadings(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    params: LastReadingsDto
  ) {
    return this.reportsService.getLastReadings(params);
  }
}