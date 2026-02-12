import { Injectable } from '@nestjs/common';
import { ReadingService } from '../reading/reading.service';

@Injectable()
export class AnalysisService {
    constructor(private reading: ReadingService) { }

    // 🔥 Tool: Temperatura actual
    async getTemperature(block: string) {
        console.log("🌡 Consultando temperatura real...");
        return this.reading.getSummary();
    }

    async getCO2Trend(block: string) {
        console.log("🫁 Consultando CO2 real...");
        return this.reading.getHistoryMetrics("CO2");
    }




    // Extras disponibles
    getSolarImpact() {
        return this.reading.getSolarEcoImpact();
    }

    getSolarDetail() {
        return this.reading.getSolarDetailLocal();
    }

    getCampus(metric: string) {
        return this.reading.getCampusAnalysis(metric);
    }

    getHistory(type: string) {
        return this.reading.getHistoryMetrics(type);
    }


}
