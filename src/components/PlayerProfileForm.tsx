import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fixHtml2CanvasColors } from '../utils';
import { api } from '../api';
import { Athlete, Anamnesis, PlayerProfile, getSubCategory, categories } from '../types';
import { 
  Save, 
  FileText, 
  X, 
  Dribbble, 
  Activity, 
  Heart, 
  ShieldAlert, 
  Award, 
  User, 
  Calendar, 
  TrendingUp, 
  Gauge, 
  Target, 
  Award as MedalIcon,
  ChevronRight,
  ClipboardList,
  Flame,
  Scale,
  Sparkles,
  Loader2,
  Check,
  Brain,
  ListPlus,
  Youtube,
  HelpCircle
} from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import AthleteSearchSelect from './AthleteSearchSelect';
import DrillVisualizer from './DrillVisualizer';
import { differenceInYears, parseISO } from 'date-fns';

type RatingField = {
  key: keyof PlayerProfile;
  label: string;
  description: string;
};

const technicalFields: RatingField[] = [
  { key: 'rating_passing', label: 'Passe', description: 'Precisão, visão de jogo e passes curtos/longos' },
  { key: 'rating_finishing', label: 'Finalização', description: 'Precisão, posicionamento e potência de chute' },
  { key: 'rating_trapping', label: 'Domínio de Bola', description: 'Amortecimento e recepção da bola sob pressão' },
  { key: 'rating_dribbling', label: 'Drible', description: 'Habilidade de finta no 1 contra 1 e agilidade' },
  { key: 'rating_crossing', label: 'Cruzamento', description: 'Bolas alçadas na área a partir das laterais' },
  { key: 'rating_heading', label: 'Cabeceio', description: 'Tempo de bola, impulsão e precisão cabeceando' },
  { key: 'rating_marking', label: 'Marcação', description: 'Abordagem defensiva, cobertura e encurtamento' },
  { key: 'rating_tackling', label: 'Desarme', description: 'Divididas no tempo certo e interceptações' },
  { key: 'rating_vision', label: 'Visão de Jogo', description: 'Leitura espacial e antecipação de linhas de passe' },
  { key: 'rating_positioning', label: 'Posicionamento', description: 'Leitura de espaço ofensivo/defensivo sem a bola' },
  { key: 'rating_ball_control', label: 'Controle de Bola', description: 'Condução, proteção e manutenção da posse' },
];

const physicalFields: RatingField[] = [
  { key: 'rating_speed', label: 'Velocidade', description: 'Velocidade linear máxima do atleta' },
  { key: 'rating_acceleration', label: 'Aceleração', description: 'Arranque explosivo e aceleração rápida' },
  { key: 'rating_stamina', label: 'Resistência', description: 'Condicionamento físico e energia em campo' },
  { key: 'rating_strength', label: 'Força', description: 'Combates físicos, divididas e impulsão corporal' },
  { key: 'rating_agility', label: 'Agilidade', description: 'Mudanças bruscas de direção e reflexos rápidos' },
  { key: 'rating_jumping', label: 'Impulsão', description: 'Salto vertical estacionário ou em movimento' },
  { key: 'rating_coordination', label: 'Coordenação Motora', description: 'Sincronia física e controle corporal amplo' },
];

const tacticalFields: RatingField[] = [
  { key: 'rating_tactical_intelligence', label: 'Inteligência Tática', description: 'Entendimento de esquemas de jogo complexos' },
  { key: 'rating_game_reading', label: 'Leitura de Jogo', description: 'Capacidade de antecipar as ações do adversário' },
  { key: 'rating_space_occupation', label: 'Ocupação de Espaço', description: 'Preenchimento inteligente de lacunas e setores' },
  { key: 'rating_decision_making', label: 'Tomada de Decisão', description: 'Escolha rápida e precisa do melhor lance' },
  { key: 'rating_offensive_participation', label: 'Participação Ofensiva', description: 'Apoio, ultrapassagens e infiltrações no ataque' },
  { key: 'rating_defensive_participation', label: 'Participação Defensiva', description: 'Auxílio na recomposição e marcação baixa' },
];

const behavioralFields: RatingField[] = [
  { key: 'rating_discipline', label: 'Disciplina', description: 'Respeito ao treinador, arbitragem e normas' },
  { key: 'rating_leadership', label: 'Liderança', description: 'Orientação construtiva e inspiração aos colegas' },
  { key: 'rating_teamwork', label: 'Trabalho em Equipe', description: 'Colaboração coletiva e cooperação em campo' },
  { key: 'rating_commitment', label: 'Comprometimento', description: 'Foco, raça e dedicação nos treinos e partidas' },
  { key: 'rating_communication', label: 'Comunicação', description: 'Falar de forma objetiva para apoiar o time' },
  { key: 'rating_sportsmanship', label: 'Espírito Esportivo', description: 'Fair play e maturidade diante de adversidades' },
];

const calculateIMC = (w?: string, h?: string) => {
  if (!w || !h) return '';
  const weightNum = parseFloat(w.replace(',', '.').replace(/[^0-9.]/g, ''));
  let heightNum = parseFloat(h.replace(',', '.').replace(/[^0-9.]/g, ''));
  if (!weightNum || !heightNum) return '';
  if (heightNum > 3) {
    heightNum = heightNum / 100; // converter cm para metros
  }
  const imcVal = weightNum / (heightNum * heightNum);
  return isNaN(imcVal) ? '' : imcVal.toFixed(1);
};

const getRatingLabel = (score: number | undefined) => {
  if (score === undefined || score === null) {
    return { text: 'Não avaliado', color: 'text-zinc-500 bg-zinc-800/50 border-zinc-800/50', barColor: 'bg-zinc-800' };
  }
  if (score <= 2) {
    return { text: 'Ruim', color: 'text-red-500 bg-red-500/10 border-red-500/20', barColor: 'bg-red-500' };
  }
  if (score <= 4) {
    return { text: 'Regular', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', barColor: 'bg-orange-500' };
  }
  if (score <= 6) {
    return { text: 'Bom', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', barColor: 'bg-yellow-500' };
  }
  if (score <= 8) {
    return { text: 'Muito Bom', color: 'text-green-500 bg-green-500/10 border-green-500/20', barColor: 'bg-green-500' };
  }
  return { text: 'Excelente', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', barColor: 'bg-emerald-400' };
};

interface PlayerProfileFormProps {
  athlete?: Athlete;
  onSave?: () => void;
  standalone?: boolean;
  userRole?: 'admin' | 'professor' | 'student';
  athletes?: Athlete[];
}

export default function PlayerProfileForm({ 
  athlete: propAthlete, 
  onSave, 
  standalone = false, 
  userRole = 'admin',
  athletes = [] 
}: PlayerProfileFormProps) {
  const { settings } = useTheme();
  const isStudent = userRole === 'student';
  
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(propAthlete || null);
  const [profile, setProfile] = useState<Partial<PlayerProfile>>({});
  const [anamnesis, setAnamnesis] = useState<Partial<Anamnesis>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeRatingTab, setActiveRatingTab] = useState<'technical' | 'physical' | 'tactical' | 'behavioral'>('technical');
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [activeTestModal, setActiveTestModal] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<any>(null);
  const [selectedFieldForTest, setSelectedFieldForTest] = useState<any>(null);
  const [isSavingTestAsActivity, setIsSavingTestAsActivity] = useState(false);
  const [savedActivitySuccess, setSavedActivitySuccess] = useState(false);

  const mockActivity = React.useMemo(() => {
    if (!generatedTest) return null;
    return {
      id: 'mock-test-activity',
      name: generatedTest.testName,
      description: generatedTest.objective,
      modality: (selectedAthlete?.modality as any) || "Futebol",
      category: "Fundamento" as any,
      intensity: "Média" as any,
      difficulty: "Intermediário" as any,
      visualData: JSON.stringify(generatedTest.visualObjects || [])
    };
  }, [generatedTest, selectedAthlete]);

  const getLocalAssessmentTestFallback = (fieldName: any, fieldCategory: any, description: any, modality: any = "Futebol") => {
    const safeFieldName = typeof fieldName === "string" && fieldName ? fieldName : "Atributo";
    const safeCategory = typeof fieldCategory === "string" && fieldCategory ? fieldCategory : "Técnico";
    const safeDesc = typeof description === "string" && description ? description : "";
    const safeModality = typeof modality === "string" && modality ? modality : "Futebol";

    const fieldLower = safeFieldName.toLowerCase();
    const modalityLower = safeModality.toLowerCase();
    
    // 1. Passing / Crossing / Long Balls
    if (fieldLower.includes("passe") || fieldLower.includes("cruzamento") || fieldLower.includes("lançamento") || fieldLower.includes("assistência")) {
      return {
        testName: `Protocolo de Precisão e Conexão de Passe: ${safeFieldName}`,
        objective: `Mensurar a acurácia, velocidade de bola e tomada de decisão no passe curto e médio (${safeCategory}) sob pressão controlada.`,
        materials: [
          "4 cones para delimitar o quadrado inicial",
          "2 estacas verticais ou mini-balizas a 12 metros",
          "5 bolas de jogo regulamentares",
          "Cronômetro"
        ],
        setup: `Demarque uma área quadrada de 3x3m (zona de partida) e posicione 2 estacas a 12 metros de distância, com abertura de 1.5 metros entre elas, funcionando como um portal receptor.`,
        execution: [
          "O atleta inicia posicionado dentro do quadrado com controle de bola.",
          "Ao sinal do treinador, realiza um domínio orientado e efetua um passe firme rasteiro em direção ao portal das estacas.",
          "O exercício é executado 5 vezes utilizando a perna dominante e 5 vezes com a perna não dominante para avaliar a lateralidade.",
          "O treinador registra o número de passes que cruzaram as estacas sem tocá-las."
        ],
        scoringCriteria: [
          { scoreRange: "9 - 10 (Excelente)", criteria: "Acerta de 9 a 10 passes no portal com velocidade e controle corporal impecáveis." },
          { scoreRange: "7 - 8 (Muito Bom/Bom)", criteria: "Acerta de 7 a 8 passes com boa direção e força adequada." },
          { scoreRange: "5 - 6 (Regular)", criteria: "Acerta de 5 a 6 passes, mas demonstra lentidão na preparação ou oscilações de força." },
          { scoreRange: "1 - 4 (Ruim)", criteria: "Acerta menos de 4 passes, apresentando dificuldades mecânicas ou total falta de direção." }
        ],
        tips: [
          "Oriente o atleta a golpear a bola com o peito do pé ou parte interna (chapa) dependendo da modalidade.",
          "Certifique-se de manter o mesmo distanciamento para a isonomia da nota com todos os atletas."
        ],
        youtubeSearchQuery: `treinamento de passe de precisão no ${modalityLower}`,
        visualObjects: [
          { id: 'cone1', type: 'cone', x: 20, y: 30 },
          { id: 'cone2', type: 'cone', x: 20, y: 70 },
          { id: 'stake1', type: 'cone', x: 80, y: 40, label: 'E1' },
          { id: 'stake2', type: 'cone', x: 80, y: 60, label: 'E2' },
          { id: 'player1', type: 'player', x: 22, y: 50, team: 'A', label: '10', animate: true, toX: 78, toY: 50 },
          { id: 'ball1', type: 'ball', x: 24, y: 50, animate: true, toX: 78, toY: 50 }
        ]
      };
    }

    // 2. Shooting / Finishing / Heading / Volley shot / Serve
    if (fieldLower.includes("chute") || fieldLower.includes("finalização") || fieldLower.includes("cabeceio") || fieldLower.includes("arremesso") || fieldLower.includes("saque") || fieldLower.includes("ataque")) {
      return {
        testName: `Protocolo de Finalização e Eficácia de Chute: ${safeFieldName}`,
        objective: `Avaliar a precisão, força e técnica de golpeio na finalização (${safeCategory}) sob movimento e tempo limitado.`,
        materials: [
          "Gol/baliza regulamentar ou rede oficial",
          "4 cones para demarcar os cantos superiores/inferiores da baliza",
          "10 bolas regulamentares",
          "Lançador (parceiro ou treinador)"
        ],
        setup: `Fixe cones nos cantos do gol para criar alvos visuais. Posicione a zona de finalização na marca dos 12 a 15 metros em relação à baliza.`,
        execution: [
          "O atleta realiza uma corrida diagonal e recebe a bola de um passador/treinador posicionado na lateral.",
          "O atleta deve finalizar de primeira ou com no máximo dois toques direcionando para as extremidades marcadas.",
          "Realiza-se 10 finalizações alternando lados ou pernas/braços.",
          "Registra-se as bolas que entram no gol e as que atingem os quadrantes pontuáveis."
        ],
        scoringCriteria: [
          { scoreRange: "9 - 10 (Excelente)", criteria: "Acerta 8 ou mais finalizações na rede com direção, sendo pelo menos 4 nos cantos sinalizados." },
          { scoreRange: "7 - 8 (Muito Bom/Bom)", criteria: "Acerta de 6 a 7 finalizações na rede com boa impulsão e direção consistente." },
          { scoreRange: "5 - 6 (Regular)", criteria: "Acerta de 4 a 5 finalizações, apresentando falta de precisão ou golpes sem peso." },
          { scoreRange: "1 - 4 (Ruim)", criteria: "Acerta menos de 3 finalizações, mandando bolas para fora ou facilmente defensáveis." }
        ],
        tips: [
          "Insista para o atleta finalizar com o corpo equilibrado, sem pressa excessiva.",
          "O passe do lançador deve ser consistente para manter o padrão do teste."
        ],
        youtubeSearchQuery: `treinamento de finalização de primeira no ${modalityLower}`,
        visualObjects: [
          { id: 'goal_back', type: 'barrier', x: 90, y: 35 },
          { id: 'goal_back2', type: 'barrier', x: 90, y: 65 },
          { id: 'cone1', type: 'cone', x: 90, y: 30, label: 'Alvo' },
          { id: 'cone2', type: 'cone', x: 90, y: 70, label: 'Alvo' },
          { id: 'player_finisher', type: 'player', x: 40, y: 50, team: 'A', label: '9', animate: true, toX: 85, toY: 50 },
          { id: 'ball_shot', type: 'ball', x: 42, y: 50, animate: true, toX: 90, toY: 50 }
        ]
      };
    }

    // 3. Speed / Acceleration / Agility / Coordination
    if (fieldLower.includes("velocidade") || fieldLower.includes("aceleração") || fieldLower.includes("agilidade") || fieldLower.includes("coordenação") || fieldLower.includes("físico") || fieldLower.includes("impulso") || fieldLower.includes("respiratório")) {
      return {
        testName: `Teste de Agilidade e Velocidade Multidirecional: ${safeFieldName}`,
        objective: `Medir a capacidade de mudança de direção rápida, aceleração linear e coordenação motora (${safeCategory}).`,
        materials: [
          "8 cones sinalizadores",
          "Cronômetro centesimal digital",
          "Trena de medição de 20 metros"
        ],
        setup: `Monte um circuito em forma de retângulo de 10x5 metros. Coloque 4 cones centrais em linha reta espaçados por exatamente 2 metros entre eles.`,
        execution: [
          "O atleta inicia em pé na linha de largada no canto inferior esquerdo.",
          "Ao sinal, corre em sprint até o cone oposto, faz o contorno e entra no zigue-zague pelos cones centrais.",
          "Ao terminar o zigue-zague, realiza um sprint final até cruzar a linha de chegada.",
          "O tempo total de percurso é registrado. Executa-se 3 tentativas dando descanso total entre elas."
        ],
        scoringCriteria: [
          { scoreRange: "9 - 10 (Excelente)", criteria: "Tempo espetacular (abaixo de 15 segundos) com transições extremamente velozes e limpas." },
          { scoreRange: "7 - 8 (Muito Bom/Bom)", criteria: "Tempo forte (entre 15.0s e 16.5s) com boa postura nas curvas e aceleração linear constante." },
          { scoreRange: "5 - 6 (Regular)", criteria: "Tempo moderado (entre 16.5s e 18.0s), demonstrando perda de velocidade ao fazer contornos nos cones." },
          { scoreRange: "1 - 4 (Ruim)", criteria: "Tempo insatisfatório (acima de 18 segundos) ou frequente queda/toque de cones." }
        ],
        tips: [
          "Utilize calçado com tração adequada para o piso do teste, avoiding escorregões.",
          "Insista para o atleta focar no centro de gravidade baixo nas curvas rápidas."
        ],
        youtubeSearchQuery: `teste de agilidade illinois agility drill ${modalityLower}`,
        visualObjects: [
          { id: 'cone_s1', type: 'cone', x: 20, y: 20 },
          { id: 'cone_s2', type: 'cone', x: 20, y: 80 },
          { id: 'cone_m1', type: 'cone', x: 40, y: 50, label: '1' },
          { id: 'cone_m2', type: 'cone', x: 50, y: 50, label: '2' },
          { id: 'cone_m3', type: 'cone', x: 60, y: 50, label: '3' },
          { id: 'cone_m4', type: 'cone', x: 70, y: 50, label: '4' },
          { id: 'player_sprinter', type: 'player', x: 20, y: 22, team: 'A', label: '7', animate: true, toX: 75, toY: 80 }
        ]
      };
    }

    // 4. Marking / Defense / Tackling / Positioning (Tactical / Behavioral / Defensive)
    if (fieldLower.includes("marcação") || fieldLower.includes("desarme") || fieldLower.includes("posicionamento") || fieldLower.includes("cobertura") || fieldLower.includes("tático") || fieldLower.includes("comportamental") || fieldLower.includes("liderança") || fieldLower.includes("comunicação")) {
      return {
        testName: `Simulação de Duelo 1x1 Defensivo de Elite: ${safeFieldName}`,
        objective: `Avaliar o tempo de reação, posicionamento de marcação e eficiência de desarme (${safeCategory}) em contexto real.`,
        materials: [
          "4 cones para delimitar a zona de duelo (12x12 metros)",
          "2 mini-traves nas linhas de fundo",
          "Bolas de treino"
        ],
        setup: `Demarque uma quadra quadrada de 12x12m. Posicione o defensor no meio da área e o atacante com bola no lado oposto.`,
        execution: [
          "Ao comando sonoro, o atacante tenta passar em velocidade e marcar em uma das mini-traves.",
          "O defensor deve fechar o ângulo de progressão, manter postura de braço estendido (sem dar o bote apressado) e efetuar o desarme.",
          "Cada dupla realiza 5 duelos completos alternando a posse.",
          "Anote se o defensor recupera a posse, retarda o jogo com sucesso ou é driblado."
        ],
        scoringCriteria: [
          { scoreRange: "9 - 10 (Excelente)", criteria: "Recupera a bola de forma limpa em 4 a 5 duelos, demonstrando leitura perfeita de drible e posicionamento ótimo." },
          { scoreRange: "7 - 8 (Muito Bom/Bom)", criteria: "Recupera a bola em 3 duelos e induz o atacante ao erro/temporização nos outros." },
          { scoreRange: "5 - 6 (Regular)", criteria: "Não é driblado com facilidade, mas prefere recuar muito cedendo espaço para arremate de meia-distância." },
          { scoreRange: "1 - 4 (Ruim)", criteria: "É facilmente batido no drible na maioria das tentativas ou comete faltas faltas duras desnecessárias." }
        ],
        tips: [
          "Instrua o atleta a manter o peso do corpo nos calcanhares e as pernas semiflexionadas.",
          "Monitore o uso do corpo para que o contato seja lícito e seguro para ambos."
        ],
        youtubeSearchQuery: `defending 1v1 football drills ${modalityLower}`,
        visualObjects: [
          { id: 'cone_d1', type: 'cone', x: 30, y: 20 },
          { id: 'cone_d2', type: 'cone', x: 30, y: 80 },
          { id: 'cone_d3', type: 'cone', x: 70, y: 20 },
          { id: 'cone_d4', type: 'cone', x: 70, y: 80 },
          { id: 'defender', type: 'player', x: 55, y: 50, team: 'A', label: '3', animate: true, toX: 48, toY: 50 },
          { id: 'attacker', type: 'player', x: 35, y: 50, team: 'B', label: '11', animate: true, toX: 46, toY: 50 },
          { id: 'ball_1v1', type: 'ball', x: 37, y: 50, animate: true, toX: 46, toY: 50 }
        ]
      };
    }

    // 5. Default Fallback
    return {
      testName: `Protocolo Técnico de Avaliação Prática: ${safeFieldName}`,
      objective: `Avaliar com precisão o atributo técnico/físico de ${safeFieldName} (${safeCategory}) com base na descrição fornecida.`,
      materials: [
        "6 cones de marcação coloridos",
        "Cronômetro ou trena de medição",
        "Bolas regulamentares e apito"
      ],
      setup: `Demarque uma raia técnica retangular de 15x10 metros usando cones. Crie estações específicas para início, progresso e conclusão da ação técnica.`,
      execution: [
        "O atleta se posiciona no cone inicial sob comando de atenção ativo.",
        "Ao apito, realiza a ação focada em demonstrar o atributo (ex: agilidade de pernas, controle rápido, cabeceio direcionado).",
        "Repete-se o processo por 5 vezes consecutivas para mitigar fatores aleatórios de cansaço ou erro de sorte.",
        "O treinador faz as anotações quantitativas e qualitativas correspondentes."
      ],
      scoringCriteria: [
        { scoreRange: "9 - 10 (Excelente)", criteria: "Domínio e consistência técnica perfeita em todas as repetições, demonstrando controle sob pressão de alto nível." },
        { scoreRange: "7 - 8 (Muito Bom/Bom)", criteria: "Consistência alta com pouquíssimas falhas secundárias e bom tempo de reação." },
        { scoreRange: "5 - 6 (Regular)", criteria: "Execução funcional média, atingindo os objetivos mínimos, mas com erros perceptíveis de ritmo ou postura." },
        { scoreRange: "1 - 4 (Ruim)", criteria: "Dificuldades nítidas para concluir as repetições propostas de forma satisfatória." }
      ],
      tips: [
        "Assegure-se de que o aquecimento prévio de 10 minutos foi concluído.",
        "Mantenha sempre os mesmos padrões climáticos, gramado/quadra e bolas para o teste ser justo."
      ],
      youtubeSearchQuery: `como treinar ${fieldLower} no ${modalityLower}`,
      visualObjects: [
        { id: 'cone1', type: 'cone', x: 20, y: 30 },
        { id: 'cone2', type: 'cone', x: 20, y: 70 },
        { id: 'cone3', type: 'cone', x: 80, y: 30 },
        { id: 'cone4', type: 'cone', x: 80, y: 70 },
        { id: 'player1', type: 'player', x: 25, y: 50, team: 'A', label: '10', animate: true, toX: 75, toY: 50 },
        { id: 'ball1', type: 'ball', x: 27, y: 50, animate: true, toX: 73, toY: 50 }
      ]
    };
  };

  const handleGenerateTest = async (field: any) => {
    setSelectedFieldForTest(field);
    setGeneratedTest(null);
    setSavedActivitySuccess(false);
    setActiveTestModal(true);
    setIsGeneratingTest(true);

    let categoryLabel = "Técnico";
    if (activeRatingTab === "physical") categoryLabel = "Físico";
    else if (activeRatingTab === "tactical") categoryLabel = "Tático";
    else if (activeRatingTab === "behavioral") categoryLabel = "Comportamental";

    try {
      const response = await fetch("/api/gemini/generate-assessment-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fieldName: field.label,
          fieldCategory: categoryLabel,
          description: field.description,
          modality: selectedAthlete?.modality || "Futebol"
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.test) {
        setGeneratedTest(data.test);
        toast.success("Avaliação gerada com sucesso pela IA!");
      } else {
        throw new Error("Erro na resposta ou campo 'test' ausente.");
      }
    } catch (err) {
      console.warn("[PlayerProfileForm] Falha ao chamar a API ou timeout no Vercel. Utilizando motor tático local integrado.", err);
      const fallback = getLocalAssessmentTestFallback(
        field.label,
        categoryLabel,
        field.description || "",
        selectedAthlete?.modality || "Futebol"
      );
      setGeneratedTest(fallback);
      toast.success("Protocolo gerado com sucesso!");
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const saveTestAsTrainingActivity = async () => {
    if (!generatedTest || !selectedFieldForTest) return;
    setIsSavingTestAsActivity(true);

    let actCategory: any = "Fundamento";
    if (activeRatingTab === "physical") {
      if (selectedFieldForTest.label.toLowerCase().includes("coordenação")) {
        actCategory = "Coordenação Motora";
      } else if (selectedFieldForTest.label.toLowerCase().includes("agilidade")) {
        actCategory = "Agilidade";
      } else {
        actCategory = "Físico";
      }
    } else if (activeRatingTab === "tactical") {
      actCategory = "Tático";
    } else if (activeRatingTab === "behavioral") {
      actCategory = "Conscientização";
    }

    try {
      const youtubeLink = generatedTest.youtubeSearchQuery 
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(generatedTest.youtubeSearchQuery)}`
        : '';
      const formattedDescription = `**OBJETIVO:**\n${generatedTest.objective}\n\n**MATERIAIS:**\n${generatedTest.materials.join(", ")}\n\n**COMO MONTAR:**\n${generatedTest.setup}\n\n**EXECUÇÃO:**\n${generatedTest.execution.map((step: string, i: number) => `${i + 1}. ${step}`).join("\n")}\n\n**DICAS DO TREINADOR:**\n${generatedTest.tips.join("\n")}${youtubeLink ? `\n\n**VÍDEO DE DEMONSTRAÇÃO (YOUTUBE):**\n${youtubeLink}` : ''}`;

      await api.saveActivity({
        name: generatedTest.testName,
        description: formattedDescription,
        modality: (selectedAthlete?.modality as any) || "Futebol",
        category: actCategory,
        intensity: "Média",
        difficulty: "Intermediário",
        duration: 15,
        equipment: generatedTest.materials.join(", "),
        visualData: JSON.stringify(generatedTest.visualObjects || [])
      });

      setSavedActivitySuccess(true);
      toast.success("Atividade de teste salva no banco de treinos com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar atividade no banco de treinos.");
    } finally {
      setIsSavingTestAsActivity(false);
    }
  };

  useEffect(() => {
    const convertToDataUrl = (url: string, callback: (dataUrl: string | null) => void) => {
      if (!url || url === 'no-image') {
        callback(null);
        return;
      }
      if (url.startsWith('data:')) {
        callback(url);
        return;
      }

      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            callback(dataUrl);
          } else {
            callback(url);
          }
        } catch (e) {
          console.warn('Failed to convert image to data URL', e);
          callback(url);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image with CORS:', url);
        callback(url);
      };
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(selectedAthlete?.photo || '', setPhotoDataUrl);
  }, [selectedAthlete?.photo]);

  useEffect(() => {
    const convertToDataUrl = (url: string, callback: (dataUrl: string | null) => void) => {
      if (!url) {
        callback(null);
        return;
      }
      if (url.startsWith('data:')) {
        callback(url);
        return;
      }

      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            callback(dataUrl);
          } else {
            callback(url);
          }
        } catch (e) {
          console.warn('Failed to convert image to data URL', e);
          callback(url);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image with CORS:', url);
        callback(url);
      };
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(settings?.schoolCrest || '', setCrestDataUrl);
  }, [settings?.schoolCrest]);

  // Auto-calculate IMC when height or weight changes in edit mode
  useEffect(() => {
    if (isEditing) {
      const calculated = calculateIMC(profile.weight, profile.height);
      if (calculated && profile.imc !== calculated) {
        setProfile(prev => ({ ...prev, imc: calculated }));
      }
    }
  }, [profile.weight, profile.height, isEditing]);

  // Sync selected athlete from props
  useEffect(() => {
    if (propAthlete) {
      setSelectedAthlete(propAthlete);
    }
  }, [propAthlete]);

  // Load Player Profile and Anamnesis data when selected athlete changes
  useEffect(() => {
    if (!selectedAthlete) {
      setProfile({});
      setAnamnesis({});
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileData, anamnesisData] = await Promise.all([
          api.getPlayerProfile(selectedAthlete.id),
          api.getAnamnesis(selectedAthlete.id)
        ]);
        
        setProfile(profileData || { athlete_id: selectedAthlete.id });
        setAnamnesis(anamnesisData || { athlete_id: selectedAthlete.id });
      } catch (error) {
        console.error("Erro ao carregar dados da ficha técnica:", error);
        toast.error("Erro ao carregar informações da ficha técnica.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    setIsEditing(false);
  }, [selectedAthlete]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) return;

    setIsSaving(true);
    try {
      await api.savePlayerProfile({
        ...profile,
        athlete_id: selectedAthlete.id
      });
      toast.success("Ficha Técnica atualizada com sucesso!");
      setIsEditing(false);
      if (onSave) onSave();
    } catch (error) {
      console.error("Erro ao salvar ficha técnica:", error);
      toast.error("Erro ao salvar ficha técnica.");
    } finally {
      setIsSaving(false);
    }
  };

  const getAge = (birthDateString?: string) => {
    if (!birthDateString) return '';
    try {
      return differenceInYears(new Date(), parseISO(birthDateString));
    } catch (e) {
      return '';
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !selectedAthlete) return;
    
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF da ficha técnica...');
    
    let container: HTMLDivElement | null = null;
    try {
      // Ensure images are loaded before capturing
      const images = printRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000); // 3s timeout for each image
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));

      // Create a temporary container for capture
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1200px';
      container.style.height = 'auto';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      // Temporarily make the original visible in the DOM to get correct computed styles
      const original = printRef.current;
      const hasHidden = original.classList.contains('hidden');
      const hasPrintOnly = original.classList.contains('print-only');

      if (hasHidden) original.classList.remove('hidden');
      if (hasPrintOnly) original.classList.remove('print-only');

      const originalDisplay = original.style.display;
      const originalPosition = original.style.position;
      const originalLeft = original.style.left;
      const originalVisibility = original.style.visibility;
      const originalOpacity = original.style.opacity;

      original.style.display = 'block';
      original.style.position = 'fixed';
      original.style.left = '-9999px';
      original.style.visibility = 'visible';
      original.style.opacity = '1';

      const clone = original.cloneNode(true) as HTMLElement;
      
      // Reset styles for capture to ensure proportionality
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.padding = '24px';
      clone.style.width = '800px';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      clone.style.display = 'block';
      clone.style.boxSizing = 'border-box';
      clone.classList.remove('hidden'); // Ensure it's visible for capture
      clone.classList.remove('print-only');

      // Force explicit font sizes and dimensions in the clone
      const originalElements = original.querySelectorAll('*');
      const cloneElements = clone.querySelectorAll('*');
      for (let i = 0; i < originalElements.length; i++) {
        const orig = originalElements[i] as HTMLElement;
        const cln = cloneElements[i] as HTMLElement;
        const style = window.getComputedStyle(orig);
        
        // Essential layout and typography styles
        const propsToCopy = [
          'fontSize', 'lineHeight', 'fontFamily', 'fontWeight', 'letterSpacing', 
          'textTransform', 'color', 
          'display', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign',
          'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'boxSizing',
          'objectFit', 'position', 'top', 'left', 'right', 'bottom', 'opacity',
          'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
          'backgroundRepeat', 'gap', 'columnGap', 'rowGap'
        ];
        
        propsToCopy.forEach(prop => {
          (cln.style as any)[prop] = (style as any)[prop];
        });

        const tagName = orig.tagName.toLowerCase();
        if (tagName === 'img' || tagName === 'svg') {
          cln.style.width = style.width;
          cln.style.height = style.height;
        }
      }

      // Restore original element visibility state immediately
      if (hasHidden) original.classList.add('hidden');
      if (hasPrintOnly) original.classList.add('print-only');
      original.style.display = originalDisplay;
      original.style.position = originalPosition;
      original.style.left = originalLeft;
      original.style.visibility = originalVisibility;
      original.style.opacity = originalOpacity;

      // Replace images in clone with data URLs if available
      const clonedImages = clone.querySelectorAll('img');
      clonedImages.forEach(img => {
        const src = img.getAttribute('src');
        if (src === settings?.schoolCrest && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
        } else if ((src === selectedAthlete.photo || img.alt === "Foto do Atleta" || (selectedAthlete.photo && src?.includes(selectedAthlete.photo))) && photoDataUrl) {
          img.setAttribute('src', photoDataUrl);
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body, true);
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      const pageHeightLimit = pdfHeight - (margin * 2);
      const x = (pdfWidth - contentWidth) / 2;

      if (contentHeight <= pageHeightLimit) {
        // Fits on a single page perfectly
        pdf.addImage(imgData, 'PNG', x, margin, contentWidth, contentHeight);
      } else {
        // Multi-page slicing using negative Y offset
        let heightLeft = contentHeight;
        let position = margin;
        let page = 0;

        while (heightLeft > 0) {
          if (page > 0) {
            pdf.addPage();
          }
          
          position = margin - (page * pageHeightLimit);
          pdf.addImage(imgData, 'PNG', x, position, contentWidth, contentHeight);
          
          // Cover the top and bottom margins with clean white rectangles to hide bleeding text
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdfWidth, margin, 'F');
          pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
          
          page++;
          heightLeft -= pageHeightLimit;
        }
      }

      pdf.save(`ficha_tecnica_${selectedAthlete.name?.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente usar a opção de imprimir.', { id: loadingToast });
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      setIsGeneratingPDF(false);
    }
  };

  const coachName = settings?.coaches ? settings.coaches.split(/,|\n/)[0].trim() : '';
  const assistantName = settings?.assistants ? settings.assistants.split(/,|\n/)[0].trim() : '';
  const presidentName = settings?.president || '';
  const technicalDirectorName = settings?.technicalDirector || '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Selection Header - Only if not standalone and not student */}
      {!standalone && !isStudent && !propAthlete && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Ficha Técnica do Jogador</h2>
              <p className="text-sm text-zinc-500 uppercase tracking-widest">Selecione um atleta para gerenciar seu boletim técnico e físico</p>
            </div>
          </div>
          <AthleteSearchSelect 
            onSelect={(a) => setSelectedAthlete(a)}
            selectedAthleteId={selectedAthlete?.id}
            athletes={athletes}
          />
        </div>
      )}

      {selectedAthlete ? (
        <div className="space-y-8">
          {/* Action buttons (Print and PDF) */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-2xl no-print">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-theme-primary/10 text-theme-primary rounded-xl">
                <FileText size={22} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Ficha Técnica e Desempenho</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{selectedAthlete.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-zinc-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 022-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Ficha
              </button>
              <button
                type="button"
                disabled={isGeneratingPDF}
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-black hover:bg-theme-primary/95 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Salvar em PDF
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Main Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLUMN 1: ATHLETE CARD (PHOTO & BASIC DEMOGRAPHICS + ANAMNESIS MINI SUMMARY) */}
            <div className="lg:col-span-1 space-y-8">
              {/* Profile Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-4 right-4 bg-theme-primary/10 text-theme-primary border border-theme-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {selectedAthlete.birth_date ? getSubCategory(selectedAthlete.birth_date) : 'N/A'}
                </div>

                <div className="relative w-36 h-36 mt-4 mb-6 rounded-full overflow-hidden border-4 border-theme-primary/20 group">
                  {selectedAthlete.photo && selectedAthlete.photo !== "no-image" ? (
                    <img 
                      src={selectedAthlete.photo} 
                      alt={selectedAthlete.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 text-zinc-500 flex items-center justify-center font-bold text-4xl uppercase">
                      {selectedAthlete.name?.substring(0, 2)}
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight mb-1">
                  {selectedAthlete.name}
                </h3>
                {selectedAthlete.nickname && (
                  <p className="text-sm font-bold text-theme-primary uppercase tracking-widest mb-4">
                    "{selectedAthlete.nickname}"
                  </p>
                )}

                <div className="w-full h-px bg-zinc-800/80 my-4" />

                <div className="w-full space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Nascimento / Idade</span>
                    <span className="text-zinc-200 font-bold">
                      {selectedAthlete.birth_date ? `${selectedAthlete.birth_date.split('-').reverse().join('/')} (${getAge(selectedAthlete.birth_date)} anos)` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Gênero</span>
                    <span className="text-zinc-200 font-bold uppercase">{selectedAthlete.gender || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Documento</span>
                    <span className="text-zinc-200 font-bold">{selectedAthlete.doc || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Nº Camisa</span>
                    <span className="text-zinc-200 font-bold">{selectedAthlete.jersey_number ? `#${selectedAthlete.jersey_number}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Modalidade</span>
                    <span className="text-zinc-200 font-bold uppercase">{selectedAthlete.modality || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Status</span>
                    <span className={cn(
                      "font-black uppercase text-[10px] px-2 py-0.5 rounded-md",
                      selectedAthlete.status === 'Ativo' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {selectedAthlete.status || 'Ativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Anamnesis / Health summary */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                    <Heart size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Ficha de Saúde (Anamnese)</h4>
                    <p className="text-[10px] text-zinc-500 uppercase">Resumo de segurança médica do atleta</p>
                  </div>
                </div>
                
                <div className="w-full h-px bg-zinc-800" />

                {anamnesis.athlete_id ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Restrições Alimentares</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.food_restriction && anamnesis.food_restriction !== 'NÃO' ? anamnesis.food_restriction : 'Nenhuma restrição registrada'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Alergias Registradas</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.allergies && anamnesis.allergies !== 'NÃO' ? anamnesis.allergies : 'Nenhuma alergia registrada'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Problemas Cardíacos / Respiratórios</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {[
                          anamnesis.cardiac_problems && anamnesis.cardiac_problems !== 'NÃO' ? `Cardíaco: ${anamnesis.cardiac_problems}` : null,
                          anamnesis.respiratory_problems && anamnesis.respiratory_problems !== 'NÃO' ? `Respiratório: ${anamnesis.respiratory_problems}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum problema crônico reportado'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Medicações Controladas</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.controlled_medication && anamnesis.controlled_medication !== 'NÃO' ? anamnesis.controlled_medication : 'Nenhum medicamento de uso contínuo'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-950 rounded-xl text-center border border-dashed border-zinc-800">
                    <p className="text-xs text-zinc-500">Nenhum dado de anamnese preenchido para este atleta.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2 & 3: DETAILS & EVALUATIONS */}
            <div className="lg:col-span-2 space-y-8">
              
              <form onSubmit={handleSave} className="space-y-8">
                {/* Section 1: Características e Registro do Jogador */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
                  
                  {/* Edit Toggle for Staff */}
                  {!isStudent && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="absolute top-6 right-6 px-4 py-2 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-black border border-theme-primary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Editar Ficha
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">1. Características e Registro do Jogador</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Dados de identificação, categoria, posições e pé dominante</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      
                      {/* Nacionalidade */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nacionalidade</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: BRASILEIRO"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.nationality || ''}
                            onChange={e => setProfile(prev => ({ ...prev, nationality: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.nationality || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Naturalidade (Cidade/Estado de origem) */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Naturalidade (Origem)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: SÃO PAULO - SP"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.birth_place || ''}
                            onChange={e => setProfile(prev => ({ ...prev, birth_place: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.birth_place || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Categoria */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Categoria</label>
                        {isEditing ? (
                          <select
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.category || ''}
                            onChange={e => setProfile(prev => ({ ...prev, category: e.target.value }))}
                          >
                            <option value="">Selecione a Categoria</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.category || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Posição Principal */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posição Principal</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: CENTROAVANTE"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.primary_position || ''}
                            onChange={e => setProfile(prev => ({ ...prev, primary_position: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
                            {profile.primary_position || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Posição Secundária */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posição Secundária</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: MEIA-ATACANTE"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.secondary_position || ''}
                            onChange={e => setProfile(prev => ({ ...prev, secondary_position: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.secondary_position || <span className="text-zinc-600">Nenhuma</span>}
                          </div>
                        )}
                      </div>

                      {/* Pé Dominante */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pé Dominante</label>
                        {isEditing ? (
                          <select
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.dominant_foot || ''}
                            onChange={e => setProfile(prev => ({ ...prev, dominant_foot: e.target.value as any }))}
                          >
                            <option value="">Selecione...</option>
                            <option value="DIREITO">DIREITO</option>
                            <option value="ESQUERDO">ESQUERDO</option>
                            <option value="AMBIDESTRO">AMBIDESTRO</option>
                          </select>
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.dominant_foot || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Número da Camisa */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Número da Camisa</label>
                        {isEditing ? (
                          <input
                            type="number"
                            placeholder="Ex: 9"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.jersey_number || ''}
                            onChange={e => setProfile(prev => ({ ...prev, jersey_number: e.target.value || undefined }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.jersey_number !== undefined ? `#${profile.jersey_number}` : <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Clube Atual */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clube Atual</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: PIRUÁ ESPORTE CLUBE"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.current_club || ''}
                            onChange={e => setProfile(prev => ({ ...prev, current_club: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.current_club || <span className="text-zinc-600">Sem Vínculo Externo</span>}
                          </div>
                        )}
                      </div>

                      {/* Tempo de Contrato */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo de Contrato / Vínculo</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 2 ANOS (ATÉ JULHO/2028)"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.contract_duration || ''}
                            onChange={e => setProfile(prev => ({ ...prev, contract_duration: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.contract_duration || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 2: Dados Físicos */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">2. Dados Físicos</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Medidas biométricas e Índice de Massa Corporal (IMC)</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      
                      {/* Altura */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Altura</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 1.78 m"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.height || ''}
                            onChange={e => setProfile(prev => ({ ...prev, height: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.height || <span className="text-zinc-600">--</span>}
                          </div>
                        )}
                      </div>

                      {/* Peso */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Peso</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 72 kg"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.weight || ''}
                            onChange={e => setProfile(prev => ({ ...prev, weight: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.weight || <span className="text-zinc-600">--</span>}
                          </div>
                        )}
                      </div>

                      {/* Envergadura */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Envergadura (Opcional)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 1.82 m"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.wingspan || ''}
                            onChange={e => setProfile(prev => ({ ...prev, wingspan: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.wingspan || <span className="text-zinc-600">--</span>}
                          </div>
                        )}
                      </div>

                      {/* IMC */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IMC (Opcional)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 22.7"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.imc || ''}
                            onChange={e => setProfile(prev => ({ ...prev, imc: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase flex items-center gap-2">
                            {profile.imc ? (
                              <>
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  parseFloat(profile.imc) >= 18.5 && parseFloat(profile.imc) < 25 ? "bg-green-500" : "bg-amber-500"
                                )} />
                                <span>{profile.imc}</span>
                              </>
                            ) : (
                              <span className="text-zinc-600">--</span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 3: Avaliações de Desempenho */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                        <Award size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider">3. Ficha de Avaliação de Desempenho</h3>
                        <p className="text-[10px] text-zinc-500 uppercase">Notas de 0 a 10 para habilidades técnicas, físicas, táticas e comportamentais</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Custom Tab Selector */}
                      <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('technical')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'technical'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <Award size={14} />
                          Técnico
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('physical')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'physical'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <Activity size={14} />
                          Físico
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('tactical')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'tactical'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <Target size={14} />
                          Tático
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('behavioral')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'behavioral'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <TrendingUp size={14} />
                          Comportamento
                        </button>
                      </div>

                      {/* Ratings Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {(activeRatingTab === 'technical' ? technicalFields :
                          activeRatingTab === 'physical' ? physicalFields :
                          activeRatingTab === 'tactical' ? tacticalFields :
                          behavioralFields).map((field) => {
                            const currentValue = profile[field.key] as number | undefined;
                            const ratingDetails = getRatingLabel(currentValue);

                            return (
                              <div key={field.key} className="space-y-3 bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                                        {field.label}
                                      </label>
                                      <span className="text-[10px] text-zinc-500 block">{field.description}</span>
                                    </div>
                                    <div className={cn("text-xs font-black uppercase px-2.5 py-1 rounded-md border flex items-center gap-1.5", ratingDetails.color)}>
                                      <span className="text-sm font-black">
                                        {currentValue !== undefined && currentValue !== null ? currentValue : '--'}
                                      </span>
                                      <span className="opacity-60">/10</span>
                                    </div>
                                  </div>

                                  {(currentValue !== undefined && currentValue !== null) && (
                                    <div className="space-y-1">
                                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                          className={cn("h-full transition-all duration-500", ratingDetails.barColor)}
                                          style={{ width: `${(currentValue / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                                        Status: <span className="text-zinc-300">{ratingDetails.text}</span>
                                      </span>
                                    </div>
                                  )}

                                  {isEditing && (
                                    <div className="space-y-2 pt-1">
                                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Definir Nota (0 a 10):</span>
                                      <div className="flex flex-wrap gap-1">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                          <button
                                            key={score}
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, [field.key]: score }))}
                                            className={cn(
                                              "w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-all border",
                                              currentValue === score
                                                ? "bg-theme-primary text-black border-theme-primary font-black scale-105 shadow-md shadow-theme-primary/20"
                                                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                                            )}
                                          >
                                            {score}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-zinc-900/60 mt-3 flex justify-between items-center gap-2">
                                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">
                                      Protocolo de Avaliação
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleGenerateTest(field)}
                                      className="py-1.5 px-3 rounded-lg bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 hover:text-purple-100 border border-purple-800/40 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <Sparkles size={11} className="text-purple-400 animate-pulse" />
                                      Gerar Teste IA
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      <div className="w-full h-px bg-zinc-800/50" />

                      {/* Tomada de Decisão */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Gauge size={14} className="text-theme-primary" />
                          Índice de Tomada de Decisão (Leitura de jogo sob pressão)
                        </h4>
                        {isEditing ? (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                            {["RUIM", "REGULAR", "BOM", "ÓTIMO", "EXCELENTE"].map((opt) => {
                              const isSelected = profile.decision_making === opt;
                              let activeClass = "";
                              
                              if (opt === "RUIM") activeClass = isSelected ? "bg-red-500 text-black border-red-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-red-400";
                              else if (opt === "REGULAR") activeClass = isSelected ? "bg-orange-500 text-black border-orange-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-orange-400";
                              else if (opt === "BOM") activeClass = isSelected ? "bg-yellow-500 text-black border-yellow-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-yellow-400";
                              else if (opt === "ÓTIMO") activeClass = isSelected ? "bg-green-500 text-black border-green-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-green-400";
                              else activeClass = isSelected ? "bg-emerald-400 text-black border-emerald-400 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-emerald-400";

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setProfile(prev => ({ ...prev, decision_making: opt }))}
                                  className={cn(
                                    "py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 uppercase tracking-wider",
                                    activeClass
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            {profile.decision_making ? (
                              (() => {
                                let badgeClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
                                if (profile.decision_making === "RUIM") badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
                                else if (profile.decision_making === "REGULAR") badgeClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
                                else if (profile.decision_making === "BOM") badgeClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                                else if (profile.decision_making === "ÓTIMO") badgeClass = "bg-green-500/10 text-green-500 border-green-500/20";
                                else if (profile.decision_making === "EXCELENTE") badgeClass = "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";

                                return (
                                  <div className={cn("px-5 py-3.5 rounded-2xl text-xs font-black uppercase border tracking-wider", badgeClass)}>
                                    {profile.decision_making}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="px-5 py-3.5 bg-zinc-950 text-zinc-600 rounded-2xl text-[10px] font-black border border-zinc-900 uppercase tracking-widest">
                                Não informado
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="w-full h-px bg-zinc-800/50" />

                      {/* Observações de Habilidades & Performance */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Activity size={14} className="text-theme-primary" />
                          Observações de Habilidades & Performance do Atleta
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Passe</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a qualidade e precisão do passe do atleta..."
                                rows={2}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_passing || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_passing: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-3 py-2.5 bg-zinc-950 rounded-xl text-xs text-zinc-350 font-medium uppercase min-h-[40px] leading-relaxed border border-zinc-900/40">
                                {profile.skills_passing || <span className="text-zinc-650 font-semibold">Nenhuma observação de passe.</span>}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cabeceio</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva o tempo de bola e técnica de cabeceio..."
                                rows={2}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_heading || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_heading: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-3 py-2.5 bg-zinc-950 rounded-xl text-xs text-zinc-350 font-medium uppercase min-h-[40px] leading-relaxed border border-zinc-900/40">
                                {profile.skills_heading || <span className="text-zinc-650 font-semibold">Nenhuma observação de cabeceio.</span>}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Drible</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a capacidade de improviso e drible..."
                                rows={2}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_dribbling || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_dribbling: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-3 py-2.5 bg-zinc-950 rounded-xl text-xs text-zinc-350 font-medium uppercase min-h-[40px] leading-relaxed border border-zinc-900/40">
                                {profile.skills_dribbling || <span className="text-zinc-650 font-semibold">Nenhuma observação de drible.</span>}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Velocidade</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a explosão, aceleração e velocidade final..."
                                rows={2}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_speed || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_speed: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-3 py-2.5 bg-zinc-950 rounded-xl text-xs text-zinc-350 font-medium uppercase min-h-[40px] leading-relaxed border border-zinc-900/40">
                                {profile.skills_speed || <span className="text-zinc-650 font-semibold">Nenhuma observação de velocidade.</span>}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tática</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a leitura tática, posicionamento e disciplina do atleta..."
                                rows={2}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_tactical || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_tactical: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-3 py-2.5 bg-zinc-950 rounded-xl text-xs text-zinc-350 font-medium uppercase min-h-[40px] leading-relaxed border border-zinc-900/40">
                                {profile.skills_tactical || <span className="text-zinc-650 font-semibold">Nenhuma observação de tática.</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 4: Histórico Clínico e Performance Física */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">4. Histórico Clínico e Performance Física</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Laudos de exames, acompanhamento de lesões e testes de performance</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      
                      {/* Exames de Rotina */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Exames de Rotina (Cardiológico, Pressão e Sangue)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva as últimas avaliações cardiológicas, exames sanguíneos e controle de pressão arterial..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.routine_exams || ''}
                            onChange={e => setProfile(prev => ({ ...prev, routine_exams: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.routine_exams || <span className="text-zinc-600">Nenhum exame cadastrado recentemente.</span>}
                          </div>
                        )}
                      </div>

                      {/* Histórico de Lesões */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Histórico de Lesões e Cirurgias (Com tempos de recuperação)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Ex: Entorse de tornozelo grau 2 em 10/2025 - 4 semanas de molho. Cirurgia de apendicite em 2024..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.injury_history || ''}
                            onChange={e => setProfile(prev => ({ ...prev, injury_history: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.injury_history || <span className="text-zinc-600">Sem histórico de lesões severas registrado.</span>}
                          </div>
                        )}
                      </div>

                      {/* Teste de Performance */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Testes Físicos de Performance (Força, Velocidade e Resistência Aeróbia)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva os resultados de salto, tempo de tiro de 30m, VO2 máx ou testes Yo-Yo..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.performance_tests || ''}
                            onChange={e => setProfile(prev => ({ ...prev, performance_tests: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.performance_tests || <span className="text-zinc-600">Sem testes de performance registrados.</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Edit Controls / Save buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form
                        if (selectedAthlete) {
                          api.getPlayerProfile(selectedAthlete.id).then(data => {
                            setProfile(data || { athlete_id: selectedAthlete.id });
                          });
                        }
                      }}
                      className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary/90 text-black font-black uppercase tracking-wider rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                      <Save size={14} />
                      {isSaving ? "Salvando..." : "Salvar Ficha Técnica"}
                    </button>
                  </div>
                )}
              </form>

            </div>

          </div>

          <div className="hidden print-only bg-white text-black p-4 font-sans select-none border-0 max-w-[800px] mx-auto" ref={printRef} style={{ fontSize: '10.5px', lineHeight: '1.3' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-2 mb-3">
              <div className="flex items-center gap-3">
                {crestDataUrl ? (
                  <img src={crestDataUrl} alt="Brasão" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                ) : settings?.schoolCrest ? (
                  <img src={settings.schoolCrest} alt="Brasão" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 bg-zinc-100 border border-zinc-400 rounded flex items-center justify-center text-black font-extrabold text-lg">P</div>
                )}
                <div className="text-left">
                  <h1 className="text-base font-black uppercase tracking-tight text-black">{settings?.schoolName || 'Piruá Esporte Clube'}</h1>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-650">Ficha Técnica e Avaliação de Desempenho do Atleta</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-between h-12">
                <span className="text-[8px] font-extrabold uppercase text-zinc-500">Documento Oficial</span>
                <div className="text-right">
                  <p className="text-[7px] font-bold uppercase text-zinc-500">Emissão:</p>
                  <p className="text-[9px] font-black text-black">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Photo & Core Information */}
            <div className="grid grid-cols-12 gap-4 mb-3">
              {/* Photo 3x4 strictly bounded */}
              <div className="col-span-3 flex flex-col items-center justify-start gap-1">
                <div 
                  className="border-2 border-zinc-900 rounded bg-zinc-100 flex items-center justify-center overflow-hidden shadow-sm"
                  style={{
                    width: '105px',
                    height: '140px',
                    minWidth: '105px',
                    minHeight: '140px',
                    maxWidth: '105px',
                    maxHeight: '140px',
                    boxSizing: 'border-box'
                  }}
                >
                  {(photoDataUrl || (selectedAthlete.photo && selectedAthlete.photo !== "no-image")) ? (
                    <img 
                      src={photoDataUrl || selectedAthlete.photo} 
                      alt="Foto do Atleta" 
                      className="object-cover animate-none" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 text-zinc-500">
                      <svg className="w-6 h-6 mb-1 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-[8px] font-bold uppercase tracking-widest leading-tight">FOTO 3x4</span>
                    </div>
                  )}
                </div>
                <p className="text-[8px] font-black uppercase text-zinc-600 tracking-wider">Identificação</p>
              </div>

              {/* Metadata Fields */}
              <div className="col-span-9 grid grid-cols-3 gap-y-2 gap-x-3.5">
                <div className="col-span-2">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Nome do Atleta</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{selectedAthlete.name || 'N/A'}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Apelido</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{selectedAthlete.nickname || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Data de Nascimento</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900">
                    {selectedAthlete.birth_date ? `${selectedAthlete.birth_date.split('-').reverse().join('/')} (${getAge(selectedAthlete.birth_date)} anos)` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Gênero</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900">{selectedAthlete.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Categoria</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 uppercase text-zinc-900">
                    {selectedAthlete.birth_date ? getSubCategory(selectedAthlete.birth_date) : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Nº Camisa</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900">#{selectedAthlete.jersey_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Pé Dominante</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 uppercase text-zinc-900">{profile.dominant_foot || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Posição Principal</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{profile.primary_position || 'N/A'}</p>
                </div>

                <div className="col-span-3">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Posição Secundária</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{profile.secondary_position || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Consolidated Biometrics & Decision Making row */}
            <div className="grid grid-cols-12 gap-4 mb-3">
              <div className="col-span-8">
                <h3 className="text-[9px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 flex items-center">Biometria & Dados Físicos</h3>
                <div className="grid grid-cols-4 gap-2 bg-zinc-50 p-2 rounded border border-zinc-300">
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">Altura</span>
                    <span className="text-xs font-black text-zinc-900">{profile.height ? `${profile.height} m` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">Peso</span>
                    <span className="text-xs font-black text-zinc-900">{profile.weight ? `${profile.weight} kg` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">Envergadura</span>
                    <span className="text-xs font-black text-zinc-900">{profile.wingspan ? `${profile.wingspan} cm` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">IMC (Corporal)</span>
                    <span className="text-xs font-black text-zinc-900">{profile.imc || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-4 flex flex-col justify-between">
                <h3 className="text-[9px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 flex items-center">Tomada de Decisão</h3>
                <div className="grid grid-cols-12 items-center bg-zinc-50 border border-zinc-300 rounded p-1.5 h-full">
                  <div className="col-span-8 pr-1.5 leading-tight">
                    <span className="text-[7px] font-bold uppercase text-zinc-500 block">Capacidade Geral</span>
                    <span className="text-[8.5px] font-medium text-zinc-650 leading-none">Visão sob pressão.</span>
                  </div>
                  <div className="col-span-4 text-center">
                    <div className="bg-amber-400 text-black border border-amber-600 rounded px-1.5 py-1 font-black uppercase text-[9px] tracking-wider truncate">
                      {profile.decision_making || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes Evaluations */}
            <div className="mb-3" style={{ boxSizing: 'border-box' }}>
              <h3 className="text-[9px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 flex items-center justify-center">
                Avaliação de Atributos do Atleta (Escala de 1 a 10)
              </h3>
              <div style={{ display: 'flex', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                {/* Técnico */}
                <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#ffffff', display: 'block', boxSizing: 'border-box' }}>
                  <h4 className="text-[8.5px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">
                    TÉCNICO
                  </h4>
                  <div style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
                    {technicalFields.map(f => {
                      const val = profile[f.key] as number | undefined;
                      return (
                        <div key={f.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', fontSize: '8px', lineHeight: '1.2', marginBottom: '5px', borderBottom: '1px dashed #e4e4e7', paddingBottom: '3px', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
                            <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px' }}>{f.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}>
                              <div style={{ width: '32px', height: '6px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                              </div>
                              <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                            </div>
                          </div>
                          <span style={{ color: '#52525b', fontSize: '6.5px', lineHeight: '1', display: 'block', fontStyle: 'italic', marginTop: '0.5px' }}>{f.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
 
                {/* Right Column containing Fisico, Tatico, Comportamental */}
                <div style={{ width: '50%', display: 'block', boxSizing: 'border-box' }}>
                  {/* Físico */}
                  <div style={{ border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#ffffff', boxSizing: 'border-box', marginBottom: '8px' }}>
                    <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">
                      FÍSICO
                    </h4>
                    <div style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
                      {physicalFields.map(f => {
                        const val = profile[f.key] as number | undefined;
                        return (
                          <div key={f.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', fontSize: '8px', lineHeight: '1.2', marginBottom: '5px', borderBottom: '1px dashed #e4e4e7', paddingBottom: '3px', boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
                              <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px' }}>{f.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}>
                                <div style={{ width: '32px', height: '6px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                  <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                                </div>
                                <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                              </div>
                            </div>
                            <span style={{ color: '#52525b', fontSize: '6.5px', lineHeight: '1', display: 'block', fontStyle: 'italic', marginTop: '0.5px' }}>{f.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
 
                  {/* Tático & Comportamental side by side */}
                  <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    {/* Tático */}
                    <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#ffffff', display: 'block', boxSizing: 'border-box' }}>
                      <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1 border border-zinc-900 text-center">
                        TÁTICO
                      </h4>
                      <div style={{ display: 'block', boxSizing: 'border-box' }}>
                        {tacticalFields.map(f => {
                          const val = profile[f.key] as number | undefined;
                          return (
                            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', fontSize: '8px', lineHeight: '1.2', marginBottom: '5px', borderBottom: '1px dashed #e4e4e7', paddingBottom: '3px', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
                                <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px' }}>{f.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}>
                                  <div style={{ width: '28px', height: '5px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                    <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                                  </div>
                                  <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                                </div>
                              </div>
                              <span style={{ color: '#52525b', fontSize: '6.5px', lineHeight: '1', display: 'block', fontStyle: 'italic', marginTop: '0.5px' }}>{f.description}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
 
                    {/* Comportamental */}
                    <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#ffffff', display: 'block', boxSizing: 'border-box' }}>
                      <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1 border border-zinc-900 text-center">
                        COMPORTAMENTAL
                      </h4>
                      <div style={{ display: 'block', boxSizing: 'border-box' }}>
                        {behavioralFields.map(f => {
                          const val = profile[f.key] as number | undefined;
                          return (
                            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', fontSize: '8px', lineHeight: '1.2', marginBottom: '5px', borderBottom: '1px dashed #e4e4e7', paddingBottom: '3px', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
                                <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px' }}>{f.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}>
                                  <div style={{ width: '28px', height: '5px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                    <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                                  </div>
                                  <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                                </div>
                              </div>
                              <span style={{ color: '#52525b', fontSize: '6.5px', lineHeight: '1', display: 'block', fontStyle: 'italic', marginTop: '0.5px' }}>{f.description}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance and Medical history */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '12px', boxSizing: 'border-box' }}>
              {/* Notes */}
              <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#fafafa', boxSizing: 'border-box', display: 'block' }}>
                <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">
                  Habilidades & Performance
                </h4>
                <div style={{ display: 'block', fontSize: '8.5px', boxSizing: 'border-box' }}>
                  <div style={{ width: '100%', display: 'block', boxSizing: 'border-box', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '65px', display: 'inline-block' }}>Passe:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_passing || 'N/A'}</span>
                  </div>
                  <div style={{ width: '100%', display: 'block', boxSizing: 'border-box', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '65px', display: 'inline-block' }}>Cabeceio:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_heading || 'N/A'}</span>
                  </div>
                  <div style={{ width: '100%', display: 'block', boxSizing: 'border-box', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '65px', display: 'inline-block' }}>Drible:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_dribbling || 'N/A'}</span>
                  </div>
                  <div style={{ width: '100%', display: 'block', boxSizing: 'border-box', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '65px', display: 'inline-block' }}>Velocidade:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_speed || 'N/A'}</span>
                  </div>
                  <div style={{ width: '100%', display: 'block', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '65px', display: 'inline-block' }}>Tática:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_tactical || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#fafafa', display: 'block', boxSizing: 'border-box' }}>
                <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1 border border-zinc-900 text-center">
                  Histórico Clínico & Exames
                </h4>
                <div style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ width: '100%', boxSizing: 'border-box', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px', display: 'block' }}>Exames de Rotina:</span>
                    <p style={{ color: '#111827', lineHeight: '1.25', fontStyle: 'normal', backgroundColor: '#ffffff', padding: '5px 8px 8px 8px', borderRadius: '4px', border: '1px solid #e4e4e7', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontSize: '7.5px', marginTop: '2px', display: 'block' }}>{profile.routine_exams || 'Sem observações.'}</p>
                  </div>
                  <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px', display: 'block' }}>Histórico de Lesões:</span>
                    <p style={{ color: '#111827', lineHeight: '1.25', fontStyle: 'normal', backgroundColor: '#ffffff', padding: '5px 8px 8px 8px', borderRadius: '4px', border: '1px solid #e4e4e7', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontSize: '7.5px', marginTop: '2px', display: 'block' }}>{profile.injury_history || 'Sem registro.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Anamnesis block (if available) */}
            {anamnesis.athlete_id && (
              <div className="mb-3 border border-zinc-300 rounded p-2 bg-zinc-50" style={{ boxSizing: 'border-box' }}>
                <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">FICHA DE SAÚDE (ANAMNESE DO ATLETA)</h4>
                
                <div style={{ display: 'flex', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                  {/* Col 1: Restrições & Alergias */}
                  <div style={{ width: '33.33%', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Restrições Alimentares:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">{anamnesis.food_restriction && anamnesis.food_restriction !== 'NÃO' ? anamnesis.food_restriction : 'Nenhuma'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Alergias Registradas:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">{anamnesis.allergies && anamnesis.allergies !== 'NÃO' ? anamnesis.allergies : 'Nenhuma'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Restrições a Medicamentos:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">{anamnesis.medication_restriction && anamnesis.medication_restriction !== 'NÃO' ? anamnesis.medication_restriction : 'Nenhuma'}</span>
                    </div>
                  </div>

                  {/* Col 2: Condições Crônicas & Tratamento */}
                  <div style={{ width: '33.33%', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Problemas Cardíacos & Respiratórios:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.cardiac_problems && anamnesis.cardiac_problems !== 'NÃO' ? `Cardíaco: ${anamnesis.cardiac_problems}` : null,
                          anamnesis.respiratory_problems && anamnesis.respiratory_problems !== 'NÃO' ? `Respiratório: ${anamnesis.respiratory_problems}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Outros Diagnósticos:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.hypertension && anamnesis.hypertension !== 'NÃO' ? `Hipertensão: ${anamnesis.hypertension}` : null,
                          anamnesis.hypotension && anamnesis.hypotension !== 'NÃO' ? `Hipotensão: ${anamnesis.hypotension}` : null,
                          anamnesis.epilepsy && anamnesis.epilepsy !== 'NÃO' ? `Epilepsia: ${anamnesis.epilepsy}` : null,
                          anamnesis.diabetes && anamnesis.diabetes !== 'NÃO' ? `Diabetes: ${anamnesis.diabetes}` : null
                        ].filter(Boolean).join(' | ') || 'Sem observações'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Tratamento & Medicação Contínua:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.medical_treatment && anamnesis.medical_treatment !== 'NÃO' ? `Tratamento: ${anamnesis.medical_treatment}` : null,
                          anamnesis.controlled_medication && anamnesis.controlled_medication !== 'NÃO' ? `Med. Controlada: ${anamnesis.controlled_medication}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum'}
                      </span>
                    </div>
                  </div>

                  {/* Col 3: Patologias & Hábitos */}
                  <div style={{ width: '33.33%', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Patologias (TDAH, TEA, TOD):</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {(() => {
                          try {
                            const paths = JSON.parse(anamnesis.pathologies || '[]');
                            const pathStr = paths.length > 0 ? paths.join(', ') : 'Nenhuma';
                            if (anamnesis.pathologies_description) {
                              return `${pathStr} (${anamnesis.pathologies_description})`;
                            }
                            return pathStr;
                          } catch (_) {
                            return 'Nenhuma';
                          }
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Sono & Fadiga:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.sleep_time ? `Dorme às: ${anamnesis.sleep_time}` : null,
                          anamnesis.wake_up_difficulty && anamnesis.wake_up_difficulty !== 'NÃO' ? `Dificuldade para acordar: ${anamnesis.wake_up_difficulty}` : null
                        ].filter(Boolean).join(' | ') || 'Sem registros'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Fraturas & Exercícios:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.fractures && anamnesis.fractures !== 'NÃO' ? `Fraturas: ${anamnesis.fractures}` : null,
                          anamnesis.other_exercises && anamnesis.other_exercises !== 'NÃO' ? `Exercícios: ${anamnesis.other_exercises}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures Footer */}
            <div className="mt-5 space-y-3">
              <div className="flex justify-between gap-8 pt-2">
                {/* Commission Signatures */}
                <div className="flex-1 text-center flex flex-col justify-end">
                  <div className="border-b border-zinc-900 w-48 mx-auto mb-1"></div>
                  <p className="text-[9px] font-black uppercase text-black">
                    {coachName || 'Comissão Técnica / Professor'}
                  </p>
                  <p className="text-[7.5px] font-bold uppercase text-zinc-500 tracking-wider">
                    Treinador / Professor
                  </p>
                  {assistantName && (
                    <p className="text-[7px] text-zinc-400 uppercase tracking-tighter">Auxiliar: {assistantName}</p>
                  )}
                </div>

                {/* Board Signatures */}
                <div className="flex-1 text-center flex flex-col justify-end">
                  <div className="border-b border-zinc-900 w-48 mx-auto mb-1"></div>
                  <p className="text-[9px] font-black uppercase text-black">
                    {presidentName || technicalDirectorName || 'Diretoria / Coordenação'}
                  </p>
                  <p className="text-[7.5px] font-bold uppercase text-zinc-500 tracking-wider">
                    {presidentName ? 'Presidente - Diretoria' : technicalDirectorName ? 'Diretor Técnico' : 'Coordenação / Diretoria'}
                  </p>
                  {presidentName && technicalDirectorName && (
                    <p className="text-[7px] text-zinc-400 uppercase tracking-tighter">Dir. Técnico: {technicalDirectorName}</p>
                  )}
                </div>
              </div>
              
              <div className="text-center pt-1.5 border-t border-zinc-300 flex justify-between items-center text-[7.5px] text-zinc-400 font-bold uppercase tracking-widest">
                <span>{settings?.schoolName || 'Piruá Esporte Clube'}</span>
                <span>Formando Atletas, Cidadãos e Campeões</span>
                <span>© {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-900 rounded-[2.5rem] border border-zinc-800 text-zinc-500">
          <p className="uppercase text-sm font-bold tracking-widest">Nenhum jogador selecionado para exibir a Ficha Técnica.</p>
        </div>
      )}

      {/* AI Test Assessment Modal */}
      {activeTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800/80 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-850 bg-gradient-to-r from-purple-950/20 via-zinc-900 to-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Gerador de Testes IA
                  </h3>
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">
                    Ficha Técnica / {selectedFieldForTest?.label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTestModal(false)}
                className="p-1.5 rounded-xl bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-700/30 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto max-h-[75vh] scrollbar-thin scrollbar-thumb-zinc-800">
              {isGeneratingTest ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">
                      Analisando Atributo de {selectedFieldForTest?.label}...
                    </p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      O Gemini está desenvolvendo o protocolo de teste científico e a simulação de movimentação
                    </p>
                  </div>
                </div>
              ) : generatedTest ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Test details and instructions (7/12 width) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Test Title & Objective */}
                    <div className="p-5 bg-zinc-950/40 rounded-2xl border border-zinc-800/60 space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        {generatedTest.testName}
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {generatedTest.objective}
                      </p>
                    </div>

                    {/* Materials */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black text-purple-300 uppercase tracking-wider">
                        Materiais Necessários
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {generatedTest.materials.map((mat: string, i: number) => (
                          <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/30 border border-zinc-850">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <span className="text-xs text-zinc-300">{mat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Setup */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black text-purple-300 uppercase tracking-wider">
                        Como Montar a Estrutura
                      </h5>
                      <div className="p-4 rounded-2xl bg-zinc-950/20 border border-zinc-850/80 text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                        {generatedTest.setup}
                      </div>
                    </div>

                    {/* Execution */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black text-purple-300 uppercase tracking-wider">
                        Execução / Passo a Passo
                      </h5>
                      <div className="space-y-2.5">
                        {generatedTest.execution.map((step: string, i: number) => (
                          <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-zinc-950/30 border border-zinc-850/60">
                            <span className="flex-shrink-0 w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-xs text-zinc-300 leading-relaxed pt-0.5">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scoring Criteria Table */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black text-purple-300 uppercase tracking-wider">
                        Métricas de Nota (0 a 10)
                      </h5>
                      <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-950/40">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400">
                              <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] w-1/3">Nota recomendada</th>
                              <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] w-2/3">Critério Prático</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                            {generatedTest.scoringCriteria.map((cri: any, i: number) => (
                              <tr key={i} className="hover:bg-zinc-900/30">
                                <td className="p-3.5 font-bold text-white whitespace-nowrap">
                                  <span className={cn(
                                    "px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-wider border",
                                    cri.scoreRange.includes("9") || cri.scoreRange.includes("Excelente") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    cri.scoreRange.includes("7") || cri.scoreRange.includes("Bom") ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                    cri.scoreRange.includes("5") || cri.scoreRange.includes("Regular") ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                    "bg-red-500/10 text-red-400 border-red-500/20"
                                  )}>
                                    {cri.scoreRange}
                                  </span>
                                </td>
                                <td className="p-3.5 text-zinc-400 leading-relaxed">{cri.criteria}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black text-purple-300 uppercase tracking-wider">
                        Dicas e Recomendações
                      </h5>
                      <div className="space-y-2">
                        {generatedTest.tips.map((tip: string, i: number) => (
                          <div key={i} className="flex gap-2.5 items-start text-xs text-zinc-400">
                            <span className="text-purple-400 text-sm mt-px">•</span>
                            <span className="leading-relaxed">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 2D/3D Animated Tactic Board & YouTube demonstrations (5/12 width) */}
                  <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-0">
                    
                    {/* Simulated 3D Animated Video Explainer / Tactic Board */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Simulador Animado da Atividade
                        </h5>
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">
                          Visualizador 2D/3D Interativo
                        </span>
                      </div>
                      <div className="p-1 bg-zinc-950/40 rounded-[2rem] border border-zinc-800/80 overflow-hidden shadow-inner h-[320px] sm:h-[380px] lg:h-[400px]">
                        {mockActivity && (
                          <DrillVisualizer
                            activity={mockActivity as any}
                            executionSteps={generatedTest.execution}
                            onChange={(newVisualData) => {
                               setGeneratedTest((prev: any) => ({
                                 ...prev,
                                 visualObjects: JSON.parse(newVisualData)
                               }));
                            }}
                            isEditable={true}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold text-center">
                        Dica: Clique no <strong className="text-zinc-300">Play</strong> para simular a corrida de teste, ou arraste os atletas e cones para personalizar!
                      </p>
                    </div>

                    {/* YouTube Support Video Card */}
                    {generatedTest.youtubeSearchQuery && (
                      <div className="p-5 rounded-2xl border border-red-950/40 bg-gradient-to-br from-red-950/10 to-transparent flex flex-col gap-4 shadow-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-red-400">
                            <Youtube size={18} className="fill-red-400 text-red-500 animate-pulse" />
                            <h5 className="text-xs font-black uppercase tracking-wider">
                              Demonstração Prática no YouTube
                            </h5>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            Buscamos o termo técnico exato para você encontrar vídeos e exercícios idênticos a esse teste no YouTube:
                          </p>
                          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-xs font-mono text-zinc-200 select-all italic text-center mt-2">
                            "{generatedTest.youtubeSearchQuery}"
                          </div>
                        </div>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(generatedTest.youtubeSearchQuery)}`, '_blank', 'noopener,noreferrer')}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 text-white hover:bg-red-750 font-black text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-102 active:scale-98"
                          >
                            <Youtube size={14} className="fill-white text-white shrink-0" />
                            Buscar Termo Técnico Principal
                          </button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${generatedTest.youtubeSearchQuery} drills profissional`)}`, '_blank', 'noopener,noreferrer')}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                              title="Adiciona 'drills profissional' para obter sessões de treino reais de alto nível"
                            >
                              <Sparkles size={11} className="text-amber-400" />
                              Drills de Elite
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${generatedTest.youtubeSearchQuery} como treinar passo a passo`)}`, '_blank', 'noopener,noreferrer')}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                              title="Adiciona 'como treinar passo a passo' para obter vídeos explicativos e tutoriais práticos"
                            >
                              <HelpCircle size={11} className="text-blue-400" />
                              Como Treinar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 uppercase text-xs font-bold">
                  Erro ao carregar o teste.
                </div>
              )}
            </div>

            {/* Footer / CTA Actions */}
            <div className="p-6 border-t border-zinc-850 bg-zinc-950/40 flex flex-wrap gap-3 justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                Gerador de Treinos Alinhados à Metodologia
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-750 hover:text-white transition-all text-xs font-black uppercase tracking-wider cursor-pointer border border-transparent"
                >
                  Fechar
                </button>
                {generatedTest && (
                  <button
                    type="button"
                    disabled={isSavingTestAsActivity || savedActivitySuccess}
                    onClick={saveTestAsTrainingActivity}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border",
                      savedActivitySuccess
                        ? "bg-emerald-500 text-black border-emerald-500 scale-102"
                        : "bg-theme-primary text-black border-theme-primary hover:opacity-90"
                    )}
                  >
                    {isSavingTestAsActivity ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Salvando...
                      </>
                    ) : savedActivitySuccess ? (
                      <>
                        <Check size={14} />
                        Salvo no Banco!
                      </>
                    ) : (
                      <>
                        <ListPlus size={14} />
                        Salvar no Banco de Treinos
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
