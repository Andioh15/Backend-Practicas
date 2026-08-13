import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  /** Meta calls this endpoint once to validate the webhook URL. */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() reply: any,
  ) {
    if (this.whatsAppService.isValidVerifyToken(mode, verifyToken)) {
      return reply.status(200).send(challenge);
    }

    return reply.status(403).send({ message: 'Token de verificación inválido' });
  }

  /** Meta delivers inbound WhatsApp messages here. */
  @Post('webhook')
  @HttpCode(200)
  async receiveWebhook(@Body() payload: unknown) {
    await this.whatsAppService.handleWebhook(payload);
    return { received: true };
  }

  /** Safe local check: no message is sent unless WhatsApp is configured. */
  @Post('report')
  async sendReport() {
    return this.whatsAppService.sendEnvironmentalReport();
  }
}
