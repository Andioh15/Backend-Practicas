
import { Module } from '@nestjs/common';
import { ReadingModule } from 'src/reading/reading.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AnalysisService } from './analysis.service';


@Module({
  imports: [ReadingModule],
  providers: [AiService, AnalysisService],
  controllers: [AiController]
})
export class AiModule {}
