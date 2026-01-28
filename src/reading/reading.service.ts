import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity';
import { CreateReadingDto } from '../reports/dtos/create-reading.dto';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(Readings)
    private readingRepository: Repository<Readings>,

    @InjectRepository(Sensors)
    private sensorRepository: Repository<Sensors>,

    private dataSource: DataSource,
  ) {}

  findAll(): Promise<Readings[]> {
    return this.readingRepository.find();
  }

  // Este método sirve tanto para el POST del Controller como para MQTT
  async create(dto: CreateReadingDto | any): Promise<Readings> {
    
    // Creamos la entidad mapeando los campos a tu tabla 'readings'
    const newReading = this.readingRepository.create({
      sensor_id: dto.sensor_id, // Coincide con la FK de tu tabla
      value: dto.value,         // Coincide con NUMERIC(10,2)
      
      // Si no viene fecha (caso MQTT), usamos la actual.
      // Tu DB tiene DEFAULT CURRENT_TIMESTAMP, pero TypeORM suele preferir enviar el dato.
      reading_timestamp: dto.reading_timestamp ? new Date(dto.reading_timestamp) : new Date(),
    });

    return await this.readingRepository.save(newReading);
  }

  async getAverageSummaryFromDB(): Promise<any> {
    const rawResult = await this.readingRepository.query('SELECT * FROM get_average_summary();');
    return rawResult[0];
  }
}