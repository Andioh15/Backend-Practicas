import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  findAll(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  create(room: Room): Promise<Room> {
    return this.roomRepository.save(room);
  }
}
