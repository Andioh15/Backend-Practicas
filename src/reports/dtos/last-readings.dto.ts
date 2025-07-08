import { IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class LastReadingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  blockId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  buildingId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 25, 50, 100])
  limit: 10 | 25 | 50 | 100 = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}
