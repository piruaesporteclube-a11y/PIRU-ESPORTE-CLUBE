import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Ellipse, Arrow } from 'react-konva';
import { Play, Pause, RotateCcw, User, Disc, Hexagon, ArrowRight, Settings2, Shield, Info, Zap, Eye, EyeOff, Layout } from 'lucide-react';
import { TrainingActivity } from '../types';
import { cn } from '../utils';

interface DrillVisualizerProps {
  activity: TrainingActivity;
  onChange?: (visualData: string) => void;
  isEditable?: boolean;
}

interface VisualObject {
  id: string;
  type: 'cone' | 'player' | 'ball' | 'arrow' | 'barrier' | 'stake';
  x: number;
  y: number;
  toX?: number;
  toY?: number;
  team?: 'A' | 'B' | 'C' | 'D';
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
  D: '#facc15'  // Team D: Gold Yellow
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

export default function DrillVisualizer({ activity, onChange, isEditable = false }: DrillVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  
  // Timeline playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 0 to 100
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 1.5x, 2x
  const [isLooping, setIsLooping] = useState(true);
  const [showTrails, setShowTrails] = useState(true);

  const [objects, setObjects] = useState<VisualObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        const { width } = entry.contentRect;
        const h = Math.max(380, (width * 2) / 3.2); // Maintain nice aspect ratio
        setDimensions({ width, height: h });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Track updates to prevent recursive loops
  const lastUpdateRef = useRef<string>('');

  useEffect(() => {
    if (activity.visualData && activity.visualData !== lastUpdateRef.current) {
      try {
        const data = JSON.parse(activity.visualData);
        setObjects(data);
        lastUpdateRef.current = activity.visualData;
      } catch (e) {
        console.error("Failed to parse visualData", e);
      }
    }
  }, [activity.visualData]);

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
    const { x, y } = e.target.position();
    
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

  const addObject = (type: VisualObject['type'], customTeam?: 'A' | 'B') => {
    const newObj: VisualObject = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 45,
      y: 45,
      label: type === 'player' ? (objects.filter(o => o.type === 'player' && o.team === (customTeam || 'A')).length + 1).toString() : '',
      team: customTeam || 'A',
      color: type === 'arrow' ? '#3b82f6' : undefined
    };

    if (type === 'ball' || type === 'player' || type === 'arrow') {
      newObj.animate = true;
      newObj.toX = 55;
      newObj.toY = 55;
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
          <Group opacity={0.45}>
            {/* Center line and circle */}
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.09} stroke={lineStroke} strokeWidth={2} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={3} fill={lineStroke} />
            
            {/* Left penalty box */}
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.22} width={fw * 0.165} height={fh * 0.56} stroke={lineStroke} strokeWidth={2} />
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.35} width={fw * 0.055} height={fh * 0.3} stroke={lineStroke} strokeWidth={2} />
            <Circle x={fieldBorder + fw * 0.11} y={fieldBorder + fh * 0.5} radius={3} fill={lineStroke} />
            
            {/* Right penalty box */}
            <Rect x={fieldBorder + fw - fw * 0.165} y={fieldBorder + fh * 0.22} width={fw * 0.165} height={fh * 0.56} stroke={lineStroke} strokeWidth={2} />
            <Rect x={fieldBorder + fw - fw * 0.055} y={fieldBorder + fh * 0.35} width={fw * 0.055} height={fh * 0.3} stroke={lineStroke} strokeWidth={2} />
            <Circle x={fieldBorder + fw - fw * 0.11} y={fieldBorder + fh * 0.5} radius={3} fill={lineStroke} />

            {/* Penalty arcs */}
            <Ellipse x={fieldBorder + fw * 0.11} y={fieldBorder + fh * 0.5} radiusX={fw * 0.07} radiusY={fh * 0.12} stroke={lineStroke} strokeWidth={2} clipFunc={(ctx) => {
              ctx.rect(fieldBorder + fw * 0.165, fieldBorder, fw, fh);
            }} />
            <Ellipse x={fieldBorder + fw - fw * 0.11} y={fieldBorder + fh * 0.5} radiusX={fw * 0.07} radiusY={fh * 0.12} stroke={lineStroke} strokeWidth={2} clipFunc={(ctx) => {
              ctx.rect(0, fieldBorder, fieldBorder + fw - fw * 0.165, fh);
            }} />
          </Group>
        )}

        {activity.modality === 'Futsal' && (
           <Group opacity={0.45}>
             <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke={lineStroke} strokeWidth={2} />
             <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.12} stroke={lineStroke} strokeWidth={2} />
             {/* Six-meter lines */}
             <Rect x={fieldBorder} y={fieldBorder + fh * 0.28} width={fw * 0.15} height={fh * 0.44} stroke={lineStroke} strokeWidth={2} cornerRadius={[0, 40, 40, 0]} />
             <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.28} width={fw * 0.15} height={fh * 0.44} stroke={lineStroke} strokeWidth={2} cornerRadius={[40, 0, 0, 40]} />
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
          
          // Rotate player wedge indicating moving direction
          let playerAngle = 0;
          if (hasPath) {
            const tx = fieldBorder + (Number(obj.toX) / 100) * fw;
            const ty = fieldBorder + (Number(obj.toY) / 100) * fh;
            playerAngle = Math.atan2(ty - oy, tx - ox) * (180 / Math.PI);
          }

          element = (
            <Group>
              {/* Direction wedge */}
              {hasPath && (
                <Group rotation={playerAngle}>
                  <Line
                    points={[fw * 0.024, -4, fw * 0.038, 0, fw * 0.024, 4]}
                    fill={teamColor}
                    closed
                    opacity={0.9}
                  />
                </Group>
              )}

              {/* Jersey circular token with professional glow */}
              <Circle 
                x={0} 
                y={0} 
                radius={fw * 0.024} 
                fill={teamColor} 
                stroke={isSelected ? '#ffffff' : '#0f172a'} 
                strokeWidth={isSelected ? 3 : 1.8} 
                shadowBlur={isSelected ? 10 : 4} 
                shadowColor={isSelected ? '#ffffff' : '#000000'}
                shadowOpacity={0.65}
              />
              
              {/* Inner details to feel like a real tactic board chip */}
              <Group clipFunc={(ctx) => {
                ctx.arc(0, 0, (fw * 0.024) - 1.5, 0, Math.PI * 2, false);
              }}>
                {/* Visual patterns depending on team */}
                {obj.team === 'A' && (
                  <Group>
                    <Line points={[-10, -20, -10, 20]} stroke="#ffffff" strokeWidth={2} opacity={0.25} />
                    <Line points={[0, -20, 0, 20]} stroke="#ffffff" strokeWidth={2} opacity={0.25} />
                    <Line points={[10, -20, 10, 20]} stroke="#ffffff" strokeWidth={2} opacity={0.25} />
                  </Group>
                )}
                {obj.team === 'B' && (
                  <Line points={[-20, -20, 20, 20]} stroke="#ffffff" strokeWidth={4} opacity={0.3} />
                )}
                {obj.team === 'C' && (
                  <Circle x={0} y={-12} radius={8} fill="#ffffff" opacity={0.25} />
                )}
                {obj.team === 'D' && (
                  <Line points={[-20, 0, 20, 0]} stroke="#000000" strokeWidth={3} opacity={0.2} />
                )}
                
                {/* Subtle shirt collar highlight */}
                <Line
                  points={[-5, -(fw * 0.024), 0, -(fw * 0.01), 5, -(fw * 0.024)]}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              </Group>

              {/* Player Number text */}
              <Text 
                x={-15} 
                y={-6} 
                text={obj.label || ''} 
                fontSize={fw * 0.018} 
                fill={obj.team === 'D' ? '#0f172a' : '#ffffff'} 
                fontStyle="bold" 
                align="center" 
                width={30} 
                shadowBlur={1}
                shadowColor={obj.team === 'D' ? '#ffffff' : '#000000'}
              />
            </Group>
          );
          break;
        case 'ball':
          element = (
            <Group>
              {/* Shadow */}
              <Circle x={1} y={2} radius={fw * 0.015} fill="#000000" opacity={0.3} />
              
              {/* Ball Body */}
              <Circle 
                x={0} 
                y={0} 
                radius={fw * 0.015} 
                fill="#ffffff" 
                stroke="#0f172a" 
                strokeWidth={1.5} 
                shadowBlur={3} 
                shadowColor="#000"
                shadowOpacity={0.3}
              />
              {/* Classic football hexagons */}
              <Circle x={0} y={0} radius={fw * 0.005} fill="#000000" />
              <Line points={[0, -(fw * 0.005), 0, -(fw * 0.015)]} stroke="#000" strokeWidth={1} />
              <Line points={[-(fw * 0.004), (fw * 0.002), -(fw * 0.012), (fw * 0.009)]} stroke="#000" strokeWidth={1} />
              <Line points={[(fw * 0.004), (fw * 0.002), (fw * 0.012), (fw * 0.009)]} stroke="#000" strokeWidth={1} />
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
    <div ref={containerRef} className="w-full h-full flex flex-col gap-4">
      {isEditable && (
        <div className="flex flex-col gap-3">
          {/* Main Toolbar */}
          <div className="flex items-center gap-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto no-scrollbar">
            <button type="button" onClick={() => addObject('player', 'A')} className="p-2.5 bg-blue-600/15 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-black uppercase whitespace-nowrap">
              <User size={14} className="fill-current" /> Azul (A)
            </button>
            <button type="button" onClick={() => addObject('player', 'B')} className="p-2.5 bg-red-600/15 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-black uppercase whitespace-nowrap">
              <User size={14} className="fill-current" /> Vermelho (B)
            </button>
            <button type="button" onClick={() => addObject('ball')} className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white hover:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <Disc size={14} /> Bola
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1 shrink-0" />
            <button type="button" onClick={() => addObject('cone')} className="p-2.5 bg-orange-600/10 text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <Hexagon size={14} /> Cone
            </button>
            <button type="button" onClick={() => addObject('barrier')} className="p-2.5 bg-zinc-700/10 text-zinc-400 rounded-xl hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <Shield size={14} /> Barreira
            </button>
            <button type="button" onClick={() => addObject('arrow')} className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <ArrowRight size={14} /> Vetor
            </button>
            
            <div className="w-px h-6 bg-zinc-800 mx-1 shrink-0" />
            
            {/* Standard tactics schemas */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest hidden lg:block mr-1">Táticas:</span>
              {(['4-4-2', '4-3-3', '3-5-2'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => applyFormation(f)}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[9px] font-black transition-all border border-transparent hover:border-zinc-600"
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-zinc-800 mx-1 shrink-0" />

            {/* Clear Board */}
            <button 
              type="button" 
              onClick={() => { if(confirm("Limpar esquema tático?")) { handleUpdate([]); setSelectedId(null); } }} 
              className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
              title="Limpar Tudo"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Globo TV pre-loaded plays selector (Very cool!) */}
            <div className="flex-1 flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <Layout size={16} className="text-emerald-500 ml-1 shrink-0" />
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Jogadas Globo:</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar w-full">
                {Object.keys(PRESET_PLAYS).map((key) => {
                  const preset = PRESET_PLAYS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => loadPreset(key)}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[9px] font-bold whitespace-nowrap border border-zinc-700 transition-all cursor-pointer"
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Property Editor */}
            <div className="flex-1 flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl min-h-[52px]">
              {selectedObject ? (
                <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-left-2 transition-all">
                  <Settings2 size={16} className="text-theme-primary ml-1 shrink-0" />
                  
                  {selectedObject.type === 'player' && (
                    <>
                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg shrink-0">
                        {(['A', 'B', 'C', 'D'] as const).map(team => (
                          <button
                            key={team}
                            type="button"
                            onClick={() => updateObject(selectedObject.id, { team })}
                            className={cn(
                              "w-5 h-5 rounded-md transition-all border",
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
                        className="w-10 h-7 bg-black/40 border border-zinc-800 rounded-lg text-center text-xs font-bold text-white focus:ring-1 focus:ring-theme-primary"
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
                        "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
                        selectedObject.animate ? "bg-theme-primary text-black" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      <Play size={10} fill={selectedObject.animate ? "currentColor" : "none"} />
                      {selectedObject.animate ? "Móvel" : "Fixo"}
                    </button>
                  )}

                  <button 
                    type="button"
                    onClick={removeSelected}
                    className="ml-auto p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-all cursor-pointer"
                    title="Excluir item"
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 text-zinc-500 italic text-[9px] uppercase font-bold tracking-widest">
                  <Info size={13} /> Selecione um item na lousa para configurar
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* The Stage / Pitch */}
      <div className="relative group flex-1">
        <Stage 
          width={w} 
          height={h} 
          className="rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
          onClick={() => isEditable && setSelectedId(null)}
        >
          <Layer>
            {renderField()}
            {renderTrailsAndTargets()}
            {renderDrillObjects()}
          </Layer>
        </Stage>
        
        {objects.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[1.5px] rounded-3xl">
              <Zap size={36} className="text-zinc-600 mb-2 animate-bounce" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic text-center px-4">
                Lousa Tática Vazia.<br/>Adicione jogadores, cones ou clique em "Jogadas Globo"!
              </p>
           </div>
        )}

        {isEditable && (
          <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
            <div className="bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[8px] font-black text-white uppercase tracking-widest">Mesa Tática Interativa</span>
            </div>
          </div>
        )}
      </div>

      {/* Globo-Style Interactive Playback Control Deck */}
      <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        {/* Left Controls: Play / Pause / Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-lg",
                isPlaying 
                  ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20" 
                  : "bg-theme-primary text-black hover:bg-theme-primary/80 shadow-theme-primary/20"
              )}
              title={isPlaying ? "Pausar" : "Iniciar Movimentação"}
            >
              {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Reiniciar Posicionamento"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Speed Selectors */}
          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 ml-1">
            {([1, 1.5, 2] as const).map(speed => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  "px-2 py-1 rounded-md text-[8px] font-black transition-all cursor-pointer",
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

        {/* Center Control: Scrubber (Timeline) */}
        <div className="flex-1 w-full flex items-center gap-2.5">
          <span className="text-[9px] font-mono text-zinc-500 w-8 text-right font-bold shrink-0">
            {(currentTime / 20).toFixed(1)}s
          </span>
          
          <div className="flex-1 relative group py-2">
            <input 
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={currentTime}
              onChange={(e) => {
                setIsPlaying(false); // Pause on manual scrub
                setCurrentTime(parseFloat(e.target.value));
              }}
              className="w-full h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-theme-primary focus:outline-none"
            />
            {/* Custom glowing track progress overlay */}
            <div 
              className="absolute left-0 top-[14px] h-1 bg-theme-primary/50 rounded-lg pointer-events-none" 
              style={{ width: `${currentTime}%` }}
            />
          </div>

          <span className="text-[9px] font-mono text-zinc-500 w-8 text-left font-bold shrink-0">
            5.0s
          </span>
        </div>

        {/* Right Controls: Trails and Looping Toggles */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Trails Toggle */}
          <button
            type="button"
            onClick={() => setShowTrails(!showTrails)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer",
              showTrails ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
            )}
            title="Mostrar trajetos desenhados"
          >
            {showTrails ? <Eye size={10} /> : <EyeOff size={10} />}
            Linhas
          </button>

          {/* Looping Toggle */}
          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer border",
              isLooping ? "bg-theme-primary/10 text-theme-primary border-theme-primary/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"
            )}
          >
            {isLooping ? "Loop" : "Manual"}
          </button>
        </div>
      </div>
    </div>
  );
}
