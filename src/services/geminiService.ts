import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') as string;
    aiInstance = new GoogleGenAI({ 
      apiKey: apiKey || ""
    });
  }
  return aiInstance;
};

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
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '';
    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada. Ative a IA nas configurações do projeto.");
    }
    const prompt = `Crie um exercício de treinamento profissional altamente criativo para a modalidade: ${modality}. ${goal ? `Objetivo específico: ${goal}` : ''}
    O exercício deve incluir posicionamento estratégico de materiais (cones, barreiras, estacas) e jogadores.
    Gere um array visualData com pelo menos 5 objetos.
    IMPORTANTE: Para objetos móveis (jogadores e bola), SEMPRE defina 'animate' como true e forneça 'toX' e 'toY' diferentes de 'x' e 'y' para criar animação.
    Tipos de materiais: cone, barrier, arrow, player, ball.
    Para players, use equipes (A, B, C, D) e labels (números).
    Retorne a descrição detalhada do exercício.
    A descrição deve ser profissional e em Português-BR.`;

    const ai = getAI();
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
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '';
    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada. Ative a IA nas configurações do projeto.");
    }
    const prompt = `Gere 3 sugestões de exercícios profissionais de nível elite para a modalidade: ${modality}. 
    Inclua um exercício de Aquecimento, um de Fundamento e um Tático.
    Para cada um, gere um array visualData com pelo menos 4 objetos.
    IMPORTANTE: Para objetos móveis (jogadores e bola), SEMPRE defina 'animate' como true e forneça 'toX' e 'toY' diferentes de 'x' e 'y' para criar animação.
    Tudo em Português-BR.`;

    const ai = getAI();
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
