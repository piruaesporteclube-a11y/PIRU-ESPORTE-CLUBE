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
  Sparkles,
  Info,
  Flame,
  Target,
  UserCheck,
  ChevronRight,
  Eye,
  Layers
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
    footballFunction: 'Proteção corporal no contato ombro a ombro, tração para arremessos de lateral longos e equilíbrio nos sprints.',
    description: 'Músculo principal do tórax anterior. Dá sustentação ao tronco em impactos e estabilização de corrida.',
    exercises: [
      { name: 'Supino Reto / Inclinado', description: 'Empurrão com barra ou halteres para força máxima de tronco.', type: 'Força' },
      { name: 'Flexão de Braço (Push-up)', description: 'Estabilização de core e cintura escapular.', type: 'Estabilidade' },
      { name: 'Arremesso Medicinal Ball', description: 'Explosão para arremessos de lateral.', type: 'Explosão' }
    ],
    prevention: 'Manter equilíbrio com os músculos das costas para evitar protusão dos ombros e lesões posturais.',
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
    footballFunction: 'Absorção de impactos em quedas no gramado, proteção articular e equilíbrio no impulso dos braços.',
    description: 'Envolve a articulação do ombro em três porções: anterior, lateral e posterior.',
    exercises: [
      { name: 'Desenvolvimento com Halteres', description: 'Fortalecimento geral da articulação glenoumeral.', type: 'Força' },
      { name: 'Elevação Lateral', description: 'Estabilidade muscular nos contatos laterais.', type: 'Hipertrofia' },
      { name: 'Crucifixo Inverso', description: 'Ajuste postural da porção posterior do ombro.', type: 'Estabilidade' }
    ],
    prevention: 'Fortalecer manguito rotador (supraespinhal, infraespinhal e redondo menor) para prevenir deslocamentos.',
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
    footballFunction: 'Manutenção da mecânica de corrida com braços fletidos e firmeza em disputas de espaço.',
    description: 'Músculo de duas cabeças na parte anterior do braço, atuando na flexão de cotovelo.',
    exercises: [
      { name: 'Rosca Direta', description: 'Construção de força flexora de cotovelo.', type: 'Hipertrofia' },
      { name: 'Rosca Martelo', description: 'Fortalece a pegada e o músculo braquiorradial.', type: 'Força' },
      { name: 'Barra Fixa Supinada', description: 'Exercício composto funcional para braços e costas.', type: 'Força' }
    ],
    prevention: 'Evitar sobrecarga em extensão completa brusca sem prévio aquecimento.',
    stretches: 'Extensão de braço com palma da mão para baixo e dedos puxados para trás.',
    injuryRisk: 'Baixo',
    color: '#eab308' // yellow
  },
  {
    id: 'triceps',
    name: 'Tríceps Braquial',
    latinName: 'Triceps Brachii',
    category: 'superiores',
    side: 'posterior',
    footballFunction: 'Impulsão rápida para se levantar do solo, empurrão de proteção e arremessos fortes.',
    description: 'Representa 60% da massa do braço, essencial na extensão do cotovelo.',
    exercises: [
      { name: 'Tríceps Testa', description: 'Isolamento de força na extensão do cotovelo.', type: 'Hipertrofia' },
      { name: 'Flexão Fechada (Diamante)', description: 'Explosão muscular com o peso corporal.', type: 'Explosão' },
      { name: 'Tríceps Pulley', description: 'Trabalho contínuo de resistência e hipertrofia.', type: 'Hipertrofia' }
    ],
    prevention: 'Aquecimento articular de cotovelos e progressão de carga segura.',
    stretches: 'Elevação do braço acima da cabeça dobrando o cotovelo atrás da nuca.',
    injuryRisk: 'Baixo',
    color: '#3b82f6' // blue
  },
  {
    id: 'antebravos',
    name: 'Antebraços',
    latinName: 'Flexores & Extensores',
    category: 'superiores',
    side: 'ambos',
    footballFunction: 'Agarre firme de bola pelos goleiros e proteção contra impactos nas quedas.',
    description: 'Conjunto de flexores e extensores do punho e dedos na porção distal do braço.',
    exercises: [
      { name: 'Rosca Punho Direta e Inversa', description: 'Estabilidade articular do punho.', type: 'Estabilidade' },
      { name: 'Caminhada do Fazendeiro (Farmer Walk)', description: 'Fortalecimento da pegada isométrica.', type: 'Força' }
    ],
    prevention: 'Mobilidade constante de punhos e fortalecimento dos extensores.',
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
    footballFunction: 'Centro de gravidade e transferência de energia das pernas para o chute, giros e cabeceios.',
    description: 'Reto abdominal, oblíquos e transverso. É o cinto de estabilidade de todo o corpo.',
    exercises: [
      { name: 'Prancha Frontal e Lateral', description: 'Isometria para estabilização da coluna vertebral.', type: 'Estabilidade' },
      { name: 'Pallof Press com Elástico', description: 'Anti-rotação indispensável para mudanças de direção.', type: 'Estabilidade' },
      { name: 'Abdominal Infra Suspenso', description: 'Força na porção inferior e flexores de quadril.', type: 'Força' }
    ],
    prevention: 'Estabilização de core é a principal defesa contra a pubalgia e dores na lombar.',
    stretches: 'Postura da Cobra (extensão suave do tronco no chão) e rotação de quadril.',
    injuryRisk: 'Alto',
    color: '#10b981' // emerald
  },
  {
    id: 'trapezio',
    name: 'Trapézio & Pescoço',
    latinName: 'Trapezius',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Absorção de impactos no cabeceio, prevenção de concussão e proteção da coluna cervical.',
    description: 'Músculo em formato de losango cobrindo nuca, ombros e parte superior das costas.',
    exercises: [
      { name: 'Encolhimento com Halteres', description: 'Fortalecimento da porção superior do trapézio.', type: 'Força' },
      { name: 'Isometria Cervical Guiada', description: 'Reduz comprovadamente o efeito chicote nos impactos.', type: 'Estabilidade' },
      { name: 'Face Pull na Polia', description: 'Fortalece postura escapular e porção média do trapézio.', type: 'Estabilidade' }
    ],
    prevention: 'Treinar fortalecimento de pescoço diminui o risco de traumas e concussões no futebol.',
    stretches: 'Inclinação lateral suave do pescoço mantendo o ombro oposto rebaixado.',
    injuryRisk: 'Médio',
    color: '#a855f7' // purple
  },
  {
    id: 'dorsal',
    name: 'Dorsal / Costas',
    latinName: 'Latissimus Dorsi',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Postura ereta nos sprints intensos, tração de braço na corrida e estabilidade de tronco.',
    description: 'Maior músculo da parte superior do corpo, garantindo a largura do tronco.',
    exercises: [
      { name: 'Puxada Frontal / Barra Fixa', description: 'Construção de largura e força de tração vertical.', type: 'Força' },
      { name: 'Remada Curvada com Barra', description: 'Densidade muscular e postura escapular.', type: 'Força' },
      { name: 'Remada Unilateral com Halter', description: 'Equilíbrio e simetria lateral das costas.', type: 'Hipertrofia' }
    ],
    prevention: 'Fortalecer a cadeia posterior para prevenir hiperlordose e descompensações.',
    stretches: 'Pendurar-se na barra fixa ou alongamento da dorsal em suporte vertical.',
    injuryRisk: 'Baixo',
    color: '#8b5cf6' // violet
  },
  {
    id: 'lombar',
    name: 'Lombar (Erretores da Espinha)',
    latinName: 'Erector Spinae',
    category: 'tronco',
    side: 'posterior',
    footballFunction: 'Sustentação da coluna nos saltos de cabeceio, aterrissagens e giros bruscos.',
    description: 'Músculos profundos ao longo da coluna vertebral inferior.',
    exercises: [
      { name: 'Extensão Lombar no Banco 45°', description: 'Fortalecimento direto da coluna lombar.', type: 'Estabilidade' },
      { name: 'Levantamento Terra (Deadlift)', description: 'Força máxima integrada da cadeia posterior.', type: 'Força' },
      { name: 'Prancha Super-Homem', description: 'Ativação postural para saúde vertebral.', type: 'Estabilidade' }
    ],
    prevention: 'Preservar a postura neutra em exercícios pesados e fortalecer o abdômen em sincronia.',
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
    footballFunction: 'Gerador primário de potência: aceleração do sprint, salto vertical, frenagem e estabilização de joelho.',
    description: 'O maior e mais potente grupo muscular do atleta. Vital para a aceleração no futebol.',
    exercises: [
      { name: 'Elevação Pélvica (Hip Thrust)', description: 'Exercício nº 1 para potência de glúteo em velocidade.', type: 'Explosão' },
      { name: 'Agachamento Profundo', description: 'Força máxima e amplitude de quadril.', type: 'Força' },
      { name: 'Abdução de Quadril com Elástico', description: 'Ativa o Glúteo Médio, evitando o valgo dinâmico no joelho.', type: 'Estabilidade' }
    ],
    prevention: 'Ativação prévia para evitar "amnésia glútea", prevenindo lesões no LCA e lombar.',
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
    footballFunction: 'Potência de chute de longa distância, extensão explosiva de joelho e desacelerações bruscas.',
    description: 'Composto por Reto Femoral, Vasto Lateral, Vasto Medial e Vasto Intermédio.',
    exercises: [
      { name: 'Agachamento Livre com Barra', description: 'Clássico para força funcional de membros inferiores.', type: 'Força' },
      { name: 'Leg Press 45°', description: 'Carga pesada segura para hipertrofia de coxas.', type: 'Hipertrofia' },
      { name: 'Passada Dinâmica (Lunge)', description: 'Desenvolve estabilidade unilateral e força de corrida.', type: 'Explosão' },
      { name: 'Cadeira Extensora', description: 'Isolamento da extensão de joelho e vasto medial.', type: 'Hipertrofia' }
    ],
    prevention: 'Manter a razão de força equilibrada com os isquiotibiais para proteger o LCA.',
    stretches: 'Puxada do calcanhar em direção ao glúteo em pé, mantendo o corpo ereto.',
    injuryRisk: 'Alto',
    color: '#e11d48' // red dark
  },
  {
    id: 'isquiotibiais',
    name: 'Posteriores de Coxa (Isquiotibiais)',
    latinName: 'Biceps Femoris & Semitendinosus',
    category: 'inferiores',
    side: 'posterior',
    footballFunction: 'Frenagem no sprint máximo, flexão de joelho e proteção do Ligamento Cruzado Anterior (LCA).',
    description: 'MÚSCULO COM MAIOR ÍNDICE DE ESTIRAMENTOS NO FUTEBOL PROFISSIONAL. Requer atenção preventiva diária.',
    exercises: [
      { name: 'Exercício Nórdico (Nordic Hamstring)', description: 'INDISPENSÁVEL NO FUTEBOL! O melhor preventivo de lesão excêntrica.', type: 'Explosão' },
      { name: 'Mesa Flexora / Cadeira Flexora', description: 'Isolamento de força e volume muscular.', type: 'Hipertrofia' },
      { name: 'Stiff Unilateral (RDL)', description: 'Força na extensão de quadril e cadeia posterior.', type: 'Força' }
    ],
    prevention: 'Inclusão semanal de treino excêntrico (Nórdico) reduz em até 70% as lesões no futebol!',
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
    footballFunction: 'Passe de chapa, chute colocado, mudança de direção e controle de bola interno.',
    description: 'Face interna da coxa. Responsáveis pela estabilização da virilha e púbis.',
    exercises: [
      { name: 'Prancha de Copenhagen', description: 'EXERCÍCIO OURO para prevenir pubalgia no futebol.', type: 'Estabilidade' },
      { name: 'Agachamento Sumô', description: 'Fortalecimento sob carga na posição aberta.', type: 'Força' },
      { name: 'Cadeira Adutora', description: 'Isolamento muscular dos adutores.', type: 'Hipertrofia' }
    ],
    prevention: 'Prancha de Copenhagen 2x por semana reduz o risco de pubalgia e inflamações inguinofemorais.',
    stretches: 'Posição da borboleta sentado ou afundo lateral com perna estendida.',
    injuryRisk: 'Crítico no Futebol',
    color: '#fbbf24' // amber
  },
  {
    id: 'panturrilhas',
    name: 'Panturrilhas & Tíbia',
    latinName: 'Gastrocnemius, Soleus & Tibialis',
    category: 'inferiores',
    side: 'ambos',
    footballFunction: 'Propulsão no salto, reação no drible, amortecimento das passadas e prevenção de canelite.',
    description: 'Compreende os Gastrocnêmios, o Sóleo profundo e o Tibial Anterior.',
    exercises: [
      { name: 'Elevação de Calcanhares em Pé', description: 'Trabalho de força do gastrocnêmio com joelhos estendidos.', type: 'Força' },
      { name: 'Elevação de Calcanhares Sentado', description: 'Atinge diretamente o músculo sóleo.', type: 'Hipertrofia' },
      { name: 'Caminhada de Calcanhar', description: 'Fortalecimento do tibial anterior para prevenir canelite.', type: 'Estabilidade' }
    ],
    prevention: 'Manter flexibilidade do tendão de Aquiles e hidratação adequada para evitar cãibras.',
    stretches: 'Empurrar a parede mantendo o calcanhar traseiro colado ao chão.',
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
  const [activeTab, setActiveTab] = useState<'humano' | 'studio3d'>('humano');
  const [viewSide, setViewSide] = useState<'anterior' | 'posterior'>('anterior');
  const [autoRotate, setAutoRotate] = useState(false);

  // Three.js 3D Studio Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const muscleMeshesRef = useRef<{ [key: string]: THREE.Mesh[] }>({});
  const animationFrameIdRef = useRef<number | null>(null);

  // Filtered muscles list
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

  // Setup Three.js 3D View Mode when user switches to 'studio3d'
  useEffect(() => {
    if (activeTab !== 'studio3d' || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.04);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.9, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 8.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controlsRef.current = controls;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    mainLight.position.set(3, 5, 4);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-3, 4, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 1.2);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 20, 0xfbbf24, 0x27272a);
    gridHelper.position.y = -1.1;
    scene.add(gridHelper);

    // Podium Base
    const podiumGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.18, 32);
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.8 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -1.02;
    podium.receiveShadow = true;
    scene.add(podium);

    // Anatomical Human Model in 3D
    const bodyGroup = new THREE.Group();
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

    // Bone Structure Base
    const boneMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7, metalness: 0.4, transparent: true, opacity: 0.5 });
    const headGeo = new THREE.SphereGeometry(0.23, 24, 24); headGeo.scale(1, 1.22, 1);
    const head = new THREE.Mesh(headGeo, boneMat); head.position.set(0, 2.05, 0); bodyGroup.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 16);
    const neck = new THREE.Mesh(neckGeo, boneMat); neck.position.set(0, 1.8, 0); bodyGroup.add(neck);

    const spineGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.1, 16);
    const spine = new THREE.Mesh(spineGeo, boneMat); spine.position.set(0, 1.2, -0.04); bodyGroup.add(spine);

    const pelvisGeo = new THREE.ConeGeometry(0.28, 0.22, 16);
    const pelvis = new THREE.Mesh(pelvisGeo, boneMat); pelvis.position.set(0, 0.55, 0); pelvis.rotation.x = Math.PI; bodyGroup.add(pelvis);

    // Anatomical Meshes
    addMuscleMesh('trapezio', new THREE.ConeGeometry(0.36, 0.42, 4), [0, 1.64, -0.06], [0, 0, 0], [1.1, 1, 0.6]);
    
    const deltGeo = new THREE.SphereGeometry(0.16, 16, 16); deltGeo.scale(1, 1.25, 0.95);
    addMuscleMesh('deltoides', deltGeo, [0.42, 1.58, 0], [0, 0, -0.22]);
    addMuscleMesh('deltoides', deltGeo, [-0.42, 1.58, 0], [0, 0, 0.22]);

    const chestGeo = new THREE.BoxGeometry(0.26, 0.26, 0.12);
    addMuscleMesh('peitoral', chestGeo, [0.14, 1.48, 0.12], [0, 0.12, -0.05]);
    addMuscleMesh('peitoral', chestGeo, [-0.14, 1.48, 0.12], [0, -0.12, 0.05]);

    const latGeo = new THREE.BoxGeometry(0.24, 0.44, 0.14);
    addMuscleMesh('dorsal', latGeo, [0.24, 1.34, -0.1], [0, -0.2, -0.1]);
    addMuscleMesh('dorsal', latGeo, [-0.24, 1.34, -0.1], [0, 0.2, 0.1]);

    addMuscleMesh('abdomen', new THREE.BoxGeometry(0.22, 0.38, 0.09), [0, 1.16, 0.12]);

    const obliGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.36, 16);
    addMuscleMesh('abdomen', obliGeo, [0.22, 1.16, 0.05], [0, 0, -0.15]);
    addMuscleMesh('abdomen', obliGeo, [-0.22, 1.16, 0.05], [0, 0, 0.15]);

    addMuscleMesh('lombar', new THREE.BoxGeometry(0.22, 0.28, 0.12), [0, 0.92, -0.1]);

    const bicepsGeo = new THREE.CapsuleGeometry(0.08, 0.24, 8, 16);
    addMuscleMesh('biceps', bicepsGeo, [0.46, 1.3, 0.04], [0, 0, -0.1]);
    addMuscleMesh('biceps', bicepsGeo, [-0.46, 1.3, 0.04], [0, 0, 0.1]);

    const tricepsGeo = new THREE.CapsuleGeometry(0.08, 0.25, 8, 16);
    addMuscleMesh('triceps', tricepsGeo, [0.46, 1.3, -0.06], [0, 0, -0.1]);
    addMuscleMesh('triceps', tricepsGeo, [-0.46, 1.3, -0.06], [0, 0, 0.1]);

    const forearmGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.38, 16);
    addMuscleMesh('antebravos', forearmGeo, [0.52, 0.94, 0], [0, 0, -0.12]);
    addMuscleMesh('antebravos', forearmGeo, [-0.52, 0.94, 0], [0, 0, 0.12]);

    const gluteGeo = new THREE.SphereGeometry(0.22, 16, 16); gluteGeo.scale(1, 0.92, 1.1);
    addMuscleMesh('gluteos', gluteGeo, [0.16, 0.52, -0.14]);
    addMuscleMesh('gluteos', gluteGeo, [-0.16, 0.52, -0.14]);

    const adducGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.44, 16);
    addMuscleMesh('adutores', adducGeo, [0.08, 0.22, 0.02], [0, 0, -0.06]);
    addMuscleMesh('adutores', adducGeo, [-0.08, 0.22, 0.02], [0, 0, 0.06]);

    const quadGeo = new THREE.CapsuleGeometry(0.13, 0.44, 8, 16);
    addMuscleMesh('quadriceps', quadGeo, [0.22, 0.2, 0.08], [0.1, 0, -0.08]);
    addMuscleMesh('quadriceps', quadGeo, [-0.22, 0.2, 0.08], [0.1, 0, 0.08]);

    const hamstGeo = new THREE.CapsuleGeometry(0.12, 0.44, 8, 16);
    addMuscleMesh('isquiotibiais', hamstGeo, [0.22, 0.2, -0.08], [-0.1, 0, -0.08]);
    addMuscleMesh('isquiotibiais', hamstGeo, [-0.22, 0.2, -0.08], [-0.1, 0, 0.08]);

    const calfGeo = new THREE.CapsuleGeometry(0.09, 0.32, 8, 16);
    addMuscleMesh('panturrilhas', calfGeo, [0.2, -0.38, -0.06], [0, 0, -0.04]);
    addMuscleMesh('panturrilhas', calfGeo, [-0.2, -0.38, -0.06], [0, 0, 0.04]);

    const tibGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.34, 16);
    addMuscleMesh('panturrilhas', tibGeo, [0.2, -0.38, 0.06], [0, 0, -0.04]);
    addMuscleMesh('panturrilhas', tibGeo, [-0.2, -0.38, 0.06], [0, 0, 0.04]);

    muscleMeshesRef.current = meshesMap;

    // Raycasting
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
            toast.info(`Músculo: ${found.name}`);
          }
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousemove', handlePointerMove);
    domElement.addEventListener('click', handlePointerClick);

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

      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (rendererRef.current?.domElement) rendererRef.current.domElement.remove();
      scene.clear();
    };
  }, [activeTab, autoRotate]);

  // Update materials when selection changes in 3D Mode
  useEffect(() => {
    if (activeTab !== 'studio3d' || !muscleMeshesRef.current) return;

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
              <span>Anatomia Humana & Biomecânica no Futebol</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              Corpo Humano <span className="text-theme-primary">Interativo</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Análise anatômica completa do atleta. Clique em qualquer grupo muscular do corpo humano para conferir a função no futebol, preventivos de lesões graves (Isquiotibiais, Adutores, LCA) e treinos de alto rendimento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            {/* View Switcher: Real Human Anatomical Map vs 3D Studio */}
            <div className="bg-black/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 flex items-center gap-1 shadow-xl">
              <button
                onClick={() => setActiveTab('humano')}
                className={cn(
                  "px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'humano' 
                    ? "bg-theme-primary text-black shadow-md scale-105" 
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <UserCheck size={16} />
                <span>Anatomia Humana HD</span>
              </button>
              <button
                onClick={() => setActiveTab('studio3d')}
                className={cn(
                  "px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'studio3d' 
                    ? "bg-theme-primary text-black shadow-md scale-105" 
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Activity size={16} />
                <span>Estúdio 3D 360°</span>
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

      {/* Main Grid: Body Display (7 Cols) + Spec Sheet (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Human Body / 3D Mode */}
        <div className="lg:col-span-7 space-y-4">
          
          {activeTab === 'humano' ? (
            /* REALISTIC HUMAN ANATOMY VIEW WITH PIN BADGES & REALISTIC SVG MUSCLE ZONES */
            <div className="bg-black border border-zinc-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
              
              {/* Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Visão Anatômica:</span>
                  <div className="bg-zinc-900 p-1 rounded-2xl border border-zinc-800 flex items-center gap-1">
                    <button
                      onClick={() => setViewSide('anterior')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer",
                        viewSide === 'anterior' ? "bg-theme-primary text-black shadow-md" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Frente (Anterior)
                    </button>
                    <button
                      onClick={() => setViewSide('posterior')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer",
                        viewSide === 'posterior' ? "bg-theme-primary text-black shadow-md" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Costas (Posterior)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
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

              {/* Realistic Human Body Graphic Display */}
              <div className="relative min-h-[560px] md:min-h-[640px] flex items-center justify-center bg-gradient-to-b from-zinc-950 via-black to-zinc-950 rounded-2xl p-4 overflow-hidden border border-zinc-900 group">
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

                {/* SVG REALISTIC HUMAN BODY ANATOMY */}
                <div className="relative w-full max-w-md mx-auto flex justify-center items-center">
                  <svg viewBox="0 0 500 850" className="w-full h-auto max-h-[620px] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] z-10">
                    <defs>
                      <linearGradient id="bodySkin" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#27272a" />
                        <stop offset="50%" stopColor="#18181b" />
                        <stop offset="100%" stopColor="#09090b" />
                      </linearGradient>

                      <radialGradient id="headGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3f3f46" />
                        <stop offset="100%" stopColor="#18181b" />
                      </radialGradient>

                      <filter id="shadowEffect" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.6"/>
                      </filter>
                    </defs>

                    {/* BASE HUMAN BODY SILHOUETTE (Realistic proportion contour) */}
                    {/* Head & Neck */}
                    <ellipse cx="250" cy="80" rx="38" ry="48" fill="url(#headGlow)" stroke="#3f3f46" strokeWidth="2" />
                    <path d="M 232,125 C 232,145 235,155 235,160 L 265,160 C 265,155 268,145 268,125 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="1.5" />

                    {/* Joints / Skeleton Anchor Reference */}
                    <circle cx="165" cy="180" r="14" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                    <circle cx="335" cy="180" r="14" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />

                    {/* VIEW ANTERIOR (Frente) */}
                    {viewSide === 'anterior' && (
                      <g className="transition-all duration-300" filter="url(#shadowEffect)">
                        
                        {/* Trapézio Anterior / Cervical */}
                        <path
                          d="M 235,128 L 265,128 L 295,168 C 280,172 260,170 250,170 C 240,170 220,172 205,168 Z"
                          fill={selectedMuscle?.id === 'trapezio' ? '#a855f7' : '#3b0764'}
                          stroke={selectedMuscle?.id === 'trapezio' ? '#c084fc' : '#a855f7'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Ombros / Deltoides Anteriores */}
                        <path
                          d="M 202,170 C 180,172 155,185 152,225 C 172,220 190,205 198,188 Z"
                          fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#9a3412'}
                          stroke={selectedMuscle?.id === 'deltoides' ? '#fdba74' : '#ea580c'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 298,170 C 320,172 345,185 348,225 C 328,220 310,205 302,188 Z"
                          fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#9a3412'}
                          stroke={selectedMuscle?.id === 'deltoides' ? '#fdba74' : '#ea580c'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Peitoral Maior (Anatomical Chest Plates) */}
                        <path
                          d="M 202,180 C 220,178 248,182 248,235 C 225,248 198,235 192,205 Z"
                          fill={selectedMuscle?.id === 'peitoral' ? '#ef4444' : '#991b1b'}
                          stroke={selectedMuscle?.id === 'peitoral' ? '#fca5a5' : '#dc2626'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 298,180 C 280,178 252,182 252,235 C 275,248 302,235 308,205 Z"
                          fill={selectedMuscle?.id === 'peitoral' ? '#ef4444' : '#991b1b'}
                          stroke={selectedMuscle?.id === 'peitoral' ? '#fca5a5' : '#dc2626'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Bíceps Braquial */}
                        <path
                          d="M 152,230 C 145,245 148,285 162,298 C 172,282 170,245 158,230 Z"
                          fill={selectedMuscle?.id === 'biceps' ? '#eab308' : '#854d0e'}
                          stroke={selectedMuscle?.id === 'biceps' ? '#fde047' : '#ca8a04'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 348,230 C 355,245 352,285 338,298 C 328,282 330,245 342,230 Z"
                          fill={selectedMuscle?.id === 'biceps' ? '#eab308' : '#854d0e'}
                          stroke={selectedMuscle?.id === 'biceps' ? '#fde047' : '#ca8a04'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'biceps')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Antebraços (Flexores/Extensores) */}
                        <path
                          d="M 158,305 C 145,335 138,385 148,405 C 160,392 165,342 165,305 Z"
                          fill={selectedMuscle?.id === 'antebravos' ? '#06b6d4' : '#164e63'}
                          stroke={selectedMuscle?.id === 'antebravos' ? '#67e8f9' : '#0891b2'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 342,305 C 355,335 362,385 352,405 C 340,392 335,342 335,305 Z"
                          fill={selectedMuscle?.id === 'antebravos' ? '#06b6d4' : '#164e63'}
                          stroke={selectedMuscle?.id === 'antebravos' ? '#67e8f9' : '#0891b2'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'antebravos')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Abdômen & Core (6-pack + Oblíquos) */}
                        <path
                          d="M 215,242 L 285,242 L 278,365 L 222,365 Z"
                          fill={selectedMuscle?.id === 'abdomen' ? '#10b981' : '#064e3b'}
                          stroke={selectedMuscle?.id === 'abdomen' ? '#6ee7b7' : '#059669'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'abdomen')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'abdomen')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        {/* Linhas anatômicas do 6-pack */}
                        <line x1="250" y1="245" x2="250" y2="360" stroke="#047857" strokeWidth="2" opacity="0.6" />
                        <line x1="220" y1="280" x2="280" y2="280" stroke="#047857" strokeWidth="1.5" opacity="0.6" />
                        <line x1="222" y1="320" x2="278" y2="320" stroke="#047857" strokeWidth="1.5" opacity="0.6" />

                        {/* Adutores do Quadril (Parte Interna das Coxas) */}
                        <path
                          d="M 235,395 C 242,395 246,470 242,525 L 225,525 C 220,470 225,395 235,395 Z"
                          fill={selectedMuscle?.id === 'adutores' ? '#fbbf24' : '#78350f'}
                          stroke={selectedMuscle?.id === 'adutores' ? '#fde047' : '#d97706'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 265,395 C 258,395 254,470 258,525 L 275,525 C 280,470 275,395 265,395 Z"
                          fill={selectedMuscle?.id === 'adutores' ? '#fbbf24' : '#78350f'}
                          stroke={selectedMuscle?.id === 'adutores' ? '#fde047' : '#d97706'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Quadríceps (Coxas Anteriores - Reto Femoral & Vastos) */}
                        <path
                          d="M 188,388 C 210,380 224,392 222,538 C 195,535 178,485 188,388 Z"
                          fill={selectedMuscle?.id === 'quadriceps' ? '#e11d48' : '#881337'}
                          stroke={selectedMuscle?.id === 'quadriceps' ? '#fda4af' : '#e11d48'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 312,388 C 290,380 276,392 278,538 C 305,535 322,485 312,388 Z"
                          fill={selectedMuscle?.id === 'quadriceps' ? '#e11d48' : '#881337'}
                          stroke={selectedMuscle?.id === 'quadriceps' ? '#fda4af' : '#e11d48'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Panturrilhas & Tibial (Membros Inferiores) */}
                        <path
                          d="M 185,565 C 205,565 210,650 200,705 C 182,695 175,630 185,565 Z"
                          fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#78350f'}
                          stroke={selectedMuscle?.id === 'panturrilhas' ? '#fcd34d' : '#d97706'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 315,565 C 295,565 290,650 300,705 C 318,695 325,630 315,565 Z"
                          fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#78350f'}
                          stroke={selectedMuscle?.id === 'panturrilhas' ? '#fcd34d' : '#d97706'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                      </g>
                    )}

                    {/* VIEW POSTERIOR (Costas) */}
                    {viewSide === 'posterior' && (
                      <g className="transition-all duration-300" filter="url(#shadowEffect)">
                        
                        {/* Trapézio Posterior (Diamond shape) */}
                        <path
                          d="M 250,128 L 298,168 L 250,230 L 202,168 Z"
                          fill={selectedMuscle?.id === 'trapezio' ? '#a855f7' : '#3b0764'}
                          stroke={selectedMuscle?.id === 'trapezio' ? '#c084fc' : '#a855f7'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Deltoide Posterior */}
                        <path
                          d="M 198,168 C 178,172 155,185 152,225 C 172,220 190,205 195,188 Z"
                          fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#9a3412'}
                          stroke={selectedMuscle?.id === 'deltoides' ? '#fdba74' : '#ea580c'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 302,168 C 322,172 345,185 348,225 C 328,220 310,205 305,188 Z"
                          fill={selectedMuscle?.id === 'deltoides' ? '#f97316' : '#9a3412'}
                          stroke={selectedMuscle?.id === 'deltoides' ? '#fdba74' : '#ea580c'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'deltoides')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Dorsal / Latíssimo do Dorso */}
                        <path
                          d="M 200,225 C 230,220 250,230 250,305 C 230,315 208,295 198,245 Z"
                          fill={selectedMuscle?.id === 'dorsal' ? '#8b5cf6' : '#4c1d95'}
                          stroke={selectedMuscle?.id === 'dorsal' ? '#c084fc' : '#7c3aed'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 300,225 C 270,220 250,230 250,305 C 270,315 292,295 302,245 Z"
                          fill={selectedMuscle?.id === 'dorsal' ? '#8b5cf6' : '#4c1d95'}
                          stroke={selectedMuscle?.id === 'dorsal' ? '#c084fc' : '#7c3aed'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Tríceps Braquial */}
                        <path
                          d="M 152,228 C 144,242 146,282 158,295 C 168,280 168,242 158,228 Z"
                          fill={selectedMuscle?.id === 'triceps' ? '#3b82f6' : '#1e3a8a'}
                          stroke={selectedMuscle?.id === 'triceps' ? '#93c5fd' : '#2563eb'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 348,228 C 356,242 354,282 342,295 C 332,280 332,242 342,228 Z"
                          fill={selectedMuscle?.id === 'triceps' ? '#3b82f6' : '#1e3a8a'}
                          stroke={selectedMuscle?.id === 'triceps' ? '#93c5fd' : '#2563eb'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'triceps')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Lombar (Erretores da Espinha) */}
                        <path
                          d="M 218,300 L 282,300 L 275,365 L 225,365 Z"
                          fill={selectedMuscle?.id === 'lombar' ? '#ec4899' : '#831843'}
                          stroke={selectedMuscle?.id === 'lombar' ? '#fbcfe8' : '#db2777'}
                          strokeWidth="2"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'lombar')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'lombar')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Glúteos (Máximo & Médio) */}
                        <path
                          d="M 215,368 C 248,362 248,435 212,438 C 188,430 195,372 215,368 Z"
                          fill={selectedMuscle?.id === 'gluteos' ? '#f43f5e' : '#881337'}
                          stroke={selectedMuscle?.id === 'gluteos' ? '#fecdd3' : '#e11d48'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 285,368 C 252,362 252,435 288,438 C 312,430 305,372 285,368 Z"
                          fill={selectedMuscle?.id === 'gluteos' ? '#f43f5e' : '#881337'}
                          stroke={selectedMuscle?.id === 'gluteos' ? '#fecdd3' : '#e11d48'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Isquiotibiais (Posteriores de Coxa - Crítico no Futebol!) */}
                        <path
                          d="M 192,442 C 220,440 228,450 222,545 C 198,542 185,498 192,442 Z"
                          fill={selectedMuscle?.id === 'isquiotibiais' ? '#dc2626' : '#7f1d1d'}
                          stroke={selectedMuscle?.id === 'isquiotibiais' ? '#fca5a5' : '#ef4444'}
                          strokeWidth="3"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 308,442 C 280,440 272,450 278,545 C 302,542 315,498 308,442 Z"
                          fill={selectedMuscle?.id === 'isquiotibiais' ? '#dc2626' : '#7f1d1d'}
                          stroke={selectedMuscle?.id === 'isquiotibiais' ? '#fca5a5' : '#ef4444'}
                          strokeWidth="3"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />

                        {/* Panturrilhas (Gastrocnêmios Posterior) */}
                        <path
                          d="M 188,565 C 215,565 212,652 200,705 C 180,695 172,628 188,565 Z"
                          fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#78350f'}
                          stroke={selectedMuscle?.id === 'panturrilhas' ? '#fcd34d' : '#d97706'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                        <path
                          d="M 312,565 C 285,565 288,652 300,705 C 320,695 328,628 312,565 Z"
                          fill={selectedMuscle?.id === 'panturrilhas' ? '#f59e0b' : '#78350f'}
                          stroke={selectedMuscle?.id === 'panturrilhas' ? '#fcd34d' : '#d97706'}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseEnter={() => setHoveredMuscle(MUSCLE_GROUPS.find(m => m.id === 'panturrilhas')!)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                        />
                      </g>
                    )}
                  </svg>

                  {/* ANATOMICAL LEADER LINE PINS (Clickable Badges pointing directly to human body muscles) */}
                  <div className="absolute inset-0 pointer-events-none">
                    {viewSide === 'anterior' ? (
                      <>
                        {/* Peitoral Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'peitoral')!)}
                          className="absolute top-[24%] left-[10%] md:left-[14%] pointer-events-auto bg-black/90 hover:bg-red-950/80 border border-red-500/50 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span>Peitoral</span>
                        </button>

                        {/* Abdômen Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'abdomen')!)}
                          className="absolute top-[34%] right-[8%] md:right-[12%] pointer-events-auto bg-black/90 hover:bg-emerald-950/80 border border-emerald-500/50 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Core & Abdômen</span>
                        </button>

                        {/* Quadríceps Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'quadriceps')!)}
                          className="absolute top-[52%] left-[6%] md:left-[10%] pointer-events-auto bg-black/90 hover:bg-rose-950/80 border border-rose-500/50 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>Quadríceps</span>
                        </button>

                        {/* Adutores Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'adutores')!)}
                          className="absolute top-[56%] right-[6%] md:right-[10%] pointer-events-auto bg-black/90 hover:bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>Adutores (Virilha)</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Trapézio Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'trapezio')!)}
                          className="absolute top-[18%] left-[8%] md:left-[12%] pointer-events-auto bg-black/90 hover:bg-purple-950/80 border border-purple-500/50 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                          <span>Trapézio</span>
                        </button>

                        {/* Dorsal Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'dorsal')!)}
                          className="absolute top-[30%] right-[8%] md:right-[12%] pointer-events-auto bg-black/90 hover:bg-violet-950/80 border border-violet-500/50 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                          <span>Costas / Dorsal</span>
                        </button>

                        {/* Glúteos Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'gluteos')!)}
                          className="absolute top-[46%] left-[6%] md:left-[10%] pointer-events-auto bg-black/90 hover:bg-rose-950/80 border border-rose-500/50 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>Glúteos</span>
                        </button>

                        {/* Isquiotibiais Badge */}
                        <button
                          onClick={() => setSelectedMuscle(MUSCLE_GROUPS.find(m => m.id === 'isquiotibiais')!)}
                          className="absolute top-[58%] right-[4%] md:right-[8%] pointer-events-auto bg-black/90 hover:bg-red-950/90 border border-red-500 text-red-400 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                          <span>Posteriores de Coxa</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Hover Tooltip overlay */}
                {hoveredMuscle && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 bg-black/95 backdrop-blur-md border border-theme-primary text-white font-black text-xs uppercase rounded-2xl shadow-2xl flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredMuscle.color }} />
                      <span>{hoveredMuscle.name} ({hoveredMuscle.latinName})</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 3D STUDIO MODE */
            <div className="relative bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl min-h-[560px] md:min-h-[640px] flex flex-col">
              <div ref={mountRef} className="w-full flex-1 min-h-[480px] md:min-h-[560px] cursor-grab active:cursor-grabbing" />
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3 z-10 no-print">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">Modo 3D Interativo: Arraste com o mouse para girar 360°</span>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center gap-1.5 cursor-pointer",
                    autoRotate ? "bg-green-500/20 border-green-500 text-green-400 animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  <RotateCcw size={12} />
                  <span>{autoRotate ? 'Giro 360° Ativo' : 'Girar 360°'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Muscle Selection Buttons */}
          <div className="bg-black border border-zinc-800 p-4 rounded-3xl space-y-3 no-print">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-theme-primary" />
                <span className="text-xs font-black text-white uppercase tracking-wider">Buscar Musculatura</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">{filteredMuscles.length} grupos mapeados</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Isquiotibiais, Quadríceps, Chute, Adutores..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-theme-primary transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer">
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
                      if (m.side === 'posterior') setViewSide('posterior');
                      if (m.side === 'anterior') setViewSide('anterior');
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

        {/* Right Column: Detailed Specification Sheet (5 Cols) */}
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

              {/* Recommended Exercises */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider">
                    <Dumbbell size={16} className="text-theme-primary" />
                    <span>Exercícios de Alto Rendimento</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedMuscle.exercises.map((ex, idx) => (
                    <div key={idx} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white">{ex.name}</span>
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border",
                          ex.type === 'Explosão' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                          ex.type === 'Força' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                          ex.type === 'Estabilidade' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                          "bg-purple-500/10 border-purple-500/30 text-purple-400"
                        )}>
                          {ex.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{ex.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prevention & Stretches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase">
                    <ShieldAlert size={14} />
                    <span>Prevenção de Lesões</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedMuscle.prevention}</p>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-black text-xs uppercase">
                    <Target size={14} />
                    <span>Alongamento Recomendado</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedMuscle.stretches}</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center text-zinc-400 space-y-3">
              <Info size={32} className="mx-auto text-theme-primary" />
              <p className="text-sm font-bold">Selecione um grupo muscular na figura humana para visualizar os detalhes anatômicos.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
