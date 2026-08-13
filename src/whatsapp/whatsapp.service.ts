import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Readings } from '../entities/readings.entity';
import { Sensors } from '../entities/sensors.entity';

type Metric = { sensorType: string; value: number; unit: string; room: string; timestamp: Date };

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly lastAlertAt = new Map<number, number>();

  constructor(
    @InjectRepository(Readings) private readonly readings: Repository<Readings>,
    @InjectRepository(Sensors) private readonly sensors: Repository<Sensors>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  isValidVerifyToken(mode: string, token: string): boolean {
    return mode === 'subscribe' && !!token && token === this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
  }

  private get enabled(): boolean {
    return Boolean(
      this.config.get<string>('WHATSAPP_ACCESS_TOKEN') &&
        this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
    );
  }

  private get recipient(): string | undefined {
    return this.config.get<string>('WHATSAPP_RECIPIENT_PHONE');
  }

  private async sendText(to: string, body: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('WhatsApp no configurado: mensaje omitido.');
      return false;
    }

    const version = this.config.get<string>('WHATSAPP_API_VERSION') || 'v21.0';
    const phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    const token = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');

    try {
      await lastValueFrom(
        this.http.post(
          `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
          { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return true;
    } catch (error: any) {
      this.logger.error(`No se pudo enviar WhatsApp: ${error.response?.data?.error?.message ?? error.message}`);
      return false;
    }
  }

  private async latestMetrics(): Promise<Metric[]> {
    return this.readings.query(`
      SELECT DISTINCT ON (LOWER(s.sensor_type))
        s.sensor_type AS "sensorType", r.value, s.sensor_measurement_unit AS unit,
        COALESCE(ro.room_name, 'Sin ubicación') AS room, r.reading_timestamp AS timestamp
      FROM readings r
      JOIN sensors s ON s.sensor_id = r.sensor_id
      LEFT JOIN rooms ro ON ro.room_id = s.room_id
      ORDER BY LOWER(s.sensor_type), r.reading_timestamp DESC, r.reading_id DESC
    `);
  }

  private metricFor(metrics: Metric[], names: string[]): Metric | undefined {
    return metrics.find((metric) => names.some((name) => metric.sensorType.toLowerCase().includes(name)));
  }

  private displayMetric(metric: Metric | undefined, label: string, emoji: string): string {
    return metric ? `${emoji} ${label}: ${Number(metric.value).toFixed(1)} ${metric.unit}` : `${emoji} ${label}: sin datos`;
  }

  async sendEnvironmentalReport(to = this.recipient): Promise<{ sent: boolean; message: string }> {
    if (!to) return { sent: false, message: 'Falta WHATSAPP_RECIPIENT_PHONE.' };

    const metrics = await this.latestMetrics();
    const temperature = this.metricFor(metrics, ['temp']);
    const co2 = this.metricFor(metrics, ['co2', 'co₂']);
    const humidity = this.metricFor(metrics, ['humid']);
    const energy = this.metricFor(metrics, ['energy', 'solar', 'energía']);
    const date = new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guayaquil',
    }).format(new Date());
    const body = [
      '🌱 MONITOREO AMBIENTAL — PUCE MANABÍ',
      `🗓️ ${date}`,
      '',
      this.displayMetric(temperature, 'Temperatura', '🌡️'),
      this.displayMetric(co2, 'CO₂', '💨'),
      this.displayMetric(humidity, 'Humedad', '💧'),
      this.displayMetric(energy, 'Energía solar', '☀️'),
      '',
      '🏫 Campus Inteligente',
    ].join('\n');

    const sent = await this.sendText(to, body);
    return { sent, message: sent ? 'Reporte enviado.' : 'Reporte no enviado; revisa la configuración.' };
  }

  async notifyReadingCreated(reading: Readings): Promise<void> {
    if (!this.enabled || !this.recipient) return;

    const sensor = await this.sensors.findOne({ where: { sensor_id: reading.sensor_id }, relations: { room: true } });
    if (!sensor || !this.isOutOfRange(sensor.sensor_type, reading.value)) return;

    const cooldown = Number(this.config.get<string>('WHATSAPP_ALERT_COOLDOWN_MINUTES') || 30) * 60_000;
    const lastSent = this.lastAlertAt.get(sensor.sensor_id) || 0;
    if (Date.now() - lastSent < cooldown) return;

    const body = [
      '🚨 ALERTA AMBIENTAL',
      `📍 ${sensor.room?.room_name ?? 'Ubicación no disponible'}`,
      `${this.emojiFor(sensor.sensor_type)} ${sensor.sensor_type}: ${Number(reading.value).toFixed(1)} ${sensor.sensor_measurement_unit}`,
      `⚠️ ${this.alertExplanation(sensor.sensor_type)}`,
      'Se recomienda revisar el aula.',
    ].join('\n');

    if (await this.sendText(this.recipient, body)) this.lastAlertAt.set(sensor.sensor_id, Date.now());
  }

  private isOutOfRange(sensorType: string, value: number): boolean {
    const type = sensorType.toLowerCase();
    if (type.includes('temp')) return value < Number(this.config.get('ALERT_TEMPERATURE_MIN') || 20) || value > Number(this.config.get('ALERT_TEMPERATURE_MAX') || 26);
    if (type.includes('co2') || type.includes('co₂')) return value > Number(this.config.get('ALERT_CO2_MAX') || 1000);
    if (type.includes('humid')) return value < Number(this.config.get('ALERT_HUMIDITY_MIN') || 30) || value > Number(this.config.get('ALERT_HUMIDITY_MAX') || 70);
    return false;
  }

  private alertExplanation(sensorType: string): string {
    const type = sensorType.toLowerCase();
    if (type.includes('temp')) return 'La temperatura está fuera del rango recomendado de 20–26 °C.';
    if (type.includes('co2') || type.includes('co₂')) return 'El CO₂ supera el límite recomendado de 1000 ppm.';
    return 'La humedad está fuera del rango recomendado de 30–70 %.';
  }

  private emojiFor(sensorType: string): string {
    const type = sensorType.toLowerCase();
    if (type.includes('temp')) return '🌡️';
    if (type.includes('co2') || type.includes('co₂')) return '💨';
    return '💧';
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledReport(): Promise<void> {
    if (this.config.get<string>('WHATSAPP_REPORT_ENABLED') === 'true') await this.sendEnvironmentalReport();
  }

  async handleWebhook(payload: any): Promise<void> {
    const messages = payload?.entry?.flatMap((entry: any) => entry.changes ?? [])
      ?.flatMap((change: any) => change.value?.messages ?? []) ?? [];

    for (const message of messages) {
      if (message.type !== 'text' || !message.from) continue;
      const command = String(message.text?.body || '').trim().toLowerCase();
      const response = await this.responseFor(command);
      await this.sendText(message.from, response);
    }
  }

  private async responseFor(command: string): Promise<string> {
    if (['mediciones', 'reporte', 'estado'].includes(command)) {
      const result = await this.reportText();
      return result;
    }
    if (['temperatura', 'humedad', 'co2', 'co₂', 'energia', 'energía'].includes(command)) {
      const names = command.startsWith('temp') ? ['temp'] : command.startsWith('humid') ? ['humid'] : command.startsWith('co') ? ['co2', 'co₂'] : ['energy', 'solar', 'energía'];
      const metric = this.metricFor(await this.latestMetrics(), names);
      return metric ? `${this.emojiFor(metric.sensorType)} ${metric.sensorType} actual\n${Number(metric.value).toFixed(1)} ${metric.unit}\n📍 ${metric.room}` : 'No hay una lectura disponible para esa métrica.';
    }
    if (command === 'alertas') return 'Las alertas se envían automáticamente cuando una lectura sale del rango configurado.';
    return 'Comandos disponibles: mediciones, temperatura, humedad, co2, energia, alertas, reporte.';
  }

  private async reportText(): Promise<string> {
    const metrics = await this.latestMetrics();
    return [
      '🤖 MONITOREO PUCE', '',
      this.displayMetric(this.metricFor(metrics, ['temp']), 'Temperatura', '🌡️'),
      this.displayMetric(this.metricFor(metrics, ['co2', 'co₂']), 'CO₂', '💨'),
      this.displayMetric(this.metricFor(metrics, ['humid']), 'Humedad', '💧'),
      this.displayMetric(this.metricFor(metrics, ['energy', 'solar', 'energía']), 'Energía', '☀️'),
    ].join('\n');
  }
}
