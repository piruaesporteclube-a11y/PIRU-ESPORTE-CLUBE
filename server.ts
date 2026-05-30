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
// Normalizer to ensure the generated modality adheres strictly to the list permitted by firestore rules:
// ["Futebol", "Futsal", "Vôlei", "Basquete", "Futebol de Areia", "Outros"]
const normalizeModality = (mod: string): string => {
  if (!mod) return "Outros";
  const m = mod.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
  
  if (m === "futebol") return "Futebol";
  if (m === "futsal") return "Futsal";
  if (m === "volei" || m === "volleyball") return "Vôlei";
  if (m === "basquete" || m === "basketball") return "Basquete";
  if (m === "futebol de areia" || m === "futebol de praia" || m === "beach soccer") return "Futebol de Areia";
  return "Outros";
};

// Generates a beautiful fallback drill if Gemini fails or is not configured
const getFallbackDrill = (modality: string, goal: string = ""): any => {
  const normalizedMod = normalizeModality(modality);
  const goalUpper = goal ? goal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
  
  if (normalizedMod === "Futebol" || normalizedMod === "Futsal" || normalizedMod === "Futebol de Areia") {
    if (goalUpper.includes("FINALIZA") || goalUpper.includes("CHUTE") || goalUpper.includes("GOL")) {
      return {
        name: `Circuito de Finalização Rápida (${normalizedMod})`,
        description: `Exercício tático focado na condução em velocidade, tabela com pivô na entrada da área e chute forte no canto, simulando situação real de finalização sob pressão.`,
        category: "Fundamento",
        intensity: "Alta",
        difficulty: "Intermediário",
        duration: 15,
        equipment: "Bolas de futebol, cones demarcadores, balizas pequenas, coletes",
        visualData: [
          { id: 'p1', type: 'player', x: 20, y: 70, team: 'A', label: '1', animate: true, toX: 50, toY: 60 },
          { id: 'p2', type: 'player', x: 50, y: 30, team: 'A', label: '2', animate: true, toX: 48, toY: 35 },
          { id: 'b1', type: 'ball', x: 22, y: 70, animate: true, toX: 47, toY: 55 },
          { id: 'c1', type: 'cone', x: 30, y: 55 },
          { id: 'c2', type: 'cone', x: 40, y: 45 }
        ]
      };
    } else if (goalUpper.includes("PASSE") || goalUpper.includes("POSSE") || goalUpper.includes("TABELA") || goalUpper.includes("RONDO")) {
      return {
        name: `Rondo de Posse de Bola (${normalizedMod})`,
        description: `Jogo de aproximação 4 vs 2 em espaço reduzido. O objetivo é manter a posse de bola trocando passes rápidos de até 2 toques, enquanto defensores tentam interceptar.`,
        category: "Tático",
        intensity: "Média",
        difficulty: "Intermediário",
        duration: 20,
        equipment: "4 cones delimitando espaço, 1 bola oficial, coletes verde/azul",
        visualData: [
          { id: 'p1', type: 'player', x: 15, y: 15, team: 'A', label: '1', animate: true, toX: 25, toY: 15 },
          { id: 'p2', type: 'player', x: 85, y: 15, team: 'A', label: '2', animate: true, toX: 75, toY: 15 },
          { id: 'p3', type: 'player', x: 85, y: 85, team: 'A', label: '3', animate: true, toX: 75, toY: 85 },
          { id: 'p4', type: 'player', x: 15, y: 85, team: 'A', label: '4', animate: true, toX: 25, toY: 85 },
          { id: 'def1', type: 'player', x: 50, y: 40, team: 'B', label: 'D1', animate: true, toX: 45, toY: 45 },
          { id: 'b1', type: 'ball', x: 20, y: 15, animate: true, toX: 80, toY: 15 }
        ]
      };
    } else {
      return {
        name: `Circuito de Agilidade e Posicionamento (${normalizedMod})`,
        description: `Treino coordenativo com deslocamento em zigue-zague pelos cones pequenos, salto duplo sobre barreiras baixas, seguido de recepção de bola com passe de primeira.`,
        category: "Coordenação Motora",
        intensity: "Média",
        difficulty: "Iniciante",
        duration: 12,
        equipment: "6 mini-cones, 2 barreiras de salto, bolas de futebol",
        visualData: [
          { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: '1', animate: true, toX: 75, toY: 50 },
          { id: 'b1', type: 'ball', x: 22, y: 50, animate: true, toX: 77, toY: 50 },
          { id: 'c1', type: 'cone', x: 35, y: 45 },
          { id: 'c2', type: 'cone', x: 45, y: 55 },
          { id: 'c3', type: 'cone', x: 55, y: 45 }
        ]
      };
    }
  } else if (normalizedMod === "Vôlei") {
    return {
      name: `Estação de Recepção e Toque Guiado Vôlei`,
      description: `Treino técnico que simula recepção de saque por manchete direcionada para a zona do levantador (posição 3), preparando a transição tática para o ataque.`,
      category: "Fundamento",
      intensity: "Média",
      difficulty: "Iniciante",
      duration: 15,
      equipment: "Rede de vôlei posicionada, bolas de vôlei, cone indicador de zona",
      visualData: [
        { id: 'p1', type: 'player', x: 25, y: 30, team: 'A', label: 'Passador', animate: true, toX: 30, toY: 30 },
        { id: 'p2', type: 'player', x: 75, y: 45, team: 'B', label: 'Levantador', animate: true, toX: 70, toY: 45 },
        { id: 'b1', type: 'ball', x: 27, y: 30, animate: true, toX: 72, toY: 45 }
      ]
    };
  } else if (normalizedMod === "Basquete") {
    return {
      name: `Infiltração Tática de Pick 'n Roll Basquete`,
      description: `Estudo tático de bloqueio ao portador da bola para abertura de espaço, infiltração fluida na linha de lance livre e arremesso preciso.`,
      category: "Tático",
      intensity: "Alta",
      difficulty: "Intermediário",
      duration: 15,
      equipment: "Bola de basquete, tabela com cesta de basquete, fita marcador",
      visualData: [
        { id: 'p1', type: 'player', x: 30, y: 70, team: 'A', label: 'Armador', animate: true, toX: 55, toY: 50 },
        { id: 'p2', type: 'player', x: 50, y: 75, team: 'A', label: 'Pivô', animate: true, toX: 42, toY: 62 },
        { id: 'b1', type: 'ball', x: 32, y: 70, animate: true, toX: 57, toY: 50 }
      ]
    };
  } else {
    return {
      name: `Série de Fundamentos Físicos Básicos`,
      description: `Circuito de aquecimento integrativo com deslocamentos rápidos multidirecionais e passe coordenativo curto de precisão em velocidade.`,
      category: "Geral",
      intensity: "Baixa",
      difficulty: "Iniciante",
      duration: 10,
      equipment: "Cones, bola padrão",
      visualData: [
        { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: 'Atleta', animate: true, toX: 80, toY: 50 },
        { id: 'b1', type: 'ball', x: 22, y: 50, animate: true, toX: 82, toY: 50 }
      ]
    };
  }
};

// Generates beautiful fallback suggestions if Gemini fails or is not configured
const getFallbackSuggestions = (modality: string): any[] => {
  const normalizedMod = normalizeModality(modality);
  return [
    {
      name: `Ativação Coordenativa Dinâmica (${normalizedMod})`,
      description: `Aquecimento global estruturado com troca de passes e ritmos curtos. Sincroniza a movimentação conjunta de atletas e o domínio dinâmico do material de treino.`,
      category: "Aquecimento",
      intensity: "Baixa",
      difficulty: "Iniciante",
      duration: 10,
      equipment: "Bolas de treino, jalecos ou coletes em duas tonalidades",
      visualData: [
        { id: 'p1', type: 'player', x: 15, y: 50, team: 'A', label: '1', animate: true, toX: 85, toY: 50 }
      ]
    },
    {
      name: `Treino de Fundamentos Técnicos (${normalizedMod})`,
      description: `Zigue-zague técnico em velocidade ideal para desenvolver posicionamento, controle de equilíbrio corporal e aceleração com materiais demarcados no chão.`,
      category: "Fundamento",
      intensity: "Alta",
      difficulty: "Intermediário",
      duration: 15,
      equipment: "Mini-cones coloridos, bola regulamentar, fita métrica",
      visualData: [
        { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: '1', animate: true, toX: 80, toY: 50 },
        { id: 'c1', type: 'cone', x: 40, y: 40 },
        { id: 'c2', type: 'cone', x: 60, y: 60 }
      ]
    },
    {
      name: `Esquema Tático Integrado de Jogo (${normalizedMod})`,
      description: `Trabalho de posicionamento defensivo e ofensivo simultâneo. Foco na manutenção de bloco tático e transições dinâmicas rápidas pelas laterais da quadra.`,
      category: "Tático",
      intensity: "Média",
      difficulty: "Avançado",
      duration: 25,
      equipment: "Coletes azuis e verdes, cones posicionadores grandes",
      visualData: [
        { id: 'p1', type: 'player', x: 30, y: 30, team: 'A', label: '1', animate: true, toX: 50, toY: 30 },
        { id: 'p2', type: 'player', x: 70, y: 70, team: 'B', label: 'D', animate: true, toX: 50, toY: 70 }
      ]
    }
  ];
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
    const { modality, goal } = req.body;
    if (!modality) {
      return res.status(400).json({ success: false, error: "Modalidade é obrigatória." });
    }

    try {
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
      const normalizedMod = normalizeModality(modality);
      res.json({
        ...result,
        modality: normalizedMod,
        visualData: JSON.stringify(result.visualData)
      });
    } catch (error: any) {
      console.warn("[Gemini API Error] Falling back to procedural generation due to:", error.message || error);
      
      // Serve beautiful local fallbacks!
      try {
        const normalizedMod = normalizeModality(modality);
        const drill = getFallbackDrill(modality, goal);
        res.json({
          ...drill,
          modality: normalizedMod,
          visualData: JSON.stringify(drill.visualData)
        });
      } catch (fallbackError: any) {
        console.error("[Fatal Fallback Error]", fallbackError);
        res.status(500).json({ success: false, error: "Erro interno ao gerar exercício de treino." });
      }
    }
  });

  // Gemini API - Generate Suggestions
  app.post("/api/gemini/generate-suggestions", async (req, res) => {
    const { modality } = req.body;
    if (!modality) {
      return res.status(400).json({ success: false, error: "Modalidade é obrigatória." });
    }

    try {
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
      const normalizedMod = normalizeModality(modality);
      const formatted = list.map((item: any) => ({
        ...item,
        modality: normalizedMod,
        visualData: JSON.stringify(item.visualData)
      }));
      res.json(formatted);
    } catch (error: any) {
      console.warn("[Gemini Suggestions API Error] Falling back to procedural suggestions due to:", error.message || error);
      
      // Serve beautiful local fallbacks!
      try {
        const normalizedMod = normalizeModality(modality);
        const list = getFallbackSuggestions(modality);
        const formatted = list.map((item: any) => ({
          ...item,
          modality: normalizedMod,
          visualData: JSON.stringify(item.visualData)
        }));
        res.json(formatted);
      } catch (fallbackError: any) {
        console.error("[Fatal Suggestions Fallback Error]", fallbackError);
        res.status(500).json({ success: false, error: "Erro interno ao gerar sugestões de treino." });
      }
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

