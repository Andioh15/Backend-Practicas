export class FullMonthReportDto {
  readonly month: number; // 1-12
  readonly year: number;
  readonly measurementType: 'Temperature' | 'Humidity' | 'CO2';
}
