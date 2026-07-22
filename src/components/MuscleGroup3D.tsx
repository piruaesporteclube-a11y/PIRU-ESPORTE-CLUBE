import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Dumbbell, 
  RotateCcw, 
  Eye, 
  Search, 
  Activity, 
  ShieldAlert, 
  Sparkles, 
  Printer, 
  Maximize2, 
  Info, 
  CheckCircle2, 
  Zap, 
  HeartPulse, 
  ChevronRight, 
  ChevronLeft,
  X,
  Layers,
  HelpCircle,
  Play,
  Share2
} from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';

// Muscle Group Data Model
export interface MuscleGroup {
  id: string;
  name: string;
  latinName: string;
  category: 'superiores' | 'tronco' | 'inferiores';
  side: 'anterior' | 'posterior' | 'ambos';
  footballFunction: string;
  description: string;
  exercises: {
    name: string;
    description: string;
    type: 'Força' | 'Hipertrofia' | 'Explosão' | 'Estabilidade';
  }[];
  prevention: string;
  stretches: string;
  injuryRisk: 'Baixo' | 'Médio' | 'Alto' | 'Crítico no Futebol';
  color: string;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: 'peitoral',
    name: 'Peitoral',
    latinName: 'Pectoralis Major & Minor',
    category: 'tronco',
    side: 'anterior',
    footballFunction: 'Crucial na proteção corporal em disputas no ombro a ombro, arremessos laterais fortes e equilíbrio no arranque.',
    description: 'Composto pelo Peitoral Maior e Menor, é a principal massa muscular do tórax anterior.',
    exercises: [
      { name: 'Supino Reto / Inclinado', description: 'Desenvolve força de empurrão e estabilização de tronco.', type: 'Força' },
      { name: 'Flexão de Braço (Push-up)', description: 'Excelente para estabilização de core e cintura escapular.', type: 'Estabilidade' },
      { name: 'Arremesso com Ball Medicinal', description: 'Desenvolve explosão muscular para laterais longos.', type: 'Explosão' }
    ],
    prevention: 'Alongar a cadeia anterior para evitar projeção dos ombros e descompensação com a musculatura das costas.',
    stretches: 'Alongamento em quina de parede ou barra vertical mantendo o peito aberto.',
    injuryRisk: 'Médio',
    color: '#ef4444' // red
  },
  {
    id: 'deltoides',
    name: 'Ombros (Deltoides)',
    latinName: 'Deltoideus (Anterior, Lateral, Posterior)',
    category: 'superiores',
    side: 'ambos',
    footballFunction: 'Absorção de impactos em quedas, proteção do pescoço em disputas aéreas e impulsão dos braços no sprint.',
    description: 'O deltoide envolve a articulação do ombro em três porções: anterior, lateral e posterior.',
    exercises: [
      { name: 'Desenvolvimento com Halteres', description: 'Fortalecimento completo dos ombros.', type: 'Força' },
      { name: 'Elevação Lateral', description: 'Fortalece porção média para absorção de carga lateral.', type: 'Hipertrofia' },
      { name: 'Crucifixo Inverso', description: 'Fortalece porção posterior e postura escapular.', type: 'Estabilidade' }
    ],
    prevention: 'Fortalecimento constante do manguito rotador e controle de estabilidade da escápula.',
    stretches: 'Puxada do braço em cruz sobre o peito e rotação escapular suave.',
    injuryRisk: 'Médio',
    color: '#f97316' // orange
  },
  {
    id: 'biceps',
    name: 'Bíceps Braquial',
    latinName: 'Biceps Brachii & Brachialis',
    category: 'superiores',
    side: 'anterior',
    footballFunction: 'Auxilia na postura de corrida com cotovelos flexionados e tração durante disputas de bola.',
    description: 'Localizado na parte anterior do braço, atua na flexão do cotovelo e supinação do antebraço.',
    exercises: [
      { name: 'Rosca Direta com Barra / Halter', description: 'Isolamento básico para bíceps.', type: 'Hipertrofia' },
      { name: 'Rosca Martelo', description: 'Fortalece braquial e antebraço para pegada e força.', type: 'Força' },
      { name: 'Barra Fixa Supinada', description: 'Trabalho composto de bíceps e costas.', type: 'Força' }
    ],
    prevention: 'Evitar hiperextensão abrupta com cargas excessivas sem aquecimento prévio.',
    stretches: 'Extensão completa do braço com dedos puxados para trás.',
    injuryRisk: 'Baixo',
    color: '#eab308' // yellow
  },
  {
    id: 'triceps',
    name: 'Tríceps Braquial',
    latinName: 'Triceps Brachii',
    category: 'superiores',
    side: 'posterior',
    footballFunction: 'Impulsão para se levantar rapidamente do chão, empurrão de defesa de posição e arremessos.',
    description: 'Compreende 60% do volume do braço, dividido em cabeça longa, lateral e medial.',
    exercises: [
      { name: 'Tríceps Testa / Pulley', description: 'Construção de força estendendo o cotovelo.', type: 'Hipertrofia' },
      { name: 'Flexão Diamante (Fechada)', description: 'Força funcional com peso corporal.', type: 'Explosão' },
      { name: 'Mergulho em Paralelas', description: 'Trabalho composto para tríceps e peitoral.', type: 'Força' }
    ],
    prevention: 'Fortalecer tendão quadricipital do cotovelo e manter bom aquecimento.',
    stretches: 'Elevação do braço acima da cabeça dobrando o cotovelo para trás da nuca.',
    injuryRisk: 'Baixo',
    color: '#3b82f6' // blue
  },
  {
    id: 'antebravos',
    name: 'Antebraços',
    latinName: 'Flexor & Extensor Carpi',
    category: 'superiores',
    side: 'ambos',
    footballFunction: 'Fundamental para goleiros na firmeza da agarre e jogadores de linha na proteção de quedas.',
    description: 'Músculos da parte inferior do braço responsáveis pelo movimento de punhos e dedos.',
    exercises: [
      { name: 'Rosca Punho Direta e Inversa', description: 'Fortalece flexores e extensores do punho.', type: 'Estabilidade' },
      { name: 'Caminhada do Fazendeiro (Farmer Walk)', description: 'Aumenta força de preensão manual e antebraço.', type: 'Força' }
    ],
    prevention: 'Evitar sobrecarga repetitiva do punho e fortalecer estabilização articular.',
    stretches: 'Extensão e flexão passiva do punho com os dedos estendidos.',
    injuryRisk: 'Baixo',
    color: '#06b6d4' // cyan
  },
  {
    id: 'abdomen',
    name: 'Abdômen & Core',
    latinName: 'Rectus Abdominis, Obliques & Transversus',
    category: 'tronco',
    side: 'anterior',
    footballFunction: 'O "motor central" do futebolista: transfere força das pernas para o tronco no chute, rotação e impulsão.',
    description: 'Inclui o reto abdominal, oblíquos internos/externos e o transverso (cinturão de estabilidade).',
    exercises: [
      { name: 'Prancha Frontal e Lateral', description: 'Estabilidade isométrica do núcleo do corpo.', type: 'Estabilidade' },
      { name: 'Pallof Press com Elástico', description: 'Anti-rotação essencial para mudanças de direção.', type: 'Estabilidade' },
      { name: 'Abdominal Infra na Barra', description: 'Desenvolve força na porção inferior e flexores de quadril.', type: 'Força' }
    ],
    prevention: 'Essencial na prevenção de pubalgia quando trabalhado em equilíbrio com os adutores.',
    stretches: 'Postura da cobra (extensão abdominal suave) e rotação de tronco no solo.',
    injuryRisk: 'Alto',
    color: '#10b981' // emerald
  },
  {
    id: 'trapezio',
    name: 'Trapézio & Pescoço',
    latinName: 'Trapezius & Sternocleidomastoid',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Absorve impactos no cabeceio, reduz risco de concussão e protege a coluna cervical.',
    description: 'Músculo largo em formato de diamante que cobre a nuca, ombros e meio das costas.',
    exercises: [
      { name: 'Encolhimento de Ombros com Barra', description: 'Desenvolvimento do trapézio superior.', type: 'Força' },
      { name: 'Isometria Cervical com Faixa', description: 'Aumenta a resistência do pescoço contra impactos.', type: 'Estabilidade' },
      { name: 'Face Pull na Polia', description: 'Fortalece trapézio médio/inferior e postura.', type: 'Estabilidade' }
    ],
    prevention: 'O fortalecimento cervical reduz comprovadamente o risco de traumatismo e chicotada no cabeceio.',
    stretches: 'Inclinação lateral da cabeça com leve tração manual.',
    injuryRisk: 'Médio',
    color: '#a855f7' // purple
  },
  {
    id: 'dorsal',
    name: 'Costas (Dorsal & Romboides)',
    latinName: 'Latissimus Dorsi & Rhomboids',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Garante postura ereta nas corridas intensas, tração de braços no arranque e proteção nas disputas.',
    description: 'Garante a largura das costas (asa) e a aproximação das escápulas.',
    exercises: [
      { name: 'Puxada Frontal / Barra Fixa', description: 'Construção de largura e força de puxada.', type: 'Força' },
      { name: 'Remada Curvada / Cavalinho', description: 'Densidade muscular para postura corporal.', type: 'Hipertrofia' },
      { name: 'Remada Unilateral com Halter', description: 'Trabalho isolado e simétrico de costas.', type: 'Força' }
    ],
    prevention: 'Fortalecer para contrabalançar o peitoral e evitar hipercifose e dores nas costas.',
    stretches: 'Abraçar os joelhos flexionados no solo ou pendurar-se na barra fixa.',
    injuryRisk: 'Baixo',
    color: '#8b5cf6' // violet
  },
  {
    id: 'lombar',
    name: 'Lombar (Erretores da Espinha)',
    latinName: 'Erector Spinae & Multifidus',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Sustentação da coluna em saltos de cabeceio, giros bruscos e aterrisagens.',
    description: 'Músculos profundos que correm ao longo da coluna vertebral inferior.',
    exercises: [
      { name: 'Extensão Lombar no Banco 45°', description: 'Fortalecimento da cadeia posterior baixa.', type: 'Estabilidade' },
      { name: 'Stiff / Levantamento Terra', description: 'Exercício composto de grande ativação da lombar.', type: 'Força' },
      { name: 'Prancha Super-Homem', description: 'Ativação postural suave.', type: 'Estabilidade' }
    ],
    prevention: 'Fortalecer sem sobrecarregar com excesso de carga sem técnica adequada. Evita lombalgia.',
    stretches: 'Postura da criança (yoga) trazendo o quadril nos calcanhares.',
    injuryRisk: 'Alto',
    color: '#ec4899' // pink
  },
  {
    id: 'gluteos',
    name: 'Glúteos (Máximo, Médio e Mínimo)',
    latinName: 'Gluteus Maximus, Medius & Minimus',
    category: 'inferiores',
    side: 'posterior',
    footballFunction: 'O gerador de potência primário do atleta: aceleração do sprint, salto vertical e desaceleração.',
    description: 'O maior e mais potente grupo muscular do corpo humano, essencial na dinâmica esportiva.',
    exercises: [
      { name: 'Elevação Pélvica (Hip Thrust)', description: 'O melhor exercício para pico de potência dos glúteos.', type: 'Explosão' },
      { name: 'Agachamento Profundo', description: 'Trabalho de força máxima na cadeia inferior.', type: 'Força' },
      { name: 'Abdução de Quadril com Elástico', description: 'Ativa glúteo médio para estabilizar o joelho no chute.', type: 'Estabilidade' }
    ],
    prevention: 'Evitar "amnésia glútea" (falta de ativação) para prevenir sobrecarga na lombar e posteriores.',
    stretches: 'Alongamento do piriforme cruzando a perna sobre o joelho oposto.',
    injuryRisk: 'Médio',
    color: '#f43f5e' // rose
  },
  {
    id: 'quadriceps',
    name: 'Quadríceps',
    latinName: 'Quadriceps Femoris (Rectus Femoris, Vastus)',
    category: 'inferiores',
    side: 'anterior',
    footballFunction: 'Força bruta de chute, extensão explosiva do joelho, freadas bruscas e mudanças de direção.',
    description: 'Grupo de quatro músculos na frente da coxa: Reto Femoral, Vasto Lateral, Medial e Intermédio.',
    exercises: [
      { name: 'Agachamento Livre com Barra', description: 'Rei dos exercícios de perna para atletas.', type: 'Força' },
      { name: 'Leg Press 45°', description: 'Carga pesada segura para volume muscular.', type: 'Hipertrofia' },
      { name: 'Cadeira Extensora', description: 'Isolamento da extensão de joelho e vasto medial.', type: 'Hipertrofia' },
      { name: 'Passada / Afundo Dinâmico', description: 'Força unilateral e transferência para corrida.', type: 'Explosão' }
    ],
    prevention: 'Manter equilíbrio de força com os isquiotibiais (razão I/Q ideal > 60%) para proteger o LCA.',
    stretches: 'Puxada do calcanhar em direção ao glúteo em pé.',
    injuryRisk: 'Alto',
    color: '#e11d48' // rose dark
  },
  {
    id: 'isquiotibiais',
    name: 'Posteriores de Coxa (Isquiotibiais)',
    latinName: 'Biceps Femoris, Semitendinosus & Semimembranosus',
    category: 'inferiores',
    side: 'posterior',
    footballFunction: 'Frenagem no sprint máximo, flexão do joelho e proteção direta do Ligamento Cruzado Anterior (LCA).',
    description: 'Músculos da parte de trás da coxa. É a musculatura com maior índice de lesões no futebol.',
    exercises: [
      { name: 'Exercício Nórdico (Nordic Hamstring)', description: 'Insuperável na prevenção de estiramentos excêntricos no futebol!', type: 'Explosão' },
      { name: 'Mesa Flexora / Cadeira Flexora', description: 'Isolamento da flexão de joelhos.', type: 'Hipertrofia' },
      { name: 'RDL / Stiff Unilateral', description: 'Força na extensão de quadril com foco posterior.', type: 'Força' }
    ],
    prevention: 'Treino excêntrico semanal obrigatório no futebol! Previne os estiramentos na velocidade máxima.',
    stretches: 'Elevação da perna estendida ou inclinação à frente tocando as pontas dos pés.',
    injuryRisk: 'Crítico no Futebol',
    color: '#dc2626' // red high
  },
  {
    id: 'adutores',
    name: 'Adutores do Quadril',
    latinName: 'Adductor Longus, Magnus, Brevis & Gracilis',
    category: 'inferiores',
    side: 'anterior',
    footballFunction: 'Passe de chapa, chute colocado, controle de bola interno e estabilidade do quadril nas divididas.',
    description: 'Músculos situados na parte interna da coxa.',
    exercises: [
      { name: 'Prancha de Copenhagen', description: 'O melhor exercício do mundo para prevenir pubalgia no futebol!', type: 'Estabilidade' },
      { name: 'Agachamento Sumô', description: 'Ativação de adutores sob carga.', type: 'Força' },
      { name: 'Adução na Polia / Cadeira Adutora', description: 'Fortalecimento focado da parte interna.', type: 'Hipertrofia' }
    ],
    prevention: 'Prancha de Copenhagen 2x por semana evita pubalgia e inflamações no sínfise púbica.',
    stretches: 'Abertura borboleta sentado ou afundo lateral com perna estendida.',
    injuryRisk: 'Crítico no Futebol',
    color: '#fbbf24' // amber
  },
  {
    id: 'panturrilhas',
    name: 'Panturrilhas & Tíbia',
    latinName: 'Gastrocnemius, Soleus & Tibialis Anterior',
    category: 'inferiores',
    side: 'ambos',
    footballFunction: 'Propulsão final no salto e na corrida, reação rápida no drible e absorção do pisar no gramado.',
    description: 'Formada pelo Gastrocnêmio (duas cabeças) e Sóleo na parte posterior, e Tibial na anterior.',
    exercises: [
      { name: 'Elevação de Calcanhar em Pé', description: 'Trabalho de Gastrocnêmio com joelhos estendidos.', type: 'Força' },
      { name: 'Elevação de Calcanhar Sentado', description: 'Foco no músculo Sóleo profundos.', type: 'Hipertrofia' },
      { name: 'Caminhada de Calcanhar (Tibial)', description: 'Fortalece tibial anterior para prevenir canelite.', type: 'Estabilidade' }
    ],
    prevention: 'Evitar sobrecarga contínua sem hidratação e magnésio para evitar cãibras e tendinite de Aquiles.',
    stretches: 'Inclinação na parede com o calcanhar traseiro colado no chão.',
    injuryRisk: 'Alto',
    color: '#f59e0b' // amber dark
  }
];

export default function MuscleGroup3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(MUSCLE_GROUPS.find(m => m.id === 'quadriceps') || MUSCLE_GROUPS[0]);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'superiores' | 'tronco' | 'inferiores'>('todos');
  const [renderMode, setRenderMode] = useState<'anatomic' | 'xray' | 'regional'>('anatomic');
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeSideView, setActiveSideView] = useState<'anterior' | 'posterior' | 'reset'>('anterior');
  
  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const muscleMeshesRef = useRef<{ [key: string]: THREE.Mesh[] }>({});
  const animationFrameIdRef = useRef<number | null>(null);

  // Filtered muscles
  const filteredMuscles = useMemo(() => {
    return MUSCLE_GROUPS.filter(m => {
      const matchesCategory = selectedCategory === 'todos' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        m.name.toLowerCase().includes(q) || 
        m.latinName.toLowerCase().includes(q) || 
        m.footballFunction.toLowerCase().includes(q) ||
        m.exercises.some(e => e.name.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.9, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 10.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go way below ground
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    mainLight.position.set(3, 5, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 2.0); // cyan rim
    backLight.position.set(-3, 4, -4);
    scene.add(backLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 1.2); // warm gold fill
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(12, 24, 0xfbbf24, 0x27272a);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // Podium Base
    const podiumGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.2, 32);
    const podiumMat = new THREE.MeshStandardMaterial({ 
      color: 0x18181b, 
      roughness: 0.4, 
      metalness: 0.8 
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -1.1;
    podium.receiveShadow = true;
    scene.add(podium);

    // 6. Build 3D Mannequin with Anatomical Muscle Groups
    const mannequinGroup = new THREE.Group();
    mannequinGroup.name = "human_mannequin";
    scene.add(mannequinGroup);

    const meshesMap: { [key: string]: THREE.Mesh[] } = {};

    // Helper material generator
    const getMuscleMaterial = (muscleId: string) => {
      const muscle = MUSCLE_GROUPS.find(m => m.id === muscleId);
      const isSelected = selectedMuscle?.id === muscleId;
      const baseHex = muscle ? parseInt(muscle.color.replace('#', '0x')) : 0xdc2626;

      if (renderMode === 'xray') {
        return new THREE.MeshStandardMaterial({
          color: isSelected ? 0xfbbf24 : baseHex,
          wireframe: false,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.65,
          emissive: isSelected ? 0xfbbf24 : baseHex,
          emissiveIntensity: isSelected ? 0.8 : 0.2,
          roughness: 0.2,
          metalness: 0.5
        });
      }

      if (renderMode === 'regional') {
        let catColor = 0x3b82f6; // superiores
        if (muscle?.category === 'tronco') catColor = 0xf59e0b;
        if (muscle?.category === 'inferiores') catColor = 0x10b981;

        return new THREE.MeshStandardMaterial({
          color: isSelected ? 0xffffff : catColor,
          roughness: 0.3,
          metalness: 0.2,
          emissive: isSelected ? 0xfbbf24 : 0x000000,
          emissiveIntensity: isSelected ? 0.6 : 0
        });
      }

      // Default Anatomic
      return new THREE.MeshStandardMaterial({
        color: isSelected ? 0xfbbf24 : baseHex,
        roughness: 0.4,
        metalness: 0.1,
        emissive: isSelected ? 0xf59e0b : 0x330000,
        emissiveIntensity: isSelected ? 0.6 : 0.1
      });
    };

    const addMuscleMesh = (id: string, geometry: THREE.BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => {
      const mat = getMuscleMaterial(id);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { muscleId: id };

      mannequinGroup.add(mesh);

      if (!meshesMap[id]) meshesMap[id] = [];
      meshesMap[id].push(mesh);
    };

    // --- SKELETON / NEUTRAL CORE BODY STRUCTURE (Gray translucent background) ---
    const boneMat = new THREE.MeshStandardMaterial({ 
      color: 0x3f3f46, 
      roughness: 0.8, 
      metalness: 0.2,
      transparent: true,
      opacity: 0.4
    });

    // Head
    const headGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const headMesh = new THREE.Mesh(headGeo, boneMat);
    headMesh.position.set(0, 2.05, 0);
    headMesh.scale.set(1, 1.25, 1);
    mannequinGroup.add(headMesh);

    // Spine / Torso core
    const spineGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.1, 16);
    const spineMesh = new THREE.Mesh(spineGeo, boneMat);
    spineMesh.position.set(0, 1.2, -0.05);
    mannequinGroup.add(spineMesh);

    // Pelvis bone
    const pelvisGeo = new THREE.ConeGeometry(0.3, 0.25, 16);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, boneMat);
    pelvisMesh.position.set(0, 0.55, 0);
    pelvisMesh.rotation.x = Math.PI;
    mannequinGroup.add(pelvisMesh);


    // --- ANATOMICAL MUSCLE GROUPS BUILD ---

    // 1. Pescoço / Cervical
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.22, 16);
    addMuscleMesh('trapezio', neckGeo, [0, 1.78, 0]);

    // 2. Trapézio (Costas Superior)
    const trapGeo = new THREE.ConeGeometry(0.38, 0.45, 4);
    addMuscleMesh('trapezio', trapGeo, [0, 1.62, -0.08], [0, 0, 0], [1.1, 1, 0.6]);

    // 3. Deltoides (Ombros)
    const deltGeo = new THREE.SphereGeometry(0.16, 16, 16);
    deltGeo.scale(1, 1.2, 0.9);
    addMuscleMesh('deltoides', deltGeo, [0.42, 1.56, 0], [0, 0, -0.2]);
    addMuscleMesh('deltoides', deltGeo, [-0.42, 1.56, 0], [0, 0, 0.2]);

    // 4. Peitoral Maior
    const chestGeo = new THREE.BoxGeometry(0.26, 0.26, 0.12);
    chestGeo.scale(1, 0.8, 1);
    addMuscleMesh('peitoral', chestGeo, [0.14, 1.46, 0.12], [0, 0.1, -0.05]);
    addMuscleMesh('peitoral', chestGeo, [-0.14, 1.46, 0.12], [0, -0.1, 0.05]);

    // 5. Dorsal (Latíssimo do Dorso)
    const latGeo = new THREE.BoxGeometry(0.24, 0.42, 0.14);
    addMuscleMesh('dorsal', latGeo, [0.24, 1.34, -0.1], [0, -0.2, -0.1]);
    addMuscleMesh('dorsal', latGeo, [-0.24, 1.34, -0.1], [0, 0.2, 0.1]);

    // 6. Abdômen (Reto Abdominal)
    const absGeo = new THREE.BoxGeometry(0.24, 0.38, 0.1);
    addMuscleMesh('abdomen', absGeo, [0, 1.15, 0.12]);

    // Oblíquo Lateral
    const obliGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.36, 16);
    addMuscleMesh('abdomen', obliGeo, [0.22, 1.15, 0.05], [0, 0, -0.15]);
    addMuscleMesh('abdomen', obliGeo, [-0.22, 1.15, 0.05], [0, 0, 0.15]);

    // 7. Lombar
    const lombGeo = new THREE.BoxGeometry(0.22, 0.3, 0.12);
    addMuscleMesh('lombar', lombGeo, [0, 0.92, -0.1]);

    // 8. Bíceps Braquial
    const bicepsGeo = new THREE.CapsuleGeometry(0.08, 0.22, 8, 16);
    addMuscleMesh('biceps', bicepsGeo, [0.46, 1.28, 0.05], [0, 0, -0.1]);
    addMuscleMesh('biceps', bicepsGeo, [-0.46, 1.28, 0.05], [0, 0, 0.1]);

    // 9. Tríceps Braquial
    const tricepsGeo = new THREE.CapsuleGeometry(0.08, 0.24, 8, 16);
    addMuscleMesh('triceps', tricepsGeo, [0.46, 1.28, -0.06], [0, 0, -0.1]);
    addMuscleMesh('triceps', tricepsGeo, [-0.46, 1.28, -0.06], [0, 0, 0.1]);

    // 10. Antebraços
    const forearmGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.38, 16);
    addMuscleMesh('antebravos', forearmGeo, [0.52, 0.92, 0], [0, 0, -0.12]);
    addMuscleMesh('antebravos', forearmGeo, [-0.52, 0.92, 0], [0, 0, 0.12]);

    // 11. Glúteos
    const gluteGeo = new THREE.SphereGeometry(0.22, 16, 16);
    gluteGeo.scale(1, 0.9, 1.1);
    addMuscleMesh('gluteos', gluteGeo, [0.16, 0.52, -0.14]);
    addMuscleMesh('gluteos', gluteGeo, [-0.16, 0.52, -0.14]);

    // 12. Adutores (Parte Interna da Coxa)
    const adducGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.45, 16);
    addMuscleMesh('adutores', adducGeo, [0.08, 0.22, 0.02], [0, 0, -0.06]);
    addMuscleMesh('adutores', adducGeo, [-0.08, 0.22, 0.02], [0, 0, 0.06]);

    // 13. Quadríceps (Coxa Anterior)
    const quadGeo = new THREE.CapsuleGeometry(0.13, 0.42, 8, 16);
    addMuscleMesh('quadriceps', quadGeo, [0.22, 0.2, 0.08], [0.1, 0, -0.08]);
    addMuscleMesh('quadriceps', quadGeo, [-0.22, 0.2, 0.08], [0.1, 0, 0.08]);

    // 14. Isquiotibiais / Posteriores de Coxa
    const hamstGeo = new THREE.CapsuleGeometry(0.12, 0.42, 8, 16);
    addMuscleMesh('isquiotibiais', hamstGeo, [0.22, 0.2, -0.08], [-0.1, 0, -0.08]);
    addMuscleMesh('isquiotibiais', hamstGeo, [-0.22, 0.2, -0.08], [-0.1, 0, 0.08]);

    // 15. Panturrilhas (Gastrocnêmio)
    const calfGeo = new THREE.CapsuleGeometry(0.09, 0.32, 8, 16);
    addMuscleMesh('panturrilhas', calfGeo, [0.2, -0.38, -0.06], [0, 0, -0.04]);
    addMuscleMesh('panturrilhas', calfGeo, [-0.2, -0.38, -0.06], [0, 0, 0.04]);

    // Tibial Anterior
    const tibGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.34, 16);
    addMuscleMesh('panturrilhas', tibGeo, [0.2, -0.38, 0.06], [0, 0, -0.04]);
    addMuscleMesh('panturrilhas', tibGeo, [-0.2, -0.38, 0.06], [0, 0, 0.04]);

    muscleMeshesRef.current = meshesMap;

    // 7. Raycasting for Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(mannequinGroup.children, true);

      if (intersects.length > 0) {
        const hit = intersects.find(i => i.object.userData && i.object.userData.muscleId);
        if (hit && hit.object.userData.muscleId) {
          const muscleId = hit.object.userData.muscleId;
          const found = MUSCLE_GROUPS.find(m => m.id === muscleId);
          if (found) {
            setHoveredMuscle(found);
            renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
      }
      setHoveredMuscle(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handlePointerClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(mannequinGroup.children, true);

      if (intersects.length > 0) {
        const hit = intersects.find(i => i.object.userData && i.object.userData.muscleId);
        if (hit && hit.object.userData.muscleId) {
          const muscleId = hit.object.userData.muscleId;
          const found = MUSCLE_GROUPS.find(m => m.id === muscleId);
          if (found) {
            setSelectedMuscle(found);
            toast.info(`Selecionado: ${found.name}`);
          }
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousemove', handlePointerMove);
    domElement.addEventListener('click', handlePointerClick);

    // 8. Animation Loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
        if (autoRotate) {
          mannequinGroup.rotation.y += 0.008;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousemove', handlePointerMove);
      domElement.removeEventListener('click', handlePointerClick);

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }

      // Dispose geometries & materials
      scene.clear();
    };
  }, [renderMode, autoRotate]);

  // Update Materials when selectedMuscle changes
  useEffect(() => {
    if (!muscleMeshesRef.current) return;

    Object.keys(muscleMeshesRef.current).forEach(muscleId => {
      const meshes = muscleMeshesRef.current[muscleId];
      const isSelected = selectedMuscle?.id === muscleId;
      const isHovered = hoveredMuscle?.id === muscleId;
      const muscle = MUSCLE_GROUPS.find(m => m.id === muscleId);
      const baseHex = muscle ? parseInt(muscle.color.replace('#', '0x')) : 0xdc2626;

      meshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat) return;

        if (isSelected) {
          mat.color.setHex(0xfbbf24); // Amber gold
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 0.8;
          mesh.scale.set(1.08, 1.08, 1.08);
        } else if (isHovered) {
          mat.color.setHex(0x38bdf8); // Sky blue glow on hover
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.6;
          mesh.scale.set(1.04, 1.04, 1.04);
        } else {
          mat.color.setHex(baseHex);
          mat.emissive.setHex(0x220000);
          mat.emissiveIntensity = 0.1;
          mesh.scale.set(1, 1, 1);
        }
      });
    });
  }, [selectedMuscle, hoveredMuscle]);

  // View Preset Animations
  const setCameraPreset = (view: 'anterior' | 'posterior' | 'superiores' | 'core' | 'inferiores' | 'reset') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setActiveSideView(view === 'anterior' || view === 'posterior' ? view : 'reset');

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (view) {
      case 'anterior':
        camera.position.set(0, 1.1, 5.2);
        controls.target.set(0, 0.9, 0);
        break;
      case 'posterior':
        camera.position.set(0, 1.1, -5.2);
        controls.target.set(0, 0.9, 0);
        break;
      case 'superiores':
        camera.position.set(0, 1.6, 2.8);
        controls.target.set(0, 1.5, 0);
        break;
      case 'core':
        camera.position.set(0, 1.15, 2.5);
        controls.target.set(0, 1.1, 0);
        break;
      case 'inferiores':
        camera.position.set(0, 0.1, 3.2);
        controls.target.set(0, 0.1, 0);
        break;
      case 'reset':
      default:
        camera.position.set(0, 1.2, 5.5);
        controls.target.set(0, 0.9, 0);
        break;
    }
  };

  const handlePrintSpecSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/30 border border-theme-primary/20 p-6 md:p-8 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-theme-primary/10 border border-theme-primary/30 rounded-xl text-theme-primary font-black text-xs uppercase tracking-widest">
              <Zap size={14} className="animate-pulse" />
              <span>Anatomia & Fisiologia 3D • Piruá EC</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              Grupos Musculares <span className="text-theme-primary">Interativos 3D</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Explore o modelo anatômico tridimensional do atleta. Clique em qualquer grupo muscular para analisar a sua função biomecânica no futebol, exercícios recomendados e métodos de prevenção de lesões.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handlePrintSpecSheet}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md no-print"
            >
              <Printer size={16} className="text-theme-primary" />
              <span>Imprimir Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Canvas + Side Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: 3D Viewer & Controls (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl group min-h-[520px] md:min-h-[620px] flex flex-col">
            
            {/* Top Toolbar overlay over 3D canvas */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto no-print">
              
              {/* Category / Filter Pills */}
              <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl">
                {(['todos', 'superiores', 'tronco', 'inferiores'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      selectedCategory === cat 
                        ? "bg-theme-primary text-black shadow-md" 
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    )}
                  >
                    {cat === 'todos' ? 'Todos' : cat}
                  </button>
                ))}
              </div>

              {/* Render Style Mode */}
              <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl">
                <button
                  onClick={() => setRenderMode('anatomic')}
                  title="Anatômico Natural"
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer",
                    renderMode === 'anatomic' ? "bg-red-500 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <HeartPulse size={12} />
                  <span className="hidden sm:inline">Anatômico</span>
                </button>
                <button
                  onClick={() => setRenderMode('xray')}
                  title="Modo Raio-X / Cyber"
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer",
                    renderMode === 'xray' ? "bg-amber-500 text-black font-black" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Zap size={12} />
                  <span className="hidden sm:inline">Cyber</span>
                </button>
                <button
                  onClick={() => setRenderMode('regional')}
                  title="Didático por Região"
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer",
                    renderMode === 'regional' ? "bg-blue-500 text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Layers size={12} />
                  <span className="hidden sm:inline">Regiões</span>
                </button>
              </div>
            </div>

            {/* Hover Tooltip Overlay */}
            {hoveredMuscle && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 bg-black/90 backdrop-blur-md border border-theme-primary/50 text-white font-black text-xs uppercase rounded-2xl shadow-2xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: hoveredMuscle.color }} />
                  <span>{hoveredMuscle.name} ({hoveredMuscle.latinName})</span>
                </div>
              </div>
            )}

            {/* 3D Canvas Mount */}
            <div ref={mountRef} className="w-full flex-1 min-h-[460px] md:min-h-[560px] cursor-grab active:cursor-grabbing" />

            {/* Bottom Controls Bar */}
            <div className="p-4 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10 no-print">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mr-1">Visões:</span>
                <button
                  onClick={() => setCameraPreset('anterior')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer",
                    activeSideView === 'anterior' 
                      ? "bg-theme-primary/20 border-theme-primary text-theme-primary" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  Frente
                </button>
                <button
                  onClick={() => setCameraPreset('posterior')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer",
                    activeSideView === 'posterior' 
                      ? "bg-theme-primary/20 border-theme-primary text-theme-primary" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  Costas
                </button>
                <button
                  onClick={() => setCameraPreset('superiores')}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Braços
                </button>
                <button
                  onClick={() => setCameraPreset('core')}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Tronco
                </button>
                <button
                  onClick={() => setCameraPreset('inferiores')}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Pernas
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center gap-1.5 cursor-pointer",
                    autoRotate 
                      ? "bg-green-500/20 border-green-500 text-green-400 animate-pulse" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  <RotateCcw size={12} />
                  <span>{autoRotate ? 'Giro 360° On' : 'Girar 360°'}</span>
                </button>

                <button
                  onClick={() => setCameraPreset('reset')}
                  title="Resetar Posição da Câmera"
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Muscle Selector List */}
          <div className="bg-black border border-zinc-800 p-4 rounded-3xl space-y-3 no-print">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-theme-primary" />
                <span className="text-xs font-black text-white uppercase tracking-wider">Buscar Músculo</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">{filteredMuscles.length} grupos mapeados</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Quadríceps, Isquiotibiais, Chute, Peitoral..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-theme-primary transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredMuscles.map(m => {
                const isSelected = selectedMuscle?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMuscle(m);
                      if (m.side === 'posterior') setCameraPreset('posterior');
                      if (m.side === 'anterior') setCameraPreset('anterior');
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isSelected 
                        ? "bg-theme-primary text-black border-theme-primary font-black shadow-lg scale-105" 
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Muscle Specification Sheet (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          {selectedMuscle ? (
            <div className="bg-black border border-theme-primary/30 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Muscle Title Header */}
              <div className="space-y-3 pb-6 border-b border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-3 py-1 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary font-black text-[10px] uppercase rounded-xl tracking-wider">
                    {selectedMuscle.category.toUpperCase()} • {selectedMuscle.side.toUpperCase()}
                  </span>

                  <span className={cn(
                    "px-3 py-1 font-black text-[10px] uppercase rounded-xl border tracking-wider",
                    selectedMuscle.injuryRisk.includes('Crítico') ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse" :
                    selectedMuscle.injuryRisk === 'Alto' ? "bg-amber-500/20 border-amber-500/40 text-amber-400" :
                    "bg-green-500/20 border-green-500/40 text-green-400"
                  )}>
                    Risco: {selectedMuscle.injuryRisk}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: selectedMuscle.color }} />
                    {selectedMuscle.name}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono italic mt-0.5">
                    {selectedMuscle.latinName}
                  </p>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  {selectedMuscle.description}
                </p>
              </div>

              {/* Function in Football */}
              <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-theme-primary font-black text-xs uppercase tracking-wider">
                  <Activity size={16} />
                  <span>Função Biomecânica no Futebol</span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                  {selectedMuscle.footballFunction}
                </p>
              </div>

              {/* Top Exercises for Athletes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider">
                    <Dumbbell size={16} className="text-amber-400" />
                    <span>Exercícios Recomendados (Piruá EC)</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {selectedMuscle.exercises.map((ex, idx) => (
                    <div key={idx} className="bg-zinc-900/90 border border-zinc-850 hover:border-zinc-700 p-3.5 rounded-2xl transition-all space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs">{ex.name}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase rounded-lg">
                          {ex.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal">
                        {ex.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Injury Prevention & Stretches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-red-400 font-black text-xs uppercase tracking-wider">
                    <ShieldAlert size={14} />
                    <span>Prevenção de Lesões</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {selectedMuscle.prevention}
                  </p>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>Alongamento & MFX</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {selectedMuscle.stretches}
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-black border border-zinc-800 p-12 rounded-3xl text-center space-y-4">
              <Info size={40} className="text-zinc-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white uppercase">Selecione um Músculo</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Clique diretamente no modelo 3D ao lado ou selecione um grupo muscular na lista abaixo para visualizar a ficha biomecânica completa.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
