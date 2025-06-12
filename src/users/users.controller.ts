import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { Users } from '../entities/users.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<Users[]> {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() user: Users): Promise<Users> {
    return this.usersService.create(user);
  }
}
