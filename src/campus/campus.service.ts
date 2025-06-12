import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campus } from '../entities/campuses.entity';

@Injectable()
export class CampusService {
  constructor(
    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,
  ) {}

  findAll(): Promise<Campus[]> {
    return this.campusRepository.find();
  }

  create(campus: Campus): Promise<Campus> {
    return this.campusRepository.save(campus);
  }
}
