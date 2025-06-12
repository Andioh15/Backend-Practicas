export class WeeklyReportDto {
  readonly startDate: Date;
  readonly measurementType: 'Temperature' | 'Humidity' | 'CO2';
}