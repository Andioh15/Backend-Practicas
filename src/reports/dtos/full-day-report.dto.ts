export class FullDayReportDto {
  readonly date: string; // Formato: YYYY-MM-DD
  readonly measurementType: 'Temperature' | 'Humidity' | 'CO2';
}
