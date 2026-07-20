export interface GeneratedDrill {
  name: string;
  description: string;
  modality?: "Futebol" | "Futsal" | "Vôlei" | "Basquete" | "Futebol de Areia" | "Outros";
  category: string;
  intensity: 'Baixa' | 'Média' | 'Alta';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: number;
  equipment: string;
  visualData: string; // JSON string
}

const getFallbackDrill = (modality: string, goal: string = ""): GeneratedDrill => {
  const goalUpper = goal ? goal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
  const modLower = modality.toLowerCase();

  // If passing, crossing or assist
  if (goalUpper.includes("PASSE") || goalUpper.includes("CRUZAMENTO") || goalUpper.includes("LANÇAMENTO") || goalUpper.includes("TRIANGULAÇÃO") || goalUpper.includes("TABELA")) {
    return {
      name: `Treino de Triangulação e Passes Rápidos (${modality})`,
      description: `Exercício focado na troca rápida de passes, movimentação sem bola (ultrapassagem) e apoio constante ao portador da bola para furar linhas de marcação recuadas.`,
      modality: modality as any,
      category: "Fundamento",
      intensity: "Média",
      difficulty: "Intermediário",
      duration: 15,
      equipment: "Cones, coletes e bolas regulamentares",
      visualData: JSON.stringify([
        { id: 'cone1', type: 'cone', x: 30, y: 30 },
        { id: 'cone2', type: 'cone', x: 30, y: 70 },
        { id: 'cone3', type: 'cone', x: 70, y: 50 },
        { id: 'player1', type: 'player', x: 25, y: 50, team: 'A', label: '8', animate: true, toX: 50, toY: 50 },
        { id: 'player2', type: 'player', x: 65, y: 50, team: 'A', label: '10' },
        { id: 'ball1', type: 'ball', x: 27, y: 50, animate: true, toX: 63, toY: 50 }
      ])
    };
  }

  // If shooting, shot, goal
  if (goalUpper.includes("CHUTE") || goalUpper.includes("FINALIZACAO") || goalUpper.includes("GOL") || goalUpper.includes("CABECEIO") || goalUpper.includes("ATAQUE")) {
    return {
      name: `Treino Dinâmico de Finalização e Ataque no Alvo (${modality})`,
      description: `Atividade prática voltada ao tempo de reação, posicionamento corporal ideal para o arremate/chute e eficácia de pontuação sob pressão moderada.`,
      modality: modality as any,
      category: "Ataque",
      intensity: "Alta",
      difficulty: "Intermediário",
      duration: 20,
      equipment: "Baliza regulamentar, bolas adicionais, cones e barreiras móveis",
      visualData: JSON.stringify([
        { id: 'barrier1', type: 'barrier', x: 70, y: 40 },
        { id: 'barrier2', type: 'barrier', x: 70, y: 60 },
        { id: 'player1', type: 'player', x: 30, y: 50, team: 'A', label: '9', animate: true, toX: 85, toY: 50 },
        { id: 'ball1', type: 'ball', x: 32, y: 50, animate: true, toX: 95, toY: 50 }
      ])
    };
  }

  // If defense, marking, tackling
  if (goalUpper.includes("DEFESA") || goalUpper.includes("MARCACAO") || goalUpper.includes("DESARME") || goalUpper.includes("COBERTURA") || goalUpper.includes("POSICIONAMENTO")) {
    return {
      name: `Treino de Transição Defensiva e Cobertura 2x2 (${modality})`,
      description: `Exercício tático de recomposição rápida, fechamento de linhas de passe internas e indução do adversário para as laterais do campo/quadra.`,
      modality: modality as any,
      category: "Defesa",
      intensity: "Alta",
      difficulty: "Iniciante",
      duration: 20,
      equipment: "Cones, coletes de duas cores, balizas pequenas",
      visualData: JSON.stringify([
        { id: 'def1', type: 'player', x: 60, y: 40, team: 'A', label: '3', animate: true, toX: 45, toY: 45 },
        { id: 'def2', type: 'player', x: 60, y: 60, team: 'A', label: '4' },
        { id: 'att1', type: 'player', x: 40, y: 40, team: 'B', label: '7', animate: true, toX: 55, toY: 42 },
        { id: 'att2', type: 'player', x: 40, y: 60, team: 'B', label: '11' },
        { id: 'ball1', type: 'ball', x: 42, y: 40, animate: true, toX: 54, toY: 42 }
      ])
    };
  }

  // Default Fallbacks by modality
  if (modLower === "futsal") {
    return {
      name: `Rodízio Rápido e Finalização com Pivô`,
      description: `Trabalho de circulação rápida de bola em formato 3-1, passe vertical focado no pivô que realiza a proteção contra o fixo e serve o ala na corrida para o chute.`,
      modality: "Futsal",
      category: "Fundamento",
      intensity: "Alta",
      difficulty: "Intermediário",
      duration: 15,
      equipment: "Quadra de futsal, cones nos cantos, bolas adicionais",
      visualData: JSON.stringify([
        { id: 'cone1', type: 'cone', x: 20, y: 20 },
        { id: 'cone2', type: 'cone', x: 20, y: 80 },
        { id: 'playerPivo', type: 'player', x: 75, y: 50, team: 'A', label: '9' },
        { id: 'playerAla', type: 'player', x: 30, y: 30, team: 'A', label: '7', animate: true, toX: 70, toY: 35 },
        { id: 'ball1', type: 'ball', x: 32, y: 30, animate: true, toX: 75, toY: 48 }
      ])
    };
  }

  if (modLower === "volei") {
    return {
      name: `Exercício de Levantamento Técnico e Transição de Ataque`,
      description: `Protocolo para refinar o levantamento de costas ou toque em suspensão, seguido de ataque direcionado às zonas desmarcadas (paralela ou diagonal).`,
      modality: "Vôlei",
      category: "Fundamento",
      intensity: "Média",
      difficulty: "Intermediário",
      duration: 20,
      equipment: "Quadra com rede oficial, antenas de marcação, bolas de vôlei",
      visualData: JSON.stringify([
        { id: 'net1', type: 'barrier', x: 50, y: 20 },
        { id: 'net2', type: 'barrier', x: 50, y: 80 },
        { id: 'setter', type: 'player', x: 45, y: 50, team: 'A', label: '8', animate: true, toX: 47, toY: 48 },
        { id: 'spiker', type: 'player', x: 25, y: 40, team: 'A', label: '11', animate: true, toX: 48, toY: 42 },
        { id: 'ball1', type: 'ball', x: 27, y: 40, animate: true, toX: 45, toY: 49 }
      ])
    };
  }

  if (modLower === "basquete") {
    return {
      name: `Infiltração com Drible de Proteção e Bandeja`,
      description: `Treino focado em drible com troca de mão frente ao defensor, drible de proteção e progressão rápida em dois tempos para finalização de bandeja ou gancho.`,
      modality: "Basquete",
      category: "Fundamento",
      intensity: "Alta",
      difficulty: "Iniciante",
      duration: 15,
      equipment: "Quadra com tabela de basquete, cones em zigue-zague",
      visualData: JSON.stringify([
        { id: 'cone1', type: 'cone', x: 30, y: 40 },
        { id: 'cone2', type: 'cone', x: 50, y: 60 },
        { id: 'cone3', type: 'cone', x: 70, y: 40 },
        { id: 'player1', type: 'player', x: 20, y: 50, team: 'A', label: '23', animate: true, toX: 80, toY: 50 },
        { id: 'ball1', type: 'ball', x: 22, y: 50, animate: true, toX: 80, toY: 50 }
      ])
    };
  }

  if (modLower === "futebol de areia" || modLower === "beach soccer") {
    return {
      name: `Domínio Elevado e Chute de Voleio na Areia`,
      description: `Exercício adaptado ao solo irregular para exercitar o controle aéreo da bola (no peito ou coxa) e finalização forte sem deixar a bola tocar na areia.`,
      modality: "Futebol de Areia",
      category: "Fundamento",
      intensity: "Alta",
      difficulty: "Avançado",
      duration: 15,
      equipment: "Espaço de areia, baliza oficial, bolas adicionais",
      visualData: JSON.stringify([
        { id: 'cone1', type: 'cone', x: 40, y: 30 },
        { id: 'cone2', type: 'cone', x: 40, y: 70 },
        { id: 'player1', type: 'player', x: 30, y: 50, team: 'A', label: '11', animate: true, toX: 75, toY: 50 },
        { id: 'ball1', type: 'ball', x: 32, y: 50, animate: true, toX: 90, toY: 50 }
      ])
    };
  }

  // Default Soccer
  return {
    name: `Circuito de Agilidade, Controle e Finalização Cruzada`,
    description: `Circuito de alta intensidade unindo coordenação nos cones, condução em zigue-zague rápido e finalização de primeira após receber cruzamento de linha de fundo.`,
    modality: "Futebol" as any,
    category: "Fundamento",
    intensity: "Alta",
    difficulty: "Intermediário",
    duration: 15,
    equipment: "Cones, balizas, estacas verticais, coletes, bolas",
    visualData: JSON.stringify([
      { id: 'cone1', type: 'cone', x: 30, y: 30 },
      { id: 'cone2', type: 'cone', x: 40, y: 30 },
      { id: 'cone3', type: 'cone', x: 50, y: 30 },
      { id: 'playerCruzador', type: 'player', x: 75, y: 80, team: 'A', label: '7', animate: true, toX: 85, toY: 80 },
      { id: 'playerFinalizador', type: 'player', x: 45, y: 50, team: 'A', label: '9', animate: true, toX: 80, toY: 50 },
      { id: 'ball1', type: 'ball', x: 77, y: 80, animate: true, toX: 80, toY: 52 }
    ])
  };
};

const getFallbackSuggestions = (modality: string): GeneratedDrill[] => {
  const modLower = modality.toLowerCase();
  
  if (modLower === "futsal") {
    return [
      {
        name: "Pressionamento Alto e Transição Defensiva Futsal",
        description: "Exercício com goleiro-linha focado na transição veloz de defesa para o ataque.",
        modality: "Futsal",
        category: "Tático",
        intensity: "Alta",
        difficulty: "Avançado",
        duration: 15,
        equipment: "Bolas de futsal, coletes de 2 cores",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: '10' },
          { id: 'p2', type: 'player', x: 50, y: 50, team: 'B', label: '4' }
        ])
      },
      {
        name: "Serviço de Pivô em Tabela com Finalização Curta",
        description: "Passe diagonal forte ao pivô que realiza o pivô de costas e serve o ala na infiltração.",
        modality: "Futsal",
        category: "Fundamento",
        intensity: "Média",
        difficulty: "Intermediário",
        duration: 20,
        equipment: "Cones, baliza, bolas",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 25, y: 35, team: 'A', label: '8' }
        ])
      }
    ];
  }

  if (modLower === "volei") {
    return [
      {
        name: "Recepção de Saque e Saída de Rede Rápida",
        description: "Trabalho tático de manchete de precisão ao levantador com ataque subsequente rápido.",
        modality: "Vôlei",
        category: "Tático",
        intensity: "Média",
        difficulty: "Intermediário",
        duration: 20,
        equipment: "Rede e bolas de vôlei",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: '1' }
        ])
      },
      {
        name: "Bloqueio Duplo e Ajuste de Cobertura Baixa",
        description: "Simulação de movimentação lateral rápida dos centrais para bloqueio duplo na rede.",
        modality: "Vôlei",
        category: "Defesa",
        intensity: "Alta",
        difficulty: "Avançado",
        duration: 15,
        equipment: "Rede, bolas",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 45, y: 40, team: 'A', label: '3' }
        ])
      }
    ];
  }

  if (modLower === "basquete") {
    return [
      {
        name: "Transição Ofensiva 3x2 em Velocidade",
        description: "Infiltração rápida após roubo de bola com passes extra para bandeja fácil.",
        modality: "Basquete",
        category: "Ataque",
        intensity: "Alta",
        difficulty: "Intermediário",
        duration: 20,
        equipment: "Quadra, bolas",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 30, y: 50, team: 'A', label: '3' }
        ])
      },
      {
        name: "Drible de Desmarcação e Arremesso de Três Pontos",
        description: "Sair do bloqueio cego, receber passe equilibrado fora do garrafão e arremessar.",
        modality: "Basquete",
        category: "Fundamento",
        intensity: "Média",
        difficulty: "Avançado",
        duration: 15,
        equipment: "Quadra, cones, bolas",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 20, team: 'A', label: '11' }
        ])
      }
    ];
  }

  if (modLower === "futebol de areia" || modLower === "beach soccer") {
    return [
      {
        name: "Chute de Voleio após Domínio Aéreo",
        description: "Trabalho de elevação de bola na areia, controle de peito e chute antes de tocar o solo.",
        modality: "Futebol de Areia",
        category: "Fundamento",
        intensity: "Alta",
        difficulty: "Avançado",
        duration: 15,
        equipment: "Bolas de futebol",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 30, y: 50, team: 'A', label: '10' }
        ])
      },
      {
        name: "Tabela em Elevação e Saída Rápida",
        description: "Circulação com passes pelo alto dadas as irregularidades do piso arenoso.",
        modality: "Futebol de Areia",
        category: "Ataque",
        intensity: "Alta",
        difficulty: "Intermediário",
        duration: 15,
        equipment: "Bolas, cones",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 40, y: 40, team: 'A', label: '9' }
        ])
      }
    ];
  }

  // Default Soccer
  return [
    {
      name: "Tabelas Rápidas e Ultrapassagem Lateral",
      description: "Trabalho de criação de espaço pelas alas com passes em triângulos e cruzamento rasteiro.",
      modality: "Futebol",
      category: "Ataque",
      intensity: "Média",
      difficulty: "Intermediário",
      duration: 15,
      equipment: "Cones, coletes, bolas",
      visualData: JSON.stringify([
        { id: 'p1', type: 'player', x: 30, y: 60, team: 'A', label: '8' },
        { id: 'p2', type: 'player', x: 70, y: 80, team: 'A', label: '7' }
      ])
    },
    {
      name: "Marcação por Setor e Cobertura 3x2",
      description: "Simulação defensiva para treinar posicionamento de zaga e fechamento da meia-lua.",
      modality: "Futebol",
      category: "Defesa",
      intensity: "Alta",
      difficulty: "Intermediário",
      duration: 20,
      equipment: "Coletes, cones",
      visualData: JSON.stringify([
        { id: 'p1', type: 'player', x: 50, y: 50, team: 'A', label: '3' }
      ])
    },
    {
      name: "Circuito de Condução Veloz em Slalom com Chute",
      description: "Agilidade coordenativa entre estacas, seguido de tiro curto e chute forte de longa distância.",
      modality: "Futebol",
      category: "Fundamento",
      intensity: "Alta",
      difficulty: "Iniciante",
      duration: 15,
      equipment: "Estacas, cones, baliza, bolas",
      visualData: JSON.stringify([
        { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: '11' }
      ])
    }
  ];
};

export const geminiService = {
  async generateDrill(modality: string, goal?: string): Promise<GeneratedDrill> {
    try {
      const response = await fetch("/api/gemini/generate-drill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ modality, goal })
      });

      if (!response.ok) {
        throw new Error("Falha no servidor ao gerar exercício.");
      }

      return await response.json();
    } catch (err) {
      console.warn("[geminiService] Falha ao conectar com o servidor ou timeout. Usando gerador de emergência local...", err);
      return getFallbackDrill(modality, goal);
    }
  },

  async generateSuggestions(modality: string): Promise<GeneratedDrill[]> {
    try {
      const response = await fetch("/api/gemini/generate-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ modality })
      });

      if (!response.ok) {
        throw new Error("Falha no servidor ao gerar sugestões.");
      }

      return await response.json();
    } catch (err) {
      console.warn("[geminiService] Falha ao conectar com o servidor ou timeout. Usando sugestões locais...", err);
      return getFallbackSuggestions(modality);
    }
  }
};
