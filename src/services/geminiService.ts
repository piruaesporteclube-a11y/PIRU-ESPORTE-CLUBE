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
    const response = await fetch("/api/gemini/generate-drill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ modality, goal })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new Error(err.error || "Erro ao conectar com o serviço de Inteligência Artificial.");
    }

    return await response.json();
  },

  async generateSuggestions(modality: string): Promise<GeneratedDrill[]> {
    const response = await fetch("/api/gemini/generate-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ modality })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new Error(err.error || "Erro ao conectar com o serviço de Inteligência Artificial.");
    }

    return await response.json();
  }
};
