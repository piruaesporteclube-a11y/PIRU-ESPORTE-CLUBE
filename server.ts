import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini SDK on server-side
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chave da API Gemini não configurada no servidor (GEMINI_API_KEY).");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
};

export async function createExpressApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
       console.log(`[Server] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini API - Generate Drill
  app.post("/api/gemini/generate-drill", async (req, res) => {
    try {
      const { modality, goal } = req.body;
      if (!modality) {
        return res.status(400).json({ success: false, error: "Modalidade é obrigatória." });
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
        model: "gemini-3.5-flash",
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

      const text = response.text;
      if (!text) {
        throw new Error("Resposta em branco do Gemini API");
      }
      const result = JSON.parse(text);
      res.json({
        ...result,
        visualData: JSON.stringify(result.visualData)
      });
    } catch (error: any) {
      console.error("[Gemini error]", error);
      res.status(500).json({ success: false, error: error.message || "Erro interno do servidor ao gerar exercício." });
    }
  });

  // Gemini API - Generate Suggestions
  app.post("/api/gemini/generate-suggestions", async (req, res) => {
    try {
      const { modality } = req.body;
      if (!modality) {
        return res.status(400).json({ success: false, error: "Modalidade é obrigatória." });
      }

      const prompt = `Gere 3 sugestões de exercícios profissionais de nível elite para a modalidade: ${modality}. 
    Inculte um exercício de Aquecimento, um de Fundamento e um Tático.
    Para cada um, gere um array visualData com pelo menos 4 objetos.
    IMPORTANTE: Para objetos móveis (jogadores e bola), SEMPRE defina 'animate' como true e forneça 'toX' e 'toY' diferentes de 'x' e 'y' para criar animação.
    Tudo em Português-BR.`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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

      const text = response.text;
      if (!text) {
        throw new Error("Resposta em branco do Gemini API");
      }
      const list = JSON.parse(text);
      const formatted = list.map((item: any) => ({
        ...item,
        visualData: JSON.stringify(item.visualData)
      }));
      res.json(formatted);
    } catch (error: any) {
      console.error("[Gemini suggestions error]", error);
      res.status(500).json({ success: false, error: error.message || "Erro interno do servidor ao gerar sugestões." });
    }
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `Rota da API não encontrada: ${req.path}` });
  });

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = 3000;
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Vite middleware
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start server only if not in Vercel environment
if (!process.env.VERCEL) {
  startServer();
}

