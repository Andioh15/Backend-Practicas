import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { UtilityBill } from '../entities/bill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UtilityBill])],
  controllers: [BillsController],
  providers: [BillsService],
})
export class BillsModule {}