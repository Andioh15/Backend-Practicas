export class YearlyReportDto {
  readonly year: number;
  readonly measurementType: 'Temperature' | 'Humidity' | 'CO2';
}