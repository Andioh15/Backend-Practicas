import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
import { Professor } from '../entities/professors.entity';

@Injectable()
export class ProfessorService {
  constructor(
    @InjectRepository(Professor)
    private readonly professorRepo: Repository<Professor>,
  ) {}

  async findAll() {
    return await this.professorRepo.find();
  }

  async findOne(id: string) {
    const prof = await this.professorRepo.findOneBy({ professor_id: id });
    if (!prof) throw new NotFoundException(`Profesor con ID ${id} no encontrado`);
    return prof;
  }

  async create(data: Partial<Professor>) {
    const newProf = this.professorRepo.create(data);
    try {
      return await this.professorRepo.save(newProf);
    } catch (error) {
      rethrowDbError(error, 'el docente');
    }
  }

  async update(id: string, data: Partial<Professor>) {
    await this.findOne(id); // Verifica si existe
    try {
      await this.professorRepo.update(id, data);
    } catch (error) {
      rethrowDbError(error, 'el docente');
    }
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.findOne(id);
    try {
      return await this.professorRepo.delete(id);
    } catch (error) {
      rethrowDbError(error, 'el docente');
    }
  }
}