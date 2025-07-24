import { IsNumber, IsOptional, IsISO8601 } from 'class-validator';

export class CreateReadingDto {
  @IsNumber()
  sensor_id: number;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsISO8601()
  reading_timestamp?: string; // opcional, se usa new Date() si no se envía
}