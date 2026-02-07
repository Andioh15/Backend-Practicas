import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class ExportReadingsDto {
  @IsDateString()
  startDate: string; // YYYY-MM-DD

  @IsDateString()
  endDate: string;   // YYYY-MM-DD

  @IsOptional()
  @IsString()
  type?: string; // 'Temperature', 'Humidity', 'CO2', 'Energy' o vacio para todos

  @IsOptional()
  @IsNumber()
  blockId?: number;

  @IsOptional()
  @IsNumber()
  buildingId?: number;

  @IsOptional()
  @IsNumber()
  roomId?: number;
}