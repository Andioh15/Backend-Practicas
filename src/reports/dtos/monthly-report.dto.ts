export class MonthlyReportDto {
  readonly month: number;
  readonly year: number;
  readonly measurementType: 'Temperature' | 'Humidity' | 'CO2';
}