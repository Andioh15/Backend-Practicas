import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedules.entity';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
  ) {}

  async findAll() {
    // Retorna los horarios anidando los nombres reales de aula, materia y profesor
    return await this.scheduleRepo.find({
      relations: ['room', 'subject', 'professor'],
    });
  }

  async findOne(id: number) {
    const schedule = await this.scheduleRepo.findOne({
      where: { schedule_id: id },
      relations: ['room', 'subject', 'professor'],
    });
    if (!schedule) throw new NotFoundException(`Horario con ID ${id} no encontrado`);
    return schedule;
  }

  async create(data: Partial<Schedule>) {
    return await this.scheduleRepo.save(this.scheduleRepo.create(data));
  }

  async update(id: number, data: Partial<Schedule>) {
    await this.findOne(id);
    await this.scheduleRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: number) {
    await this.findOne(id);
    return await this.scheduleRepo.delete(id);
  }
}