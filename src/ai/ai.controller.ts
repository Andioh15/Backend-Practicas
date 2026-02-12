import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('chat')
  async chat(@Body() body: { message: string }) {
    return {
      answer: await this.ai.chat(body.message)
    };
  }
}
