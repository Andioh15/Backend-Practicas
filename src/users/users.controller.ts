import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/users.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() user: User): Promise<User> {
    return this.usersService.create(user);
  }
}
