import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
  TypeOrmModule.forRoot({
    type: 'postgres',
    host: process.env.HOST,
    username: process.env.USER,
    password: process.env.PASSWORD+"",
    database: process.env.DATABASE, 
    port: 5432, 
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true, // Set to false in production
    retryAttempts: 3, // Retry connection attempts
    retryDelay: 3000, // Delay between retries in milliseconds
  }),
  
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
