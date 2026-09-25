import { Controller, Body, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { RoomService } from './room.service';
import { Rooms } from '../entities/rooms.entity';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findAll(): Promise<Rooms[]> {
    return this.roomService.findAll();
  }

  @Get('building/:id_building')
  findByBuilding(@Param('id_building') id_building: number): Promise<Rooms[]> {
    return this.roomService.findByBuilding(id_building);
  }

  @Post()
  create(@Body() room: Rooms): Promise<Rooms> {
    return this.roomService.create(room);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Rooms>): Promise<Rooms> {
    return this.roomService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roomService.delete(id);
  }
}
