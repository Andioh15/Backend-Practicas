import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
import { Rooms } from '../entities/rooms.entity';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Rooms)
    private roomRepository: Repository<Rooms>,
  ) {}

  findAll(): Promise<Rooms[]> {
    return this.roomRepository.find();
  }

  findByBuilding(id_building: number): Promise<Rooms[]> {
    return this.roomRepository.find({ where: { building_id: id_building } });
  }

  async create(room: Rooms): Promise<Rooms> {
    try {
      return await this.roomRepository.save(room);
    } catch (error) {
      rethrowDbError(error, 'el aula');
    }
  }

  async findOne(id: number): Promise<Rooms> {
    const item = await this.roomRepository.findOneBy({ room_id: id });
    if (!item) throw new NotFoundException(`No existe el aula con ID ${id}`);
    return item;
  }

  async update(id: number, data: Partial<Rooms>): Promise<Rooms> {
    await this.findOne(id);
    const { room_id: _ignored, ...changes } = data;
    try {
      await this.roomRepository.update(id, changes);
    } catch (error) {
      rethrowDbError(error, 'el aula');
    }
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.roomRepository.delete(id);
    } catch (error) {
      rethrowDbError(error, 'el aula');
    }
  }
}
