import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityBill } from '../entities/bill.entity';

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(UtilityBill)
    private readonly billRepository: Repository<UtilityBill>,
  ) {}

  async createBill(billData: Partial<UtilityBill>): Promise<UtilityBill> {
    const newBill = this.billRepository.create(billData);
    return await this.billRepository.save(newBill);
  }

  async findAll(): Promise<UtilityBill[]> {
    return await this.billRepository.find({
      order: { issue_date: 'DESC' },
    });
  }

  // 👇 NUEVO: Método para buscar una factura específica
  async findOne(id: number): Promise<UtilityBill> {
    const bill = await this.billRepository.findOne({ where: { id } });
    if (!bill) {
      throw new NotFoundException(`La planilla con ID ${id} no existe.`);
    }
    return bill;
  }

  async remove(id: number): Promise<void> {
    const bill = await this.findOne(id);
    await this.billRepository.remove(bill);
  }
}