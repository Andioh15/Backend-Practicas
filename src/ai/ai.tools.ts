import { SchemaType, FunctionDeclaration } from '@google/generative-ai';

export const tools: FunctionDeclaration[] = [
  {
    name: "getCurrentTemperature",
    description: "Obtiene la temperatura actual por bloque",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        block: { type: SchemaType.STRING }
      },
      required: ["block"]
    }
  },
  {
    name: "getCO2Trend",
    description: "Obtiene tendencia de CO2 en las últimas horas",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        block: { type: SchemaType.STRING }
      },
      required: ["block"]
    }
  }
];
