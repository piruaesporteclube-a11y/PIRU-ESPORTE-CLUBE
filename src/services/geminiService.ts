import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: (import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '')) as string 
});

export interface GeneratedDrill {
  name: string;
  description: string;
  category: string;
  intensity: 'Baixa' | 'Média' | 'Alta';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: number;
  equipment: string;
  visualData: string; // JSON string
}

export const geminiService = {
  async generateDrill(modality: string, goal?: string): Promise<GeneratedDrill> {
    const prompt = `Crie um exercício de treinamento profissional altamente criativo para a modalidade: ${modality}. ${goal ? `Objetivo específico: ${goal}` : ''}
    O exercício deve incluir posicionamento estratégico de materiais (cones, barreiras, estacas) e jogadores.
    O esquema tático (visualData) deve ser rico em elementos.
    Tipos de materiais: cone, barrier, arrow.
    Para players, use equipes (A, B, C, D) e labels (números).
    Para animações de movimento, preencha toX e toY (em uma escala de 0 a 100).
    A descrição deve ser profissional e em Português-BR.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { 
              type: Type.STRING, 
              enum: ["Aquecimento", "Alongamento", "Coordenação Motora", "Fundamento", "Ataque", "Defesa", "Agilidade", "Físico", "Tático", "Goleiro", "Conscientização", "Outro"] 
            },
            intensity: { type: Type.STRING, enum: ['Baixa', 'Média', 'Alta'] },
            difficulty: { type: Type.STRING, enum: ['Iniciante', 'Intermediário', 'Avançado'] },
            duration: { type: Type.NUMBER },
            equipment: { type: Type.STRING },
            visualData: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['player', 'ball', 'cone', 'barrier', 'arrow'] },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  toX: { type: Type.NUMBER },
                  toY: { type: Type.NUMBER },
                  team: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
                  label: { type: Type.STRING },
                  animate: { type: Type.BOOLEAN }
                },
                required: ['id', 'type', 'x', 'y']
              }
            }
          },
          required: ['name', 'description', 'category', 'intensity', 'difficulty', 'duration', 'equipment', 'visualData']
        } as any
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      ...result,
      visualData: JSON.stringify(result.visualData)
    };
  },

  async generateSuggestions(modality: string): Promise<GeneratedDrill[]> {
    const prompt = `Gere 3 sugestões de exercícios profissionais de nível elite para a modalidade: ${modality}. 
    Inclua um exercício de Aquecimento, um de Fundamento e um Tático.
    Para cada um, forneça descrição completa e o JSON do esquema tático rico em detalhes e movimentos (toX/toY).
    Tudo em Português-BR.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: ["Aquecimento", "Alongamento", "Coordenação Motora", "Fundamento", "Ataque", "Defesa", "Agilidade", "Físico", "Tático", "Goleiro", "Conscientização", "Outro"] 
              },
              intensity: { type: Type.STRING, enum: ['Baixa', 'Média', 'Alta'] },
              difficulty: { type: Type.STRING, enum: ['Iniciante', 'Intermediário', 'Avançado'] },
              duration: { type: Type.NUMBER },
              equipment: { type: Type.STRING },
              visualData: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['player', 'ball', 'cone', 'barrier', 'arrow'] },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    toX: { type: Type.NUMBER },
                    toY: { type: Type.NUMBER },
                    team: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
                    label: { type: Type.STRING },
                    animate: { type: Type.BOOLEAN }
                  },
                  required: ['id', 'type', 'x', 'y']
                }
              }
            },
            required: ['name', 'description', 'category', 'intensity', 'difficulty', 'duration', 'equipment', 'visualData']
          }
        } as any
      }
    });

    const list = JSON.parse(response.text || '[]');
    return list.map((item: any) => ({
      ...item,
      visualData: JSON.stringify(item.visualData)
    }));
  }
};
