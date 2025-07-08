export class FullYearReportDto {
  readonly year: number;
  readonly measurementType: 'Temperature' | 'Humidity' | 'CO2';
}
