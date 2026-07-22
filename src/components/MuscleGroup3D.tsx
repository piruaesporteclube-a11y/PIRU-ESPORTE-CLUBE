import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Dumbbell, 
  RotateCcw, 
  Search, 
  Activity, 
  ShieldAlert, 
  Printer, 
  Maximize2, 
  CheckCircle2, 
  Zap, 
  HeartPulse, 
  X,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Flame,
  Target
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
    name: 'Peitoral Maior & Menor',
    latinName: 'Pectoralis Major',
    category: 'tronco',
    side: 'anterior',
    footballFunction: 'Proteção corporal no ombro a ombro, tração nos arremessos de lateral longos e equilíbrio postural nos sprints.',
    description: 'Composto pelo Peitoral Maior e Menor. Forma a cobertura muscular frontal do tórax superior.',
    exercises: [
      { name: 'Supino Reto / Inclinado', description: 'Empurrão com barra ou halteres para força máxima de tronco.', type: 'Força' },
      { name: 'Flexão de Braço (Push-up)', description: 'Estabilização de core e cintura escapular.', type: 'Estabilidade' },
      { name: 'Arremesso Medicinal Ball', description: 'Explosão para arremessos de lateral.', type: 'Explosão' }
    ],
    prevention: 'Manter equilíbrio com os músculos das costas (romboides e trapézio) para evitar a rotação interna dos ombros.',
    stretches: 'Alongamento em quina de parede com cotovelos a 90° e peito aberto.',
    injuryRisk: 'Médio',
    color: '#ef4444' // red
  },
  {
    id: 'deltoides',
    name: 'Ombros (Deltoides)',
    latinName: 'Deltoideus',
    category: 'superiores',
    side: 'ambos',
    footballFunction: 'Absorção de impactos em quedas no gramado, proteção articular e estabilização de braço no salto e corrida.',
    description: 'Envolve a articulação do ombro em três porções distintas: anterior, lateral e posterior.',
    exercises: [
      { name: 'Desenvolvimento com Halteres', description: 'Fortalecimento geral da articulação glenoumeral.', type: 'Força' },
      { name: 'Elevação Lateral', description: 'Foco na porção média para estabilidade nos contatos.', type: 'Hipertrofia' },
      { name: 'Crucifixo Inverso', description: 'Ajuste postural da porção posterior do ombro.', type: 'Estabilidade' }
    ],
    prevention: 'Fortalecer os pequenos músculos do manguito rotador (supraespinhal, infraespinhal e redondo menor).',
    stretches: 'Puxada do braço estendido sobre o peito com leve tração do cotovelo.',
    injuryRisk: 'Médio',
    color: '#f97316' // orange
  },
  {
    id: 'biceps',
    name: 'Bíceps Braquial',
    latinName: 'Biceps Brachii',
    category: 'superiores',
    side: 'anterior',
    footballFunction: 'Manutenção dos cotovelos fletidos na mecânica de corrida e sustentação de carga nas disputas de espaço.',
    description: 'Músculo de duas cabeças localizado na parte anterior do braço, atuando na flexão do cotovelo.',
    exercises: [
      { name: 'Rosca Direta', description: 'Construção de força flexora de cotovelo.', type: 'Hipertrofia' },
      { name: 'Rosca Martelo', description: 'Aumenta a força da pegada e braquiorradial.', type: 'Força' },
      { name: 'Barra Fixa Supinada', description: 'Exercício composto funcional para braços e costas.', type: 'Força' }
    ],
    prevention: 'Evitar cargas excessivas em extensão completa brusca sem prévio aquecimento.',
    stretches: 'Extensão de braço com palma da mão voltada para baixo e dedos puxados para trás.',
    injuryRisk: 'Baixo',
    color: '#eab308' // yellow
  },
  {
    id: 'triceps',
    name: 'Tríceps Braquial',
    latinName: 'Triceps Brachii',
    category: 'superiores',
    side: 'posterior',
    footballFunction: 'Impulsão para levantar-se do chão em velocidade, proteção em quedas e arremessos fortes.',
    description: 'Representa aproximadamente 60% da massa muscular do braço, composto por três cabeças.',
    exercises: [
      { name: 'Tríceps Testa na Barra W', description: 'Isolamento de força na extensão do cotovelo.', type: 'Hipertrofia' },
      { name: 'Flexão Fechada (Diamante)', description: 'Explosão muscular com o peso do próprio corpo.', type: 'Explosão' },
      { name: 'Tríceps Pulley', description: 'Trabalho contínuo de resistência e hipertrofia.', type: 'Hipertrofia' }
    ],
    prevention: 'Aquecer adequadamente os cotovelos e evitar bloqueios articulares bruscos com alta carga.',
    stretches: 'Elevação do braço acima da cabeça, dobrando o cotovelo atrás da nuca.',
    injuryRisk: 'Baixo',
    color: '#3b82f6' // blue
  },
  {
    id: 'antebravos',
    name: 'Antebraços',
    latinName: 'Flexores & Extensores Digitais',
    category: 'superiores',
    side: 'ambos',
    footballFunction: 'Crucial para goleiros na firmeza de encaixe de bola e jogadores de linha na firmeza das disputas.',
    description: 'Conjunto de flexores e extensores do punho e dedos na porção distal do membro superior.',
    exercises: [
      { name: 'Rosca Punho Direta e Inversa', description: 'Aumenta a resistência e estabilidade articular do punho.', type: 'Estabilidade' },
      { name: 'Farmer Walk (Caminhada do Fazendeiro)', description: 'Fortalecimento severo da pegada isométrica.', type: 'Força' }
    ],
    prevention: 'Realizar mobilidade de punho periodicamente para evitar tendinites.',
    stretches: 'Flexão e extensão passiva dos punhos com os dedos estendidos.',
    injuryRisk: 'Baixo',
    color: '#06b6d4' // cyan
  },
  {
    id: 'abdomen',
    name: 'Abdômen & Core',
    latinName: 'Rectus Abdominis & Obliques',
    category: 'tronco',
    side: 'anterior',
    footballFunction: 'Centro de gravidade e transferência de energia cinética das pernas para o chute, giros e cabeceios.',
    description: 'Compreende o Reto Abdominal, Oblíquo Interno/Externo e o Transverso do Abdômen.',
    exercises: [
      { name: 'Prancha Frontal e Lateral', description: 'Isometria para estabilização da coluna vertebral.', type: 'Estabilidade' },
      { name: 'Pallof Press com Elástico', description: 'Anti-rotação indispensável para atletas de campo.', type: 'Estabilidade' },
      { name: 'Abdominal Infra Suspenso', description: 'Força na porção inferior e flexores do quadril.', type: 'Força' }
    ],
    prevention: 'A estabilização do core é a primeira linha de defesa contra a pubalgia e dores lombares.',
    stretches: 'Postura da Cobra (extensão suave do tronco no chão) e rotações de quadril.',
    injuryRisk: 'Alto',
    color: '#10b981' // emerald
  },
  {
    id: 'trapezio',
    name: 'Trapézio & Pescoço',
    latinName: 'Trapezius',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Absorção de impactos no cabeceio, prevenção de concussão e proteção cervical.',
    description: 'Músculo triangular largo que se estende da base do crânio até o meio das costas.',
    exercises: [
      { name: 'Encolhimento com Halteres', description: 'Fortalecimento da porção superior do trapézio.', type: 'Força' },
      { name: 'Isometria Cervical Guiada', description: 'Reduz comprovadamente a aceleração da cabeça em impactos.', type: 'Estabilidade' },
      { name: 'Face Pull na Polia', description: 'Trabalho de postura escapular e porção média/inferior.', type: 'Estabilidade' }
    ],
    prevention: 'Treinar fortalecimento de pescoço diminui o risco de traumas e chicoteamento cervical.',
    stretches: 'Inclinação lateral suave do pescoço mantendo o ombro oposto abaixado.',
    injuryRisk: 'Médio',
    color: '#a855f7' // purple
  },
  {
    id: 'dorsal',
    name: 'Dorsal / Costas',
    latinName: 'Latissimus Dorsi',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Manutenção da postura atlética na corrida, tração de braço nos sprints e estabilidade de tronco.',
    description: 'Maior músculo da parte superior do corpo, cobrindo as laterais das costas.',
    exercises: [
      { name: 'Puxada Frontal / Barra Fixa', description: 'Construção de largura e força de tração vertical.', type: 'Força' },
      { name: 'Remada Curvada com Barra', description: 'Densidade muscular e postura escapular.', type: 'Força' },
      { name: 'Remada Unilateral com Halter', description: 'Equilíbrio e simetria lateral das costas.', type: 'Hipertrofia' }
    ],
    prevention: 'Fortalecer a cadeia posterior para evitar hiperlordose e compensações posturais.',
    stretches: 'Pendurar-se na barra fixa ou alongamento da dorsal segurando em um suporte vertical.',
    injuryRisk: 'Baixo',
    color: '#8b5cf6' // violet
  },
  {
    id: 'lombar',
    name: 'Lombar (Erretores da Espinha)',
    latinName: 'Erector Spinae',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Sustentação nos saltos para cabecear, aterrissagens, mudanças bruscas de direção e chutes.',
    description: 'Grupo de músculos profundos ao longo do canal vertebral inferior.',
    exercises: [
      { name: 'Extensão Lombar no Banco 45°', description: 'Fortalecimento direto da lombar baixa.', type: 'Estabilidade' },
      { name: 'Levantamento Terra (Deadlift)', description: 'Força máxima da cadeia posterior integrada.', type: 'Força' },
      { name: 'Prancha Super-Homem', description: 'Ativação postural para saúde da coluna.', type: 'Estabilidade' }
    ],
    prevention: 'Evitar cargas exageradas sem a curvatura fisiológica preservada. Fortalecer o abdômen simultaneamente.',
    stretches: 'Postura da Criança (trazer o quadril em direção aos calcanhares no solo).',
    injuryRisk: 'Alto',
    color: '#ec4899' // pink
  },
  {
    id: 'gluteos',
    name: 'Glúteos (Máximo, Médio & Mínimo)',
    latinName: 'Gluteus Maximus & Medius',
    category: 'inferiores',
    side: 'posterior',
    footballFunction: 'Principal gerador de potência esportiva: aceleração do sprint, salto vertical, frenagem e estabilidade do joelho.',
    description: 'O maior e mais potente grupo muscular do corpo humano, essencial para atletas de alto rendimento.',
    exercises: [
      { name: 'Elevação Pélvica (Hip Thrust)', description: 'Exercício número 1 para pico de potência de glúteo em velocidade.', type: 'Explosão' },
      { name: 'Agachamento Profundo', description: 'Força máxima e amplitude de quadril.', type: 'Força' },
      { name: 'Abdução de Quadril com Elástico', description: 'Ativa o Glúteo Médio, prevenindo o valgo dinâmico no joelho.', type: 'Estabilidade' }
    ],
    prevention: 'Ativação prévia ao treino (evitar amnésia glútea) previne lesões no LCA e sobrecarga na lombar.',
    stretches: 'Cruzar a perna sobre o joelho oposto e puxar a coxa em direção ao peito.',
    injuryRisk: 'Médio',
    color: '#f43f5e' // rose
  },
  {
    id: 'quadriceps',
    name: 'Quadríceps Femoris',
    latinName: 'Quadriceps Femoris',
    category: 'inferiores',
    side: 'anterior',
    footballFunction: 'Potência de chute de grande distância, extensão do joelho, frenagem abrupta e desacelerações.',
    description: 'Formado por quatro cabeças: Reto Femoral, Vasto Lateral, Vasto Medial e Vasto Intermédio.',
    exercises: [
      { name: 'Agachamento Livre com Barra', description: 'O clássico para força funcional de pernas.', type: 'Força' },
      { name: 'Leg Press 45°', description: 'Carga pesada controlada para ganho de massa.', type: 'Hipertrofia' },
      { name: 'Passada Dinâmica (Lunge)', description: 'Desenvolve estabilidade unilateral e força de corrida.', type: 'Explosão' },
      { name: 'Cadeira Extensora', description: 'Isolamento da extensão de joelho e vasto medial.', type: 'Hipertrofia' }
    ],
    prevention: 'Manter a razão de força proporcional com os isquiotibiais (razão I/Q) para evitar rupturas do LCA.',
    stretches: 'Puxada do calcanhar em direção ao glúteo em pé, mantendo a postura ereta.',
    injuryRisk: 'Alto',
    color: '#e11d48' // red dark
  },
  {
    id: 'isquiotibiais',
    name: 'Posteriores de Coxa (Isquiotibiais)',
    latinName: 'Biceps Femoris & Semitendinosus',
    category: 'inferiores',
    side: 'posterior',
    footballFunction: 'Frenagem no sprint em velocidade máxima, flexão de joelho e proteção do Ligamento Cruzado Anterior (LCA).',
    description: 'Grupo posterior da coxa. É o MÚSCULO COM MAIOR ÍNDICE DE ESTIRAMENTOS NO FUTEBOL PROFISSIONAL.',
    exercises: [
      { name: 'Exercício Nórdico (Nordic Hamstring)', description: 'INVOLUNTÁRIO NO FUTEBOL! O melhor preventivo de lesão excêntrica.', type: 'Explosão' },
      { name: 'Mesa Flexora / Cadeira Flexora', description: 'Isolamento para força e volume muscular.', type: 'Hipertrofia' },
      { name: 'Stiff Unilateral (RDL)', description: 'Força em cadeia posterior com extensão de quadril.', type: 'Força' }
    ],
    prevention: 'Inclusão semanal obrigatória de treino excêntrico (Nórdico) reduz em até 70% as lesões musculares!',
    stretches: 'Elevação da perna estendida ou inclinação à frente em direção aos pés com joelhos estendidos.',
    injuryRisk: 'Crítico no Futebol',
    color: '#dc2626' // red high
  },
  {
    id: 'adutores',
    name: 'Adutores do Quadril',
    latinName: 'Adductor Longus & Magnus',
    category: 'inferiores',
    side: 'anterior',
    footballFunction: 'Passe de chapa, chute colocado, mudança rápida de direção e controle de bola interno.',
    description: 'Localizados na face interna da coxa, estabilizam o quadril e a sínfise púbica.',
    exercises: [
      { name: 'Prancha de Copenhagen', description: 'O EXERCÍCIO OURO para prevenir pubalgia e dor inguinofemoral no futebol.', type: 'Estabilidade' },
      { name: 'Agachamento Sumô', description: 'Fortalecimento sob carga na posição aberta.', type: 'Força' },
      { name: 'Cadeira Adutora', description: 'Isolamento muscular dos adutores.', type: 'Hipertrofia' }
    ],
    prevention: 'Prancha de Copenhagen realizada 2 vezes por semana elimina o risco clássico de pubalgia no futebol.',
    stretches: 'Posição da borboleta sentado ou afundo lateral estendido.',
    injuryRisk: 'Crítico no Futebol',
    color: '#fbbf24' // amber
  },
  {
    id: 'panturrilhas',
    name: 'Panturrilhas & Tíbia',
    latinName: 'Gastrocnemius, Soleus & Tibialis',
    category: 'inferiores',
    side: 'ambos',
    footballFunction: 'Propulsão do salto, reação rápida no drible, amortecimento de piso e prevenção de canelite.',
    description: 'Compreende os Gastrocnêmios (cabeça medial/lateral), o Sóleo profundo e o Tibial Anterior.',
    exercises: [
      { name: 'Elevação de Calcanhares em Pé', description: 'Trabalho de potência do gastrocnêmio com joelho estendido.', type: 'Força' },
      { name: 'Elevação de Calcanhares Sentado', description: 'Atinge diretamente o músculo sóleo.', type: 'Hipertrofia' },
      { name: 'Caminhada de Calcanhar', description: 'Fortalecimento do tibial anterior para prevenir canelite.', type: 'Estabilidade' }
    ],
    prevention: 'Manter flexibilidade do tendão de Aquiles e boa hidratação/eletrólitos para evitar cãibras.',
    stretches: 'Pressionar as mãos na parede e empurrar o calcanhar traseiro contra o solo.',
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
  const [activeTab, setActiveTab] = useState<'anatomico' | '3d'>('anatomico');
  const [activeSide, setActiveSide] = useState<'anterior' | 'posterior'>('anterior');
  const [autoRotate, setAutoRotate] = useState(false);

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

  // Setup Three.js Scene for 3D View Mode
  useEffect(() => {
    if (activeTab !== '3d' || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.04);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.9, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 8.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controlsRef.current = controls;

    // 5. Lighting (Studio Lighting for Athletes)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2); // Cyan rim light for muscular contours
    rimLight.position.set(-3, 4, -4);
    scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight(0xf59e0b, 1.2); // Warm gold fill
    warmFill.position.set(0, -2, 3);
    scene.add(warmFill);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 20, 0xfbbf24, 0x27272a);
    gridHelper.position.y = -1.1;
    scene.add(gridHelper);

    // Studio Base Podium
    const podiumGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.18, 32);
    const podiumMat = new THREE.MeshStandardMaterial({ 
      color: 0x18181b, 
      roughness: 0.3, 
      metalness: 0.8 
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -1.02;
    podium.receiveShadow = true;
    scene.add(podium);

    // 6. Build High-Quality Anatomical Athletic Body
    const bodyGroup = new THREE.Group();
    bodyGroup.name = "athletic_body";
    scene.add(bodyGroup);

    const meshesMap: { [key: string]: THREE.Mesh[] } = {};

    const createMuscleMaterial = (id: string) => {
      const muscle = MUSCLE_GROUPS.find(m => m.id === id);
      const isSelected = selectedMuscle?.id === id;
      const baseHex = muscle ? parseInt(muscle.color.replace('#', '0x')) : 0xdc2626;

      return new THREE.MeshStandardMaterial({
        color: isSelected ? 0xfbbf24 : baseHex,
        roughness: 0.35,
        metalness: 0.15,
        emissive: isSelected ? 0xf59e0b : 0x220000,
        emissiveIntensity: isSelected ? 0.7 : 0.1
      });
    };

    const addMuscleMesh = (id: string, geometry: THREE.BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => {
      const mat = createMuscleMaterial(id);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { muscleId: id };

      bodyGroup.add(mesh);

      if (!meshesMap[id]) meshesMap[id] = [];
      meshesMap[id].push(mesh);
    };

    // --- SKELETON / JOINTS BASE (Dark translucent metallic bone structure) ---
    const boneMat = new THREE.MeshStandardMaterial({ 
      color: 0x27272a, 
      roughness: 0.7, 
      metalness: 0.4,
      transparent: true,
      opacity: 0.5
    });

    // Head
    const headGeo = new THREE.SphereGeometry(0.23, 24, 24);
    headGeo.scale(1, 1.22, 1);
    const head = new THREE.Mesh(headGeo, boneMat);
    head.position.set(0, 2.05, 0);
    bodyGroup.add(head);

    // Neck base
    const neckBaseGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 16);
    const neckBase = new THREE.Mesh(neckBaseGeo, boneMat);
    neckBase.position.set(0, 1.8, 0);
    bodyGroup.add(neckBase);

    // Spine
    const spineGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.1, 16);
    const spine = new THREE.Mesh(spineGeo, boneMat);
    spine.position.set(0, 1.2, -0.04);
    bodyGroup.add(spine);

    // Pelvis
    const pelvisGeo = new THREE.ConeGeometry(0.28, 0.22, 16);
    const pelvis = new THREE.Mesh(pelvisGeo, boneMat);
    pelvis.position.set(0, 0.55, 0);
    pelvis.rotation.x = Math.PI;
    bodyGroup.add(pelvis);

    // --- ANATOMICAL MUSCLE GROUPS BUILD ---

    // 1. Trapézio & Pescoço
    const trapGeo = new THREE.ConeGeometry(0.36, 0.42, 4);
    addMuscleMesh('trapezio', trapGeo, [0, 1.64, -0.06], [0, 0, 0], [1.1, 1, 0.6]);

    // 2. Deltoides (Ombros)
    const deltGeo = new THREE.SphereGeometry(0.16, 16, 16);
    deltGeo.scale(1, 1.25, 0.95);
    addMuscleMesh('deltoides', deltGeo, [0.42, 1.58, 0], [0, 0, -0.22]);
    addMuscleMesh('deltoides', deltGeo, [-0.42, 1.58, 0], [0, 0, 0.22]);

    // 3. Peitoral Maior (Pectorals)
    const chestGeo = new THREE.BoxGeometry(0.26, 0.26, 0.12);
    addMuscleMesh('peitoral', chestGeo, [0.14, 1.48, 0.12], [0, 0.12, -0.05]);
    addMuscleMesh('peitoral', chestGeo, [-0.14, 1.48, 0.12], [0, -0.12, 0.05]);

    // 4. Dorsal / Costas (Latissimus)
    const latGeo = new THREE.BoxGeometry(0.24, 0.44, 0.14);
    addMuscleMesh('dorsal', latGeo, [0.24, 1.34, -0.1], [0, -0.2, -0.1]);
    addMuscleMesh('dorsal', latGeo, [-0.24, 1.34, -0.1], [0, 0.2, 0.1]);

    // 5. Abdômen (6-Pack)
    const absGeo = new THREE.BoxGeometry(0.22, 0.38, 0.09);
    addMuscleMesh('abdomen', absGeo, [0, 1.16, 0.12]);

    // Oblíquos
    const obliGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.36, 16);
    addMuscleMesh('abdomen', obliGeo, [0.22, 1.16, 0.05], [0, 0, -0.15]);
    addMuscleMesh('abdomen', obliGeo, [-0.22, 1.16, 0.05], [0, 0, 0.15]);

    // 6. Lombar
    const lombGeo = new THREE.BoxGeometry(0.22, 0.28, 0.12);
    addMuscleMesh('lombar', lombGeo, [0, 0.92, -0.1]);

    // 7. Bíceps Braquial
    const bicepsGeo = new THREE.CapsuleGeometry(0.08, 0.24, 8, 16);
    addMuscleMesh('biceps', bicepsGeo, [0.46, 1.3, 0.04], [0, 0, -0.1]);
    addMuscleMesh('biceps', bicepsGeo, [-0.46, 1.3, 0.04], [0, 0, 0.1]);

    // 8. Tríceps Braquial
    const tricepsGeo = new THREE.CapsuleGeometry(0.08, 0.25, 8, 16);
    addMuscleMesh('triceps', tricepsGeo, [0.46, 1.3, -0.06], [0, 0, -0.1]);
    addMuscleMesh('triceps', tricepsGeo, [-0.46, 1.3, -0.06], [0, 0, 0.1]);

    // 9. Antebraços
    const forearmGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.38, 16);
    addMuscleMesh('antebravos', forearmGeo, [0.52, 0.94, 0], [0, 0, -0.12]);
    addMuscleMesh('antebravos', forearmGeo, [-0.52, 0.94, 0], [0, 0, 0.12]);

    // 10. Glúteos
    const gluteGeo = new THREE.SphereGeometry(0.22, 16, 16);
    gluteGeo.scale(1, 0.92, 1.1);
    addMuscleMesh('gluteos', gluteGeo, [0.16, 0.52, -0.14]);
    addMuscleMesh('gluteos', gluteGeo, [-0.16, 0.52, -0.14]);

    // 11. Adutores
    const adducGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.44, 16);
    addMuscleMesh('adutores', adducGeo, [0.08, 0.22, 0.02], [0, 0, -0.06]);
    addMuscleMesh('adutores', adducGeo, [-0.08, 0.22, 0.02], [0, 0, 0.06]);

    // 12. Quadríceps
    const quadGeo = new THREE.CapsuleGeometry(0.13, 0.44, 8, 16);
    addMuscleMesh('quadriceps', quadGeo, [0.22, 0.2, 0.08], [0.1, 0, -0.08]);
    addMuscleMesh('quadriceps', quadGeo, [-0.22, 0.2, 0.08], [0.1, 0, 0.08]);

    // 13. Isquiotibiais / Posteriores de Coxa
    const hamstGeo = new THREE.CapsuleGeometry(0.12, 0.44, 8, 16);
    addMuscleMesh('isquiotibiais', hamstGeo, [0.22, 0.2, -0.08], [-0.1, 0, -0.08]);
    addMuscleMesh('isquiotibiais', hamstGeo, [-0.22, 0.2, -0.08], [-0.1, 0, 0.08]);

    // 14. Panturrilhas (Gastrocnêmio + Tibial)
    const calfGeo = new THREE.CapsuleGeometry(0.09, 0.32, 8, 16);
    addMuscleMesh('panturrilhas', calfGeo, [0.2, -0.38, -0.06], [0, 0, -0.04]);
    addMuscleMesh('panturrilhas', calfGeo, [-0.2, -0.38, -0.06], [0, 0, 0.04]);

    const tibGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.34, 16);
    addMuscleMesh('panturrilhas', tibGeo, [0.2, -0.38, 0.06], [0, 0, -0.04]);
    addMuscleMesh('panturrilhas', tibGeo, [-0.2, -0.38, 0.06], [0, 0, 0.04]);

    muscleMeshesRef.current = meshesMap;

    // Raycasting for 3D clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bodyGroup.children, true);

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
      const intersects = raycaster.intersectObjects(bodyGroup.children, true);

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

    // Animation Loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
        if (autoRotate) {
          bodyGroup.rotation.y += 0.008;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

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

      scene.clear();
    };
  }, [activeTab, autoRotate]);

  // Update Materials when selectedMuscle changes in 3D
  useEffect(() => {
    if (activeTab !== '3d' || !muscleMeshesRef.current) return;

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
          mat.color.setHex(0xfbbf24);
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 0.8;
          mesh.scale.set(1.08, 1.08, 1.08);
        } else if (isHovered) {
          mat.color.setHex(0x38bdf8);
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
  }, [selectedMuscle, hoveredMuscle, activeTab]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="relative bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/40 border border-theme-primary/30 p-6 md:p-8 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-theme-primary/10 border border-theme-primary/30 rounded-xl text-theme-primary font-black text-xs uppercase tracking-widest">
              <Zap size={14} className="animate-pulse" />
              <span>Anatomia Médica & Biomecânica Esportiva</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              Grupo Muscular <span className="text-theme-primary">Interativo</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Explore o modelo anatômico detalhado do futebolista. Selecione qualquer grupo muscular para analisar a função no campo, prevenções de lesões críticas (como isquiotibiais e adutores) e exercícios de alto rendimento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            {/* View Switcher: Vector Anatomical Map vs 3D Studio */}
            <div className="bg-black/80 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 flex items-center gap-1 shadow-lg">
              <button
                onClick={() => setActiveTab('anatomico')}
                className={cn(
                  "px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'anatomico' 
                    ? "bg-theme-primary text-black shadow-md scale-105" 
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <HeartPulse size={16} />
                <span>Mapa Anatômico HD</span>
              </button>
              <button
                onClick={() => setActiveTab('3d')}
                className={cn(
                  "px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === '3d' 
                    ? "bg-theme-primary text-black shadow-md scale-105" 
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Activity size={16} />
                <span>Visão 3D 360°</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Printer size={16} className="text-theme-primary" />
              <span>Imprimir Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Body View + Specification Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Body Map / 3D Viewer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Anatomical HD Vector Map View */}
          {activeTab === 'anatomico' ? (
            <div className="bg-black border border-zinc-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
              
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-850">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Visão do Atleta:</span>
                  <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex items-center gap-1">
                    <button
                      onClick={() => setActiveSide('anterior')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
                        activeSide === 'anterior' ? "bg-theme-primary text-black" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Anterior (Frente)
                    </button>
                    <button
                      onClick={() => setActiveSide('posterior')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer",
                        activeSide === 'posterior' ? "bg-theme-primary text-black" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Posterior (Costas)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(['todos', 'superiores', 'tronco', 'inferiores'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        selectedCategory === cat ? "bg-zinc-800 text-theme-primary border border-theme-primary/40" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Vector Muscle Silhouette */}
              <div className="relative min-h-[500px] md:min-h-[580px] flex items-center justify-center bg-gradient-to-b from-zinc-950/60 to-black rounded-2xl p-4 overflow-hidden border border-zinc-900">
                <div className="absolute inset-0 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                {/* SVG Muscle Diagram */}
                <svg viewBox="0 0 400 700" className="w-full max-w-sm h-auto drop-shadow-2xl z-10">
                  <defs>
                    <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Body Outline Base */}
                  <path 
                    d="M 200,45 C 220,45 230,65 230,85 C 230,105 220,115 200,115 C 180,115 170,105 170,85 C 170,65 180,45 200,45 Z" 
                    fill="#18181b" stroke="#27272a" strokeWidth="2"
                  />

                  {/* ANTERIOR VIEW (Front) */}
                  {activeSide === 'anterior' && (
                    <g className="transition-all duration-300">
                      {/* Pescoço / Trapézio Anterior */}
                      <path
                        d="M 180,115 L 220,115 L 240,135 L 160,135 Z"
                        fill={selectedMuscle?.id === 'trapezio' ? '#a855f7' : '#27272a'}
                        stroke="#3f3f46" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Deltoides Anteriores */}
                      <path
                        d="M 155,138 C 140,145 130,170 135,190 C 145,185 155,160 162,145 Z"
                        fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#dc2626'}
                        stroke="#f97316" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 245,138 C 260,145 270,170 265,190 C 255,185 245,160 238,145 Z"
                        fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#dc2626'}
                        stroke="#f97316" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Peitoral Maior */}
                      <path
                        d="M 165,142 L 235,142 C 235,180 205,190 200,190 C 195,190 165,180 165,142 Z"
                        fill={selectedMuscle?.id === 'peitoral' ? '#ef4444' : '#b91c1c'}
                        stroke="#ef4444" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Bíceps Braquial */}
                      <path
                        d="M 132,192 C 125,205 128,235 138,245 C 145,235 145,205 138,192 Z"
                        fill={selectedMuscle?.id === 'biceps' ? '#eab308' : '#ca8a04'}
                        stroke="#eab308" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 268,192 C 275,205 272,235 262,245 C 255,235 255,205 262,192 Z"
                        fill={selectedMuscle?.id === 'biceps' ? '#eab308' : '#ca8a04'}
                        stroke="#eab308" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Antebraços */}
                      <path
                        d="M 136,250 C 128,270 122,305 130,320 C 138,310 142,275 142,250 Z"
                        fill={selectedMuscle?.id === 'antebravos' ? '#06b6d4' : '#0891b2'}
                        stroke="#06b6d4" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 264,250 C 272,270 278,305 270,320 C 262,310 258,275 258,250 Z"
                        fill={selectedMuscle?.id === 'antebravos' ? '#06b6d4' : '#0891b2'}
                        stroke="#06b6d4" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Abdômen & Core */}
                      <path
                        d="M 175,195 L 225,195 L 220,290 L 180,290 Z"
                        fill={selectedMuscle?.id === 'abdomen' ? '#10b981' : '#047857'}
                        stroke="#10b981" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'abdomen')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'abdomen')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Adutores do Quadril (Parte Interna da Coxa) */}
                      <path
                        d="M 188,315 C 195,315 198,380 195,420 L 182,420 C 180,380 182,315 188,315 Z"
                        fill={selectedMuscle?.id === 'adutores' ? '#fbbf24' : '#d97706'}
                        stroke="#fbbf24" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 212,315 C 205,315 202,380 205,420 L 218,420 C 220,380 218,315 212,315 Z"
                        fill={selectedMuscle?.id === 'adutores' ? '#fbbf24' : '#d97706'}
                        stroke="#fbbf24" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Quadríceps (Coxa Frontal) */}
                      <path
                        d="M 152,310 C 170,305 180,315 180,430 C 160,430 145,390 152,310 Z"
                        fill={selectedMuscle?.id === 'quadriceps' ? '#e11d48' : '#9f1239'}
                        stroke="#e11d48" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 248,310 C 230,305 220,315 220,430 C 240,430 255,390 248,310 Z"
                        fill={selectedMuscle?.id === 'quadriceps' ? '#e11d48' : '#9f1239'}
                        stroke="#e11d48" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Panturrilhas & Tibial (Anterior) */}
                      <path
                        d="M 150,450 C 165,450 170,520 162,560 C 148,550 142,500 150,450 Z"
                        fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#b45309'}
                        stroke="#f59e0b" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 250,450 C 235,450 230,520 238,560 C 252,550 258,500 250,450 Z"
                        fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#b45309'}
                        stroke="#f59e0b" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                    </g>
                  )}

                  {/* POSTERIOR VIEW (Back) */}
                  {activeSide === 'posterior' && (
                    <g className="transition-all duration-300">
                      {/* Trapézio Posterior */}
                      <path
                        d="M 200,115 L 245,140 L 200,185 L 155,140 Z"
                        fill={selectedMuscle?.id === 'trapezio' ? '#a855f7' : '#6b21a8'}
                        stroke="#a855f7" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Deltoides Posteriores */}
                      <path
                        d="M 152,142 C 135,148 128,172 135,190 C 145,182 154,165 158,148 Z"
                        fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#c2410c'}
                        stroke="#f97316" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 248,142 C 265,148 272,172 265,190 C 255,182 246,165 242,148 Z"
                        fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#c2410c'}
                        stroke="#f97316" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Dorsal (Latíssimo) */}
                      <path
                        d="M 160,188 L 240,188 L 225,260 L 175,260 Z"
                        fill={selectedMuscle?.id === 'dorsal' ? '#8b5cf6' : '#5b21b6'}
                        stroke="#8b5cf6" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Tríceps Posterior */}
                      <path
                        d="M 132,192 C 122,208 125,238 135,248 C 142,238 142,208 138,192 Z"
                        fill={selectedMuscle?.id === 'triceps' ? '#3b82f6' : '#1d4ed8'}
                        stroke="#3b82f6" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 268,192 C 278,208 275,238 265,248 C 258,238 258,208 262,192 Z"
                        fill={selectedMuscle?.id === 'triceps' ? '#3b82f6' : '#1d4ed8'}
                        stroke="#3b82f6" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Lombar */}
                      <path
                        d="M 175,262 L 225,262 L 220,300 L 180,300 Z"
                        fill={selectedMuscle?.id === 'lombar' ? '#ec4899' : '#be185d'}
                        stroke="#ec4899" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'lombar')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'lombar')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Glúteos */}
                      <path
                        d="M 152,302 C 175,295 198,310 198,360 C 160,370 145,340 152,302 Z"
                        fill={selectedMuscle?.id === 'gluteos' ? '#f43f5e' : '#be123c'}
                        stroke="#f43f5e" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 248,302 C 225,295 202,310 202,360 C 240,370 255,340 248,302 Z"
                        fill={selectedMuscle?.id === 'gluteos' ? '#f43f5e' : '#be123c'}
                        stroke="#f43f5e" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Isquiotibiais / Posteriores de Coxa */}
                      <path
                        d="M 155,365 C 178,365 185,400 182,440 L 158,440 C 150,400 148,370 155,365 Z"
                        fill={selectedMuscle?.id === 'isquiotibiais' ? '#dc2626' : '#7f1d1d'}
                        stroke="#dc2626" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 245,365 C 222,365 215,400 218,440 L 242,440 C 250,400 252,370 245,365 Z"
                        fill={selectedMuscle?.id === 'isquiotibiais' ? '#dc2626' : '#7f1d1d'}
                        stroke="#dc2626" strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />

                      {/* Panturrilhas (Gastrocnêmio Posterior) */}
                      <path
                        d="M 152,455 C 172,455 174,510 162,560 C 148,550 142,490 152,455 Z"
                        fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#b45309'}
                        stroke="#f59e0b" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                      <path
                        d="M 248,455 C 228,455 226,510 238,560 C 252,550 258,490 248,455 Z"
                        fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#b45309'}
                        stroke="#f59e0b" strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                      />
                    </g>
                  )}
                </svg>

                {/* Floating Hover Card Indicator */}
                {hoveredMuscle && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 bg-black/90 backdrop-blur-md border border-theme-primary/60 text-white font-black text-xs uppercase rounded-2xl shadow-2xl flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: hoveredMuscle.color }} />
                      <span>{hoveredMuscle.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 3D Interactive View Mode */
            <div className="relative bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl group min-h-[500px] md:min-h-[580px] flex flex-col">
              <div ref={mountRef} className="w-full flex-1 min-h-[460px] md:min-h-[520px] cursor-grab active:cursor-grabbing" />

              <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 backdrop-blur-md flex items-center justify-between gap-3">
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-black uppercase border transition-all flex items-center gap-2 cursor-pointer",
                    autoRotate 
                      ? "bg-green-500/20 border-green-500 text-green-400 animate-pulse" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  <RotateCcw size={14} />
                  <span>{autoRotate ? 'Giro 360° Ativo' : 'Girar 360°'}</span>
                </button>

                <span className="text-[10px] text-zinc-500 font-black uppercase">Clique e arraste para rotacionar em 3D</span>
              </div>
            </div>
          )}

          {/* Quick Filter Pill List */}
          <div className="bg-black border border-zinc-800 p-4 rounded-3xl space-y-3 no-print">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-theme-primary" />
                <span className="text-xs font-black text-white uppercase tracking-wider">Mapeamento Muscular</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">{filteredMuscles.length} grupos mapeados</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por grupo muscular, exercício ou função no futebol..."
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
                      if (m.side === 'posterior') setActiveSide('posterior');
                      if (m.side === 'anterior') setActiveSide('anterior');
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                      isSelected 
                        ? "bg-theme-primary text-black border-theme-primary font-black shadow-lg scale-105" 
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Specification Sheet (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {selectedMuscle ? (
            <div className="bg-black border border-theme-primary/30 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Header */}
              <div className="space-y-3 pb-6 border-b border-zinc-850">
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
                    Nome Científico: {selectedMuscle.latinName}
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
                  <span>Função no Futebol</span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                  {selectedMuscle.footballFunction}
                </p>
              </div>

              {/* Top Exercises */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider">
                    <Dumbbell size={16} className="text-theme-primary" />
                    <span>Exercícios Recomendados para Atletas</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{selectedMuscle.exercises.length} protocolos</span>
                </div>

                <div className="space-y-2">
                  {selectedMuscle.exercises.map((ex, idx) => (
                    <div key={idx} className="bg-zinc-900/80 border border-zinc-800/80 p-3.5 rounded-2xl space-y-1 hover:border-theme-primary/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-theme-primary" />
                          {ex.name}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase rounded-md">
                          {ex.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 pl-5 leading-relaxed">
                        {ex.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Injury Prevention Protocol */}
              <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert size={16} />
                  <span>Prevenção de Lesão & Cuidados</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedMuscle.prevention}
                </p>
              </div>

              {/* Stretches & Recovery */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <Flame size={16} />
                  <span>Alongamento & Recuperação</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedMuscle.stretches}
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-black border border-zinc-800 p-8 rounded-3xl text-center space-y-3">
              <Target size={32} className="mx-auto text-zinc-600" />
              <p className="text-xs text-zinc-400 font-bold uppercase">Selecione um grupo muscular no mapa para ver a ficha completa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
