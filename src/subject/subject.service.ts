import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowDbError } from '../common/db-errors';
import { Subject } from '../entities/subjects.entity';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async findAll() { return await this.subjectRepo.find(); }

  async findOne(id: number) {
    const subj = await this.subjectRepo.findOneBy({ subject_id: id });
    if (!subj) throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    return subj;
  }

  async create(data: Partial<Subject>) {
    try {
      return await this.subjectRepo.save(this.subjectRepo.create(data));
    } catch (error) {
      rethrowDbError(error, 'la materia');
    }
  }

  async update(id: number, data: Partial<Subject>) {
    await this.findOne(id);
    try {
      await this.subjectRepo.update(id, data);
    } catch (error) {
      rethrowDbError(error, 'la materia');
    }
    return this.findOne(id);
  }

  async delete(id: number) {
    await this.findOne(id);
    try {
      return await this.subjectRepo.delete(id);
    } catch (error) {
      rethrowDbError(error, 'la materia');
    }
  }
}