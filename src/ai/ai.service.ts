import { Injectable } from '@nestjs/common';
import {
    GoogleGenerativeAI,
    FunctionCallingMode
} from '@google/generative-ai';

import { AnalysisService } from './analysis.service';
import { tools } from './ai.tools';

@Injectable()
export class AiService {

    private model;

    private systemPrompt = `
Eres un asistente del Sistema de Monitoreo Ambiental.

REGLAS IMPORTANTES:
- Si el usuario pide temperatura, CO2, humedad o tendencias
  DEBES usar funciones
- No inventes datos
- Responde siempre en español
`;

    constructor(private analysis: AnalysisService) {

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        this.model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ functionDeclarations: tools }],
            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingMode.ANY
                }
            }
        });
    }

    // =========================================================
    // 🔥 Limpieza de tipos
    // =========================================================
    private sanitizeToolResponse(data: any) {

        if (!data) return {};

        return Object.fromEntries(
            Object.entries(data).map(([k, v]) => {
                const num = Number(v);
                return [k, isNaN(num) ? v : num];
            })
        );
    }

    // =========================================================
    // 🚀 CHAT PRINCIPAL
    // =========================================================
    async chat(message: string) {

        console.log("\n================ USER MESSAGE ================");
        console.log(message);

        const chat = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: this.systemPrompt }]
                }
            ]
        });

        // STEP 1
        const first = await chat.sendMessage(message);
        const response = first.response;

        console.log("\n========== GEMINI STEP 1 ==========");
        console.log("FunctionCalls:", response.functionCalls());
        console.log("Text:", response.text());
        console.log("===================================");

        const call = response.functionCalls()?.[0];

        if (!call) {
            return response.text() || "Gemini no devolvió texto.";
        }

        // STEP 2 TOOL
        console.log("\n🧰 TOOL SOLICITADO:", call.name);
        console.log("ARGS:", call.args);

        let data: any;

        switch (call.name) {
            case "getCurrentTemperature":
                data = await this.analysis.getTemperature(call.args.block);
                break;

            case "getCO2Trend":
                data = await this.analysis.getCO2Trend(call.args.block);
                break;

            default:
                data = {};
        }

        console.log("\n📦 DATA ORIGINAL TOOL:");
        console.log(data);

        const cleanData = this.sanitizeToolResponse(data);

        console.log("\n🧼 DATA LIMPIA:");
        console.log(cleanData);

        // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
        // RESPUESTA CORRECTA A GEMINI
        // ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

        const final = await this.model.generateContent({

            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingMode.NONE
                }
            },

            contents: [

                {
                    role: "user",
                    parts: [{ text: this.systemPrompt }]
                },

                {
                    role: "user",
                    parts: [{ text: message }]
                },

                {
                    role: "model",
                    parts: [{ functionCall: call }]
                },

                {
                    role: "tool",
                    parts: [{
                        functionResponse: {
                            name: call.name,
                            response: cleanData
                        }
                    }]
                }
            ]
        });


        // LOG PROFUNDO
        console.log("\n========== RAW GEMINI RESPONSE ==========");
        console.dir(final.response, { depth: null });

        const answer =
            final.response.text()
            || final.response.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log("\n========== GEMINI FINAL ==========");
        console.log(answer);
        console.log("==================================");

        return answer || "No se pudo generar respuesta.";
    }

}
