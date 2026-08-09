import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Ellipse, Arrow } from 'react-konva';
import { Play, Pause, RotateCcw, User, Disc, Hexagon, ArrowRight, Settings2, Shield, Info, Zap, Eye, EyeOff, Layout, Volume2, Sparkles, Tv, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { TrainingActivity } from '../types';
import { cn } from '../utils';

interface DrillVisualizerProps {
  activity: TrainingActivity;
  onChange?: (visualData: string) => void;
  isEditable?: boolean;
  executionSteps?: string[]; // Para narração do treino sincronizada com o playhead
}

interface VisualObject {
  id: string;
  type: 'cone' | 'player' | 'ball' | 'arrow' | 'barrier' | 'stake';
  x: number;
  y: number;
  toX?: number;
  toY?: number;
  team?: 'A' | 'B' | 'C' | 'D' | 'GK_A' | 'GK_B' | 'REF';
  label?: string;
  animate?: boolean;
  color?: string;
}

const FIELD_COLORS = {
  Futebol: '#14532d', // Deep grass green
  Futsal: '#0f172a',  // High-contrast dark blue court
  Vôlei: '#d97706',   // Classic court orange
  Basquete: '#7c2d12', // Hardwood reddish-brown
  'Futebol de Areia': '#eab308', // Sandy gold
  Outros: '#18181b'   // Modern matte dark gray
};

const TEAM_COLORS = {
  A: '#2563eb', // Team A: Vibrant Royal Blue
  B: '#dc2626', // Team B: Intense Red
  C: '#16a34a', // Team C: Forest Green
  D: '#facc15', // Team D: Gold Yellow
  GK_A: '#10b981', // Goalkeeper A: Emerald Green
  GK_B: '#f59e0b', // Goalkeeper B: Amber Gold
  REF: '#ec4899'  // Referee: Hot Pink
};

// Preset plays to showcase Globo-style tactical animation instantly!
const PRESET_PLAYS: Record<string, { name: string, description: string, modality: string, objects: VisualObject[] }> = {
  tikitaka: {
    name: 'Triangulação Tiki-Taka',
    description: 'Troca de passes rápidos em aproximação abrindo espaço na defesa.',
    modality: 'Futebol',
    objects: [
      { id: 'p1', type: 'player', x: 30, y: 65, team: 'A', label: '8', animate: true, toX: 42, toY: 55 },
      { id: 'p2', type: 'player', x: 45, y: 30, team: 'A', label: '10', animate: true, toX: 58, toY: 40 },
      { id: 'p3', type: 'player', x: 55, y: 70, team: 'A', label: '9', animate: true, toX: 70, toY: 52 },
      { id: 'b1', type: 'ball', x: 32, y: 65, animate: true, toX: 68, toY: 52 },
      { id: 'd1', type: 'player', x: 52, y: 48, team: 'B', label: '3', animate: true, toX: 60, toY: 52 }
    ]
  },
  cruzamento: {
    name: 'Cruzamento Fatal',
    description: 'Apoio lateral faz corrida de linha de fundo e cruza para cabeceio.',
    modality: 'Futebol',
    objects: [
      { id: 'p1', type: 'player', x: 45, y: 15, team: 'A', label: '7', animate: true, toX: 82, toY: 15 },
      { id: 'p2', type: 'player', x: 50, y: 50, team: 'A', label: '9', animate: true, toX: 82, toY: 48 },
      { id: 'd1', type: 'player', x: 70, y: 46, team: 'B', label: '4', animate: true, toX: 80, toY: 47 },
      { id: 'b1', type: 'ball', x: 47, y: 15, animate: true, toX: 82, toY: 48 }
    ]
  },
  contraataque: {
    name: 'Contra-Ataque Relâmpago',
    description: 'Lançamento longo em profundidade para atacante veloz isolar o goleiro.',
    modality: 'Futebol',
    objects: [
      { id: 'gk', type: 'player', x: 92, y: 50, team: 'B', label: 'GK', animate: false },
      { id: 'p1', type: 'player', x: 30, y: 50, team: 'A', label: '10', animate: true, toX: 45, toY: 50 },
      { id: 'p2', type: 'player', x: 40, y: 25, team: 'A', label: '11', animate: true, toX: 80, toY: 35 },
      { id: 'b1', type: 'ball', x: 32, y: 50, animate: true, toX: 78, toY: 35 }
    ]
  },
  saida_tres: {
    name: 'Saída de Três (Futsal)',
    description: 'Rodízio dinâmico com movimentação em losango abrindo ala oposto.',
    modality: 'Futsal',
    objects: [
      { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: 'F', animate: true, toX: 35, toY: 30 },
      { id: 'p2', type: 'player', x: 35, y: 20, team: 'A', label: 'A1', animate: true, toX: 65, toY: 25 },
      { id: 'p3', type: 'player', x: 35, y: 80, team: 'A', label: 'A2', animate: true, toX: 65, toY: 75 },
      { id: 'b1', type: 'ball', x: 22, y: 50, animate: true, toX: 63, toY: 75 }
    ]
  }
};

export default function DrillVisualizer({ activity, onChange, isEditable = true, executionSteps }: DrillVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [is3D, setIs3D] = useState(false); // Flat 2D view by default for crisp 100% field visibility
  
  // Timeline playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 0 to 100
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 1.5x, 2x
  const [isLooping, setIsLooping] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);

  const [objects, setObjects] = useState<VisualObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasLoadedDefault, setHasLoadedDefault] = useState(false);
  const [loadedActivityId, setLoadedActivityId] = useState<string | null>(null);

  const t = useMemo(() => {
    return currentTime / 100;
  }, [currentTime]);

  // Smooth playhead updater
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      // Base: go from 0 to 100 in approx 3.5 seconds at 1x speed.
      const increment = (delta * 0.028) * playbackSpeed;

      setCurrentTime(prev => {
        const next = prev + increment;
        if (next >= 100) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, isLooping]);

  const applyFormation = (formation: string) => {
    const formations: Record<string, {x: number, y: number, label: string, team: 'A' | 'B'}[]> = {
      '4-4-2': [
        // Team A (Attack - Blue)
        {x: 12, y: 50, label: 'GK', team: 'A'},
        {x: 28, y: 20, label: 'LD', team: 'A'}, {x: 25, y: 40, label: 'ZA', team: 'A'}, {x: 25, y: 60, label: 'ZA', team: 'A'}, {x: 28, y: 80, label: 'LE', team: 'A'},
        {x: 45, y: 20, label: 'MD', team: 'A'}, {x: 45, y: 38, label: 'VO', team: 'A'}, {x: 45, y: 62, label: 'VO', team: 'A'}, {x: 45, y: 80, label: 'ME', team: 'A'},
        {x: 68, y: 35, label: 'AT', team: 'A'}, {x: 68, y: 65, label: 'AT', team: 'A'},
        // Opponent Team B (Defense - Red)
        {x: 88, y: 50, label: 'GK', team: 'B'},
        {x: 78, y: 25, label: 'LD', team: 'B'}, {x: 75, y: 45, label: 'ZA', team: 'B'}, {x: 75, y: 55, label: 'ZA', team: 'B'}, {x: 78, y: 75, label: 'LE', team: 'B'}
      ],
      '4-3-3': [
        // Team A (Attack - Blue)
        {x: 12, y: 50, label: 'GK', team: 'A'},
        {x: 28, y: 20, label: 'LD', team: 'A'}, {x: 25, y: 40, label: 'ZA', team: 'A'}, {x: 25, y: 60, label: 'ZA', team: 'A'}, {x: 28, y: 80, label: 'LE', team: 'A'},
        {x: 45, y: 30, label: 'VO', team: 'A'}, {x: 48, y: 50, label: 'MC', team: 'A'}, {x: 45, y: 70, label: 'VO', team: 'A'},
        {x: 72, y: 20, label: 'PD', team: 'A'}, {x: 75, y: 50, label: 'CA', team: 'A'}, {x: 72, y: 80, label: 'PE', team: 'A'},
        // Opponent Team B (Defense - Red)
        {x: 88, y: 50, label: 'GK', team: 'B'},
        {x: 78, y: 20, label: 'LD', team: 'B'}, {x: 76, y: 40, label: 'ZA', team: 'B'}, {x: 76, y: 60, label: 'ZA', team: 'B'}, {x: 78, y: 80, label: 'LE', team: 'B'}
      ],
      '3-5-2': [
        // Team A (Attack - Blue)
        {x: 12, y: 50, label: 'GK', team: 'A'},
        {x: 25, y: 30, label: 'ZA', team: 'A'}, {x: 23, y: 50, label: 'ZC', team: 'A'}, {x: 25, y: 70, label: 'ZA', team: 'A'},
        {x: 42, y: 15, label: 'AL', team: 'A'}, {x: 45, y: 35, label: 'VO', team: 'A'}, {x: 48, y: 50, label: 'MC', team: 'A'}, {x: 45, y: 65, label: 'VO', team: 'A'}, {x: 42, y: 85, label: 'AL', team: 'A'},
        {x: 68, y: 38, label: 'AT', team: 'A'}, {x: 68, y: 62, label: 'AT', team: 'A'},
        // Opponent Team B (Defense - Red)
        {x: 88, y: 50, label: 'GK', team: 'B'},
        {x: 78, y: 30, label: 'ZA', team: 'B'}, {x: 75, y: 50, label: 'ZA', team: 'B'}, {x: 78, y: 70, label: 'ZA', team: 'B'}
      ]
    };

    const template = formations[formation];
    if (!template) return;

    const newPlayers: VisualObject[] = template.map(p => ({
      id: Math.random().toString(36).substr(2, 9),
      type: 'player',
      x: p.x,
      y: p.y,
      label: p.label,
      team: p.team
    }));

    const nextObjects = [...objects.filter(o => o.type !== 'player'), ...newPlayers];
    handleUpdate(nextObjects);
    toast.success(`Esquema ${formation} com adversários aplicado!`);
  };

  const loadPreset = (presetKey: string) => {
    const preset = PRESET_PLAYS[presetKey];
    if (!preset) return;
    handleUpdate(preset.objects);
    setIsPlaying(false);
    setCurrentTime(0);
    toast.success(`Jogada "${preset.name}" carregada com sucesso! Clique em Play.`);
  };

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0) return;

        const availW = Math.max(260, width - 8);
        const availH = height > 120 ? Math.max(180, height - 8) : availW / 1.62;

        const targetAspect = 1.62;

        let stageW = availW;
        let stageH = stageW / targetAspect;

        if (stageH > availH) {
          stageH = availH;
          stageW = stageH * targetAspect;
        }

        setDimensions({ width: Math.floor(stageW), height: Math.floor(stageH) });
      }
    });

    const targetEl = stageContainerRef.current || containerRef.current;
    if (targetEl) {
      observer.observe(targetEl);
    }

    return () => observer.disconnect();
  }, []);

const getDefaultDemoForModality = (modality?: string): VisualObject[] => {
  const mod = modality || 'Futebol';
  switch (mod) {
    case 'Futsal':
      return [
        { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: 'F', animate: true, toX: 35, toY: 30 },
        { id: 'p2', type: 'player', x: 35, y: 20, team: 'A', label: 'A1', animate: true, toX: 65, toY: 25 },
        { id: 'p3', type: 'player', x: 35, y: 80, team: 'A', label: 'A2', animate: true, toX: 65, toY: 75 },
        { id: 'b1', type: 'ball', x: 22, y: 50, animate: true, toX: 63, toY: 75 }
      ];
    case 'Vôlei':
      return [
        { id: 'p1', type: 'player', x: 20, y: 20, team: 'A', label: '1', animate: true, toX: 25, toY: 25 },
        { id: 'p2', type: 'player', x: 20, y: 50, team: 'A', label: '6', animate: true, toX: 25, toY: 50 },
        { id: 'p3', type: 'player', x: 20, y: 80, team: 'A', label: '5', animate: true, toX: 25, toY: 75 },
        { id: 'p4', type: 'player', x: 40, y: 30, team: 'A', label: '2', animate: true, toX: 45, toY: 35 },
        { id: 'p5', type: 'player', x: 40, y: 70, team: 'A', label: '4', animate: true, toX: 45, toY: 65 },
        { id: 'p6', type: 'player', x: 45, y: 50, team: 'A', label: '3', animate: true, toX: 48, toY: 50 },
        { id: 'arr1', type: 'arrow', x: 45, y: 50, toX: 55, toY: 50, color: '#f87171' }
      ];
    case 'Basquete':
      return [
        { id: 'c1', type: 'cone', x: 20, y: 20 },
        { id: 'c2', type: 'cone', x: 30, y: 30 },
        { id: 'c3', type: 'cone', x: 20, y: 40 },
        { id: 'p1', type: 'player', x: 10, y: 10, team: 'A', animate: true, toX: 80, toY: 50 },
        { id: 'b1', type: 'ball', x: 12, y: 10, animate: true, toX: 85, toY: 50 }
      ];
    case 'Futebol de Areia':
      return [
        { id: 'p1', type: 'player', x: 50, y: 80, team: 'A', label: '1', animate: true, toX: 50, toY: 40 },
        { id: 'p2', type: 'player', x: 20, y: 40, team: 'A', label: '2', animate: true, toX: 45, toY: 40 },
        { id: 'b1', type: 'ball', x: 22, y: 40, animate: true, toX: 48, toY: 40 }
      ];
    case 'Futebol':
    default:
      return [
        { id: 'p1', type: 'player', x: 30, y: 65, team: 'A', label: '8', animate: true, toX: 42, toY: 55 },
        { id: 'p2', type: 'player', x: 45, y: 30, team: 'A', label: '10', animate: true, toX: 58, toY: 40 },
        { id: 'p3', type: 'player', x: 55, y: 70, team: 'A', label: '9', animate: true, toX: 70, toY: 52 },
        { id: 'b1', type: 'ball', x: 32, y: 65, animate: true, toX: 68, toY: 52 },
        { id: 'd1', type: 'player', x: 52, y: 48, team: 'B', label: '3', animate: true, toX: 60, toY: 52 }
      ];
  }
};

  // Track updates to prevent recursive loops
  const lastUpdateRef = useRef<string>('');

  useEffect(() => {
    if (loadedActivityId !== activity?.id) {
      setLoadedActivityId(activity?.id || null);
      setHasLoadedDefault(false);
      return;
    }

    if (activity?.visualData && activity.visualData !== '[]' && activity.visualData !== '""') {
      if (activity.visualData !== lastUpdateRef.current) {
        try {
          const data = JSON.parse(activity.visualData);
          setObjects(data);
          lastUpdateRef.current = activity.visualData;
        } catch (e) {
          console.error("Failed to parse visualData", e);
        }
      }
    } else if (!hasLoadedDefault && (!activity?.visualData || activity.visualData === '[]' || activity.visualData === '""')) {
      const defaultDemo = getDefaultDemoForModality(activity?.modality);
      setObjects(defaultDemo);
      setHasLoadedDefault(true);
      if (isEditable && onChange) {
        onChange(JSON.stringify(defaultDemo));
      }
    }
  }, [activity, isEditable, hasLoadedDefault, loadedActivityId, onChange]);

  const handleUpdate = (newObjects: VisualObject[]) => {
    setObjects(newObjects);
    const json = JSON.stringify(newObjects);
    lastUpdateRef.current = json;
    onChange?.(json);
  };

  const { width: w, height: h } = dimensions;
  const fieldBorder = 24;
  const fw = w - fieldBorder * 2;
  const fh = h - fieldBorder * 2;

  // Mathematically correct coordinate mapping (SOLVES DRAG-JUMPING BUG)
  const handleDragEnd = (id: string, isTarget: boolean, e: any) => {
    if (!isEditable) return;
    const { x, y } = e.currentTarget.position();
    
    // Map absolute stage coordinates back to 0-100 percentages
    const nx = Math.max(0, Math.min(100, ((x - fieldBorder) / fw) * 100));
    const ny = Math.max(0, Math.min(100, ((y - fieldBorder) / fh) * 100));

    const newObjects = objects.map(obj => {
      if (obj.id === id) {
        if (isTarget) {
          return { ...obj, toX: nx, toY: ny, animate: true };
        } else {
          // If starting position moves, we shift the destination as well to maintain vector offset
          const dx = nx - obj.x;
          const dy = ny - obj.y;
          const updatedToX = obj.toX !== undefined ? Math.max(0, Math.min(100, obj.toX + dx)) : nx;
          const updatedToY = obj.toY !== undefined ? Math.max(0, Math.min(100, obj.toY + dy)) : ny;
          return { 
            ...obj, 
            x: nx, 
            y: ny, 
            toX: obj.toX !== undefined ? updatedToX : undefined, 
            toY: obj.toY !== undefined ? updatedToY : undefined 
          };
        }
      }
      return obj;
    });
    handleUpdate(newObjects);
  };

  const addObject = (type: VisualObject['type'], customTeam?: 'A' | 'B' | 'C' | 'D' | 'GK_A' | 'GK_B' | 'REF') => {
    const defaultLabel = (() => {
      if (type !== 'player') return '';
      if (customTeam === 'GK_A') return 'G1';
      if (customTeam === 'GK_B') return 'G2';
      if (customTeam === 'REF') return 'AR';
      return (objects.filter(o => o.type === 'player' && o.team === (customTeam || 'A')).length + 1).toString();
    })();

    const startX = Math.round(30 + Math.random() * 30);
    const startY = Math.round(25 + Math.random() * 45);

    const newObj: VisualObject = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: startX,
      y: startY,
      label: defaultLabel,
      team: customTeam || 'A',
      color: type === 'arrow' ? '#3b82f6' : undefined
    };

    if (type === 'ball' || type === 'player' || type === 'arrow') {
      newObj.animate = true;
      newObj.toX = Math.min(95, startX + 16);
      newObj.toY = Math.min(95, startY + Math.round(Math.random() * 8 - 4));
    }

    const newObjects = [...objects, newObj];
    handleUpdate(newObjects);
    setSelectedId(newObj.id);
    
    // Reset playhead for precise visual alignments
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const updateObject = (id: string, updates: Partial<VisualObject>) => {
    const newObjects = objects.map(obj => obj.id === id ? { ...obj, ...updates } : obj);
    handleUpdate(newObjects);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const newObjects = objects.filter(o => o.id !== selectedId);
    handleUpdate(newObjects);
    setSelectedId(null);
  };

  const renderField = () => {
    const bgColor = FIELD_COLORS[activity.modality as keyof typeof FIELD_COLORS] || FIELD_COLORS.Outros;
    const lineStroke = "#ffffff";
    
    return (
      <Group>
        {/* Pitch outer canvas */}
        <Rect x={0} y={0} width={w} height={h} fill="#0b0f17" cornerRadius={16} />
        
        {/* Pitch boundary with glowing color */}
        <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} fill={bgColor} stroke={lineStroke} strokeWidth={2.5} opacity={0.95} shadowBlur={8} shadowColor="#000" />
        
        {/* Tactical grid markings for elite Globo TV style */}
        <Group opacity={0.1}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Line key={`v-${i}`} points={[fieldBorder + fw * ((i + 1) * 0.1), fieldBorder, fieldBorder + fw * ((i + 1) * 0.1), fieldBorder + fh]} stroke={lineStroke} strokeWidth={1} dash={[5, 5]} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <Line key={`h-${i}`} points={[fieldBorder, fieldBorder + fh * ((i + 1) * 0.2), fieldBorder + fw, fieldBorder + fh * ((i + 1) * 0.2)]} stroke={lineStroke} strokeWidth={1} dash={[5, 5]} />
          ))}
        </Group>

        {activity.modality === 'Futebol' && (
          <Group opacity={0.92}>
            {/* Goal Posts & Nets */}
            <Rect x={fieldBorder - 12} y={fieldBorder + fh * 0.36} width={12} height={fh * 0.28} stroke={lineStroke} strokeWidth={2.5} fill="rgba(255,255,255,0.2)" cornerRadius={[4, 0, 0, 4]} />
            <Rect x={fieldBorder + fw} y={fieldBorder + fh * 0.36} width={12} height={fh * 0.28} stroke={lineStroke} strokeWidth={2.5} fill="rgba(255,255,255,0.2)" cornerRadius={[0, 4, 4, 0]} />

            {/* Center line and circle */}
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2.5} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.09} stroke={lineStroke} strokeWidth={2.5} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={3.5} fill={lineStroke} />
            
            {/* Left penalty box */}
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.22} width={fw * 0.165} height={fh * 0.56} stroke={lineStroke} strokeWidth={2.5} />
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.35} width={fw * 0.055} height={fh * 0.3} stroke={lineStroke} strokeWidth={2.5} />
            <Circle x={fieldBorder + fw * 0.11} y={fieldBorder + fh * 0.5} radius={3.5} fill={lineStroke} />
            
            {/* Right penalty box */}
            <Rect x={fieldBorder + fw - fw * 0.165} y={fieldBorder + fh * 0.22} width={fw * 0.165} height={fh * 0.56} stroke={lineStroke} strokeWidth={2.5} />
            <Rect x={fieldBorder + fw - fw * 0.055} y={fieldBorder + fh * 0.35} width={fw * 0.055} height={fh * 0.3} stroke={lineStroke} strokeWidth={2.5} />
            <Circle x={fieldBorder + fw - fw * 0.11} y={fieldBorder + fh * 0.5} radius={3.5} fill={lineStroke} />

            {/* Penalty arcs (Meia-lua fora da área) */}
            <Group clipFunc={(ctx) => {
              ctx.rect(fieldBorder + fw * 0.165, 0, fw + fieldBorder, h);
            }}>
              <Circle x={fieldBorder + fw * 0.11} y={fieldBorder + fh * 0.5} radius={fw * 0.08} stroke={lineStroke} strokeWidth={2.5} />
            </Group>
            <Group clipFunc={(ctx) => {
              ctx.rect(0, 0, fieldBorder + fw - fw * 0.165, h);
            }}>
              <Circle x={fieldBorder + fw - fw * 0.11} y={fieldBorder + fh * 0.5} radius={fw * 0.08} stroke={lineStroke} strokeWidth={2.5} />
            </Group>
          </Group>
        )}

        {activity.modality === 'Futsal' && (
           <Group opacity={0.92}>
             <Rect x={fieldBorder - 10} y={fieldBorder + fh * 0.36} width={10} height={fh * 0.28} stroke={lineStroke} strokeWidth={2.5} fill="rgba(255,255,255,0.2)" cornerRadius={[3, 0, 0, 3]} />
             <Rect x={fieldBorder + fw} y={fieldBorder + fh * 0.36} width={10} height={fh * 0.28} stroke={lineStroke} strokeWidth={2.5} fill="rgba(255,255,255,0.2)" cornerRadius={[0, 3, 3, 0]} />
             <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2.5} />
             <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.12} stroke={lineStroke} strokeWidth={2.5} />
             {/* Six-meter lines */}
             <Rect x={fieldBorder} y={fieldBorder + fh * 0.28} width={fw * 0.15} height={fh * 0.44} stroke={lineStroke} strokeWidth={2.5} cornerRadius={[0, 40, 40, 0]} />
             <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.28} width={fw * 0.15} height={fh * 0.44} stroke={lineStroke} strokeWidth={2.5} cornerRadius={[40, 0, 0, 40]} />
           </Group>
        )}

        {activity.modality === 'Vôlei' && (
           <Group opacity={0.45}>
             {/* Center Net Line */}
             <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke={lineStroke} strokeWidth={4} />
             {/* Attack lines (3-meter lines) */}
             <Line points={[fieldBorder + fw * 0.33, fieldBorder, fieldBorder + fw * 0.33, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2} dash={[4, 2]} />
             <Line points={[fieldBorder + fw * 0.66, fieldBorder, fieldBorder + fw * 0.66, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2} dash={[4, 2]} />
           </Group>
        )}

        {activity.modality === 'Basquete' && (
           <Group opacity={0.45}>
             <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2} />
             <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.1} stroke={lineStroke} strokeWidth={2} />
             
             {/* 3-Point Arcs */}
             <Ellipse x={fieldBorder} y={fieldBorder + fh * 0.5} radiusX={fw * 0.25} radiusY={fh * 0.42} stroke={lineStroke} strokeWidth={2} clipFunc={(ctx) => {
               ctx.rect(fieldBorder, fieldBorder, fw * 0.25, fh);
             }} />
             <Ellipse x={fieldBorder + fw} y={fieldBorder + fh * 0.5} radiusX={fw * 0.25} radiusY={fh * 0.42} stroke={lineStroke} strokeWidth={2} clipFunc={(ctx) => {
               ctx.rect(fieldBorder + fw - fw * 0.25, fieldBorder, fw * 0.25, fh);
             }} />

             {/* Keys */}
             <Rect x={fieldBorder} y={fieldBorder + fh * 0.38} width={fw * 0.15} height={fh * 0.24} stroke={lineStroke} strokeWidth={2} />
             <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.38} width={fw * 0.15} height={fh * 0.24} stroke={lineStroke} strokeWidth={2} />
           </Group>
        )}
      </Group>
    );
  };

  const renderTrailsAndTargets = () => {
    const trails: React.ReactNode[] = [];

    objects.forEach((obj) => {
      const ox = fieldBorder + (obj.x / 100) * fw;
      const oy = fieldBorder + (obj.y / 100) * fh;
      const isSelected = selectedId === obj.id;
      const teamColor = obj.type === 'player' ? TEAM_COLORS[obj.team || 'A'] : (obj.type === 'ball' ? '#ffffff' : '#fb923c');

      const hasPath = obj.animate && obj.toX !== undefined && obj.toY !== undefined;

      // 1. Draw static background movement trail
      if (hasPath && showTrails) {
        const tx = fieldBorder + (Number(obj.toX) / 100) * fw;
        const ty = fieldBorder + (Number(obj.toY) / 100) * fh;

        trails.push(
          <Group key={`trail-${obj.id}`}>
            <Arrow 
              points={[ox, oy, tx, ty]} 
              stroke={teamColor} 
              strokeWidth={obj.type === 'ball' ? 1.5 : 2.5} 
              opacity={0.35} 
              dash={obj.type === 'ball' ? [4, 4] : [8, 4]} 
              pointerLength={7}
              pointerWidth={7}
              fill={teamColor}
            />
          </Group>
        );
      }

      // 2. Draw destination interactive handles (when selected & editable)
      if (isSelected && isEditable && hasPath && obj.toX !== undefined && obj.toY !== undefined) {
        const tox = fieldBorder + (obj.toX / 100) * fw;
        const toy = fieldBorder + (obj.toY / 100) * fh;

        trails.push(
          <Group 
            key={`target-handle-${obj.id}`} 
            x={tox} 
            y={toy}
            draggable 
            onDragStart={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onDragEnd={(e) => handleDragEnd(obj.id, true, e)}
          >
            {/* Glowing target halo */}
            <Circle x={0} y={0} radius={fw * 0.024} fill={teamColor} opacity={0.2} stroke="#fff" strokeWidth={1} dash={[3, 3]} />
            <Circle x={0} y={0} radius={fw * 0.015} fill="#0f172a" stroke={teamColor} strokeWidth={2} />
            
            {/* Target flag letter */}
            <Text 
              x={-10} 
              y={-4} 
              text="FIM" 
              fontSize={fw * 0.012} 
              fill={teamColor} 
              fontStyle="bold" 
              align="center" 
              width={20} 
            />
          </Group>
        );
      }
    });

    return trails;
  };

  const renderDrillObjects = () => {
    const result: React.ReactNode[] = [];

    objects.forEach((obj) => {
      const ox = fieldBorder + (obj.x / 100) * fw;
      const oy = fieldBorder + (obj.y / 100) * fh;
      const isSelected = selectedId === obj.id;

      let currentX = ox;
      let currentY = oy;
      let ballHeight = 0;
      let playerBob = 0;

      const hasPath = obj.animate && obj.toX !== undefined && obj.toY !== undefined;

      if (hasPath) {
        const targetX = Number(obj.toX);
        const targetY = Number(obj.toY);
        const startX = Number(obj.x);
        const startY = Number(obj.y);
        
        const dx = (targetX - startX) * t;
        const dy = (targetY - startY) * t;
        currentX = fieldBorder + ((startX + dx) / 100) * fw;
        currentY = fieldBorder + ((startY + dy) / 100) * fh;

        if (obj.type === 'ball') {
          // Parabola 3D realista
          ballHeight = Math.sin(Math.PI * t) * (is3D ? 35 : 12);
          currentY = currentY - ballHeight;
        } else if (obj.type === 'player' && isPlaying) {
          // Bobbing realista ao correr
          playerBob = Math.abs(Math.sin(currentTime * 0.18)) * (is3D ? 4 : 1.8);
          currentY = currentY - playerBob;
        }
      }

      let element: any = null;

      switch (obj.type) {
        case 'cone':
          element = (
            <Group>
              {/* Cone Shadow */}
              <Ellipse 
                x={0} 
                y={6} 
                radiusX={fw * 0.016} 
                radiusY={fw * 0.007} 
                fill="#000" 
                opacity={0.3}
              />
              {/* Cone Body */}
              <Line 
                points={[
                  -(fw * 0.012), 4,
                  0, -(fw * 0.022),
                  (fw * 0.012), 4
                ]} 
                fill="#f97316" 
                stroke="#fff" 
                strokeWidth={0.5} 
                closed 
              />
              {/* White stripe */}
              <Line 
                points={[
                  -(fw * 0.006), -2,
                  (fw * 0.006), -2,
                  (fw * 0.004), -9,
                  -(fw * 0.004), -9
                ]} 
                fill="#ffffff" 
                closed 
                opacity={0.9} 
              />
            </Group>
          );
          break;
        case 'barrier':
          element = (
            <Group>
              <Rect x={-15} y={-4} width={30} height={8} fill="#f1f5f9" stroke="#475569" strokeWidth={1.5} cornerRadius={2} />
              <Line points={[-12, -4, -12, 6]} stroke="#475569" strokeWidth={1.5} />
              <Line points={[12, -4, 12, 6]} stroke="#475569" strokeWidth={1.5} />
            </Group>
          );
          break;
        case 'stake':
          element = (
            <Group>
              <Circle x={0} y={0} radius={fw * 0.01} fill="#eab308" stroke="#1e293b" strokeWidth={1.5} />
              <Circle x={0} y={0} radius={2} fill="#ffffff" />
            </Group>
          );
          break;
        case 'player':
          const teamColor = TEAM_COLORS[obj.team || 'A'];
          const r = fw * 0.024; // Base responsive sizing token
          
          // Rotate player direction indicators if a movement path is defined
          let playerAngle = 0;
          if (hasPath) {
            const tx = fieldBorder + (Number(obj.toX) / 100) * fw;
            const ty = fieldBorder + (Number(obj.toY) / 100) * fh;
            playerAngle = Math.atan2(ty - oy, tx - ox) * (180 / Math.PI);
          }

          element = (
            <Group>
              {/* Globo-Style Neon Selection Ring under the boneco */}
              {isSelected && (
                <Ellipse 
                  x={0} 
                  y={6} 
                  radiusX={r * 1.5} 
                  radiusY={r * 0.7} 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dash={[4, 2]}
                  shadowBlur={8}
                  shadowColor="#10b981"
                  shadowOpacity={0.9}
                />
              )}

              {/* Realistic Ground Shadow that scales/moves with bobbing */}
              <Ellipse 
                x={0} 
                y={playerBob + 7} 
                radiusX={r * 1.25} 
                radiusY={r * 0.45} 
                fill="#000000" 
                opacity={Math.max(0.12, 0.38 - (playerBob * 0.04))} 
              />

              {/* Glowing Tactical Direct Path Pointer - Electronic Pen effect */}
              {hasPath && (
                <Group rotation={playerAngle}>
                  <Line
                    points={[r * 1.1, 0, r * 2.2, 0]}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    opacity={0.85}
                  />
                  <Line
                    points={[r * 1.8, -4, r * 2.2, 0, r * 1.8, 4]}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    closed
                    opacity={0.85}
                  />
                </Group>
              )}

              {/* 3D Weighted figurine base ring (Subbuteo pedestal effect) */}
              <Ellipse
                x={0}
                y={5}
                radiusX={r * 0.95}
                radiusY={r * 0.42}
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth={1.5}
              />
              <Ellipse
                x={0}
                y={3}
                radiusX={r * 0.95}
                radiusY={r * 0.42}
                fill="#334155"
                stroke="#475569"
                strokeWidth={1}
              />

              {/* Standing Figurine Torso (Jersey Body) */}
              <Line
                points={[
                  -r * 0.75, 3,
                  -r * 0.42, -r * 1.0,
                  r * 0.42, -r * 1.0,
                  r * 0.75, 3
                ]}
                fill={teamColor}
                stroke="#0f172a"
                strokeWidth={1.5}
                closed
              />

              {/* Custom High-Fidelity Team Uniform Graphics */}
              {obj.team === 'A' && (
                <Line
                  points={[-r * 0.42, -r * 1.0, r * 0.65, 1.5]}
                  stroke="#ffffff"
                  strokeWidth={r * 0.25}
                  opacity={0.4}
                />
              )}
              {obj.team === 'B' && (
                <Line
                  points={[-r * 0.58, -r * 0.3, r * 0.58, -r * 0.3]}
                  stroke="#ffffff"
                  strokeWidth={r * 0.3}
                  opacity={0.4}
                />
              )}
              {obj.team === 'REF' && (
                <Group opacity={0.35}>
                  <Line points={[-r * 0.2, -r * 1.0, -r * 0.2, 3]} stroke="#ffffff" strokeWidth={2} />
                  <Line points={[0, -r * 1.0, 0, 3]} stroke="#ffffff" strokeWidth={2} />
                  <Line points={[r * 0.2, -r * 1.0, r * 0.2, 3]} stroke="#ffffff" strokeWidth={2} />
                </Group>
              )}
              {(obj.team === 'GK_A' || obj.team === 'GK_B') && (
                <Group opacity={0.35}>
                  <Line points={[-r * 0.6, 0, -r * 0.45, -r * 0.5]} stroke="#ffffff" strokeWidth={3} />
                  <Line points={[r * 0.6, 0, r * 0.45, -r * 0.5]} stroke="#ffffff" strokeWidth={3} />
                </Group>
              )}

              {/* Figurine Shirt Collar Outline */}
              <Line
                points={[-r * 0.18, -r * 1.0, 0, -r * 0.75, r * 0.18, -r * 1.0]}
                stroke="#0f172a"
                strokeWidth={1.2}
                opacity={0.7}
              />

              {/* Standing Figurine Human Head (Boneco effect) */}
              <Circle
                x={0}
                y={-r * 1.3}
                radius={r * 0.3}
                fill="#fdb388"
                stroke="#0f172a"
                strokeWidth={1.2}
              />
              <Ellipse
                x={0}
                y={-r * 1.5}
                radiusX={r * 0.25}
                radiusY={r * 0.12}
                fill="#374151"
              />

              {/* Player Number/Label on the Chest */}
              <Text 
                x={-r} 
                y={-r * 0.6} 
                text={obj.label || ''} 
                fontSize={r * 0.52} 
                fill={obj.team === 'D' ? '#0f172a' : '#ffffff'} 
                fontStyle="bold" 
                align="center" 
                width={r * 2} 
                shadowBlur={1}
                shadowColor={obj.team === 'D' ? '#ffffff' : '#000000'}
                shadowOpacity={0.8}
              />
            </Group>
          );
          break;
        case 'ball':
          element = (
            <Group>
              {/* Sombra projetada no chão que fica para trás conforme a bola sobe */}
              <Circle 
                x={0} 
                y={ballHeight + 3} 
                radius={Math.max(fw * 0.005, fw * 0.015 - ballHeight * 0.1)} 
                fill="#000000" 
                opacity={Math.max(0.08, 0.35 - (ballHeight * 0.006))} 
              />
              
              {/* Corpo da Bola, aumenta ligeiramente de tamanho para simular proximidade (3D) */}
              <Circle 
                x={0} 
                y={0} 
                radius={fw * 0.015 + (ballHeight * 0.08)} 
                fill="#ffffff" 
                stroke="#0f172a" 
                strokeWidth={1.5} 
                shadowBlur={3} 
                shadowColor="#000"
                shadowOpacity={0.3}
              />
              {/* Pentágonos clássicos de futebol adaptados ao tamanho */}
              <Circle x={0} y={0} radius={fw * 0.005 + (ballHeight * 0.02)} fill="#000000" />
              <Line points={[0, -(fw * 0.005 + (ballHeight * 0.02)), 0, -(fw * 0.015 + (ballHeight * 0.08))]} stroke="#000" strokeWidth={1} />
              <Line points={[-(fw * 0.004 + (ballHeight * 0.015)), (fw * 0.002 + (ballHeight * 0.01)), -(fw * 0.012 + (ballHeight * 0.06)), (fw * 0.009 + (ballHeight * 0.045))]} stroke="#000" strokeWidth={1} />
              <Line points={[(fw * 0.004 + (ballHeight * 0.015)), (fw * 0.002 + (ballHeight * 0.01)), (fw * 0.012 + (ballHeight * 0.06)), (fw * 0.009 + (ballHeight * 0.045))]} stroke="#000" strokeWidth={1} />
            </Group>
          );
          break;
        case 'arrow':
          const dx = (obj.toX! - obj.x) / 100 * fw;
          const dy = (obj.toY! - obj.y) / 100 * fh;
          element = (
            <Arrow 
              points={[0, 0, dx, dy]} 
              stroke={obj.color || '#3b82f6'} 
              fill={obj.color || '#3b82f6'} 
              strokeWidth={3.5} 
              pointerLength={10} 
              pointerWidth={10} 
              opacity={0.75} 
            />
          );
          break;
      }

      // Render the draggable element (SOLVES DRAG-JUMPING BUG BY DRAGGING GROUP DIRECTLY)
      result.push(
        <Group 
          key={obj.id} 
          x={currentX}
          y={currentY}
          draggable={isEditable} 
          onDragStart={() => {
            // Force reset timelines on drag start to prevent offsets
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onDragEnd={(e) => handleDragEnd(obj.id, false, e)}
          onClick={(e) => {
            if (!isEditable) return;
            e.cancelBubble = true;
            setSelectedId(obj.id);
          }}
        >
          {element}
          {isSelected && isEditable && (
            <Circle 
              x={0} 
              y={0} 
              radius={fw * 0.04} 
              stroke="#ffffff" 
              strokeWidth={1.5} 
              dash={[4, 2]} 
              opacity={0.8}
            />
          )}
        </Group>
      );
    });

    return result;
  };

  const selectedObject = objects.find(o => o.id === selectedId);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[420px] bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xl flex flex-col p-2 gap-2 select-none overflow-hidden relative">
      {/* Top Editing Toolbar (In Flow so it doesn't obscure the field) */}
      {isEditable && (
        <div className="w-full shrink-0 z-20 flex flex-col gap-1.5">
          <div className="bg-zinc-900/90 border border-zinc-800/80 p-1.5 sm:p-2 rounded-xl shadow-lg flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
              {/* Main item insertion buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => addObject('player', 'A')} className="p-1.5 sm:p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <User size={12} className="fill-current" /> Azul
                </button>
                <button type="button" onClick={() => addObject('player', 'B')} className="p-1.5 sm:p-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <User size={12} className="fill-current" /> Vermelho
                </button>
                <button type="button" onClick={() => addObject('player', 'GK_A')} className="p-1.5 sm:p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <Shield size={12} /> Goleiro
                </button>
                <button type="button" onClick={() => addObject('ball')} className="p-1.5 sm:p-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white hover:text-black transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <Disc size={12} /> Bola
                </button>
                <button type="button" onClick={() => addObject('cone')} className="p-1.5 sm:p-2 bg-orange-600/15 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <Hexagon size={12} /> Cone
                </button>
                <button type="button" onClick={() => addObject('barrier')} className="p-1.5 sm:p-2 bg-zinc-700/20 text-zinc-300 border border-zinc-700/40 rounded-lg hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <Shield size={12} /> Barreira
                </button>
                <button type="button" onClick={() => addObject('arrow')} className="p-1.5 sm:p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap cursor-pointer">
                  <ArrowRight size={12} /> Vetor
                </button>
              </div>

              <div className="w-px h-4 bg-zinc-800 shrink-0 mx-0.5" />

              {/* Formations, Clear & Collapse */}
              <div className="flex items-center gap-1 shrink-0">
                {(['4-4-2', '4-3-3', '3-5-2'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => applyFormation(f)}
                    className="px-1.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded text-[8px] font-black transition-all border border-zinc-800 cursor-pointer"
                  >
                    {f}
                  </button>
                ))}
                <button 
                  type="button" 
                  onClick={() => { if(confirm("Limpar esquema tático?")) { handleUpdate([]); setSelectedId(null); } }} 
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/30"
                  title="Limpar Tudo"
                >
                  <RotateCcw size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                  title={isToolbarOpen ? "Ocultar Painel de Jogadas" : "Exibir Painel de Jogadas"}
                >
                  {isToolbarOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {/* Extended presets & property inspector */}
            {isToolbarOpen && (
              <div className="flex flex-col sm:flex-row gap-1.5 pt-1 border-t border-zinc-800/80 animate-in fade-in duration-200">
                {/* Preset plays */}
                <div className="flex-1 flex items-center gap-1.5 p-1 bg-zinc-950/60 border border-zinc-800/80 rounded-lg min-w-0">
                  <Layout size={13} className="text-emerald-500 ml-1 shrink-0" />
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Jogadas Globo:</span>
                  <div className="flex gap-1 overflow-x-auto no-scrollbar w-full">
                    {Object.keys(PRESET_PLAYS).map((key) => {
                      const preset = PRESET_PLAYS[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => loadPreset(key)}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[8px] font-bold whitespace-nowrap border border-zinc-700/60 transition-all cursor-pointer"
                          title={preset.description}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Item Editor */}
                <div className="flex-1 flex items-center gap-1.5 p-1 bg-zinc-950/60 border border-zinc-800/80 rounded-lg min-h-[30px] min-w-0">
                  {selectedObject ? (
                    <div className="flex items-center gap-2 w-full animate-in fade-in transition-all">
                      <Settings2 size={13} className="text-theme-primary ml-1 shrink-0" />
                      
                      {selectedObject.type === 'player' && (
                        <>
                          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg shrink-0 overflow-x-auto max-w-[130px] no-scrollbar">
                            {(['A', 'B', 'GK_A', 'GK_B', 'REF'] as const).map(team => (
                              <button
                                key={team}
                                type="button"
                                onClick={() => updateObject(selectedObject.id, { team })}
                                className={cn(
                                  "w-3.5 h-3.5 rounded transition-all border shrink-0 cursor-pointer",
                                  selectedObject.team === team ? "border-white scale-110" : "border-transparent opacity-40"
                                )}
                                style={{ backgroundColor: TEAM_COLORS[team] }}
                              />
                            ))}
                          </div>
                          <input 
                            type="text" 
                            maxLength={3}
                            placeholder="Nº"
                            value={selectedObject.label || ''}
                            onChange={(e) => updateObject(selectedObject.id, { label: e.target.value.toUpperCase() })}
                            className="w-8 h-5 bg-black/40 border border-zinc-800 rounded text-center text-[10px] font-bold text-white focus:ring-1 focus:ring-theme-primary"
                          />
                        </>
                      )}

                      {(selectedObject.type === 'player' || selectedObject.type === 'ball') && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextAnimate = !selectedObject.animate;
                            updateObject(selectedObject.id, { 
                              animate: nextAnimate,
                              toX: nextAnimate ? selectedObject.x + 10 : undefined,
                              toY: nextAnimate ? selectedObject.y + 10 : undefined
                            });
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer",
                            selectedObject.animate ? "bg-theme-primary text-black" : "bg-zinc-800 text-zinc-500"
                          )}
                        >
                          <Play size={8} fill={selectedObject.animate ? "currentColor" : "none"} />
                          {selectedObject.animate ? "Móvel" : "Fixo"}
                        </button>
                      )}

                      <button 
                        type="button"
                        onClick={removeSelected}
                        className="ml-auto px-1.5 py-0.5 text-red-400 hover:bg-red-500/15 rounded text-[8px] font-bold transition-all cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 text-zinc-500 italic text-[8px] uppercase font-bold tracking-widest">
                      <Info size={11} /> Clique num item para configurar
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dedicated Unobstructed Stage Container */}
      <div ref={stageContainerRef} className="flex-1 w-full min-h-[220px] flex items-center justify-center relative overflow-hidden bg-zinc-950/90 rounded-xl border border-zinc-800/80 p-1">
        <div
          style={is3D ? {
            transform: 'rotateX(22deg) rotateY(0deg) rotateZ(0deg) scale(0.95)',
            transformStyle: 'preserve-3d',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(16, 185, 129, 0.15)',
            borderRadius: '16px'
          } : {
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            borderRadius: '16px'
          }}
          className="overflow-hidden border border-zinc-800/90 shadow-2xl bg-zinc-950 relative shrink-0"
        >
          <Stage 
            width={w} 
            height={h} 
            onClick={() => isEditable && setSelectedId(null)}
          >
            <Layer>
              {renderField()}
              {renderTrailsAndTargets()}
              {renderDrillObjects()}
            </Layer>
          </Stage>

          {objects.length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[1.5px] rounded-2xl">
                <Zap size={28} className="text-zinc-600 mb-1.5 animate-bounce" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic text-center px-4">
                  Lousa Tática Vazia.<br/>Adicione jogadores, cones ou escolha "Jogadas Globo"!
                </p>
             </div>
          )}
        </div>
      </div>

      {/* Bottom Playback Deck (In Flow below Stage Container) */}
      <div className="w-full shrink-0 z-20 flex flex-col gap-1.5">
        {/* HUD Narração Tática da IA */}
        {executionSteps && executionSteps.length > 0 && (
          <div className="bg-zinc-900/90 border border-zinc-800/80 p-2 rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in">
            <div className="p-1.5 rounded-lg bg-theme-primary/10 border border-theme-primary/25 text-theme-primary shrink-0 animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="text-[8px] uppercase font-black text-theme-primary tracking-widest flex items-center gap-1">
                <span>NARRADOR TÁTICO</span>
                <span className="text-[7px] text-zinc-500 font-bold">•</span>
                <span className="text-zinc-400">PASSO {Math.min(executionSteps.length, Math.floor(t * executionSteps.length) + 1)} / {executionSteps.length}</span>
              </div>
              <p className="text-[10px] text-zinc-200 font-medium leading-tight italic truncate">
                "{executionSteps[Math.min(executionSteps.length - 1, Math.floor(t * executionSteps.length))] || 'Preparação tática...'}"
              </p>
            </div>
          </div>
        )}

        {/* Playback Controls Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 p-2 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-2 shadow-lg">
          {/* Play / Pause / Reset & Speed */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-md",
                isPlaying 
                  ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20" 
                  : "bg-theme-primary text-black hover:bg-theme-primary/80 shadow-theme-primary/20"
              )}
              title={isPlaying ? "Pausar" : "Iniciar Movimentação"}
            >
              {isPlaying ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              className="p-2 bg-zinc-800 border border-zinc-700/60 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all cursor-pointer flex items-center justify-center"
              title="Reiniciar Posicionamento"
            >
              <RotateCcw size={12} />
            </button>

            <div className="flex items-center gap-0.5 bg-zinc-950 p-0.5 rounded border border-zinc-800">
              {([1, 1.5, 2] as const).map(speed => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-black transition-all cursor-pointer",
                    playbackSpeed === speed 
                      ? "bg-theme-primary text-black font-black" 
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex-1 min-w-[120px] flex items-center gap-2">
            <span className="text-[8px] font-mono text-zinc-500 w-6 text-right font-bold shrink-0">
              {(currentTime / 20).toFixed(1)}s
            </span>
            
            <div className="flex-1 relative group py-1">
              <input 
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={currentTime}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentTime(parseFloat(e.target.value));
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-theme-primary focus:outline-none"
              />
              <div 
                className="absolute left-0 top-[10px] h-1 bg-theme-primary/50 rounded-lg pointer-events-none" 
                style={{ width: `${currentTime}%` }}
              />
            </div>

            <span className="text-[8px] font-mono text-zinc-500 w-6 text-left font-bold shrink-0">
              5.0s
            </span>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIs3D(!is3D)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase transition-all cursor-pointer border",
                is3D ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
              )}
              title="Alternar entre visualização 2D Plana e Perspectiva 3D"
            >
              <Tv size={10} />
              {is3D ? "3D Ativo" : "2D Plano"}
            </button>

            <button
              type="button"
              onClick={() => setShowTrails(!showTrails)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase transition-all cursor-pointer border",
                showTrails ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40" : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
              )}
              title="Mostrar trajetos desenhados"
            >
              {showTrails ? <Eye size={10} /> : <EyeOff size={10} />}
              Linhas
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={cn(
                "px-2 py-1 rounded text-[8px] font-black uppercase transition-all cursor-pointer border",
                isLooping ? "bg-theme-primary/15 text-theme-primary border-theme-primary/30" : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
              )}
            >
              {isLooping ? "Loop" : "Manual"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
