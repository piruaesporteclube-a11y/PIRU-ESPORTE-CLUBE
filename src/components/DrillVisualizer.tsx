import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Ellipse, Arrow, Star } from 'react-konva';
import { MousePointer2, Plus, Trash2, Save, Move, Play, Pause, RotateCcw, User, Disc, Hexagon, ArrowRight, Settings2, Shield, Info, Zap, Eye, EyeOff } from 'lucide-react';
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
  Futebol: '#14532d',
  Futsal: '#1e3a8a',
  Vôlei: '#f97316',
  Basquete: '#c2410c',
  'Futebol de Areia': '#eab308',
  Outros: '#27272a'
};

const TEAM_COLORS = {
  A: '#3b82f6', // Team A: Vibrant Blue
  B: '#ef4444', // Team B: Vibrant Red
  C: '#f59e0b', // Team C: Yellow (Brazil style)
  D: '#ffffff'  // Team D: White
};

export default function DrillVisualizer({ activity, onChange, isEditable = false }: DrillVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  
  // Interactive Timeline / Playback state (Rede Globo Mesa Tática style)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 0 to 100
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1, 1.5, 2
  const [isLooping, setIsLooping] = useState(true);
  const [showTrails, setShowTrails] = useState(true);

  const [objects, setObjects] = useState<VisualObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const t = useMemo(() => {
    // Return the progress factor (0 to 1)
    return currentTime / 100;
  }, [currentTime]);

  // Smooth playhead updater using requestAnimationFrame
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
        {x: 10, y: 50, label: 'GK', team: 'A'},
        {x: 25, y: 20, label: 'LD', team: 'A'}, {x: 25, y: 40, label: 'ZAD', team: 'A'}, {x: 25, y: 60, label: 'ZAE', team: 'A'}, {x: 25, y: 80, label: 'LE', team: 'A'},
        {x: 45, y: 20, label: 'MD', team: 'A'}, {x: 45, y: 40, label: 'VOL', team: 'A'}, {x: 45, y: 60, label: 'VOL', team: 'A'}, {x: 45, y: 80, label: 'ME', team: 'A'},
        {x: 70, y: 35, label: 'ATD', team: 'A'}, {x: 70, y: 65, label: 'ATE', team: 'A'},
        // Opponent Team B (Defense - Red)
        {x: 88, y: 50, label: 'GK', team: 'B'},
        {x: 78, y: 25, label: 'LD', team: 'B'}, {x: 78, y: 45, label: 'ZA', team: 'B'}, {x: 78, y: 55, label: 'ZA', team: 'B'}, {x: 78, y: 75, label: 'LE', team: 'B'}
      ],
      '4-3-3': [
        // Team A (Attack - Blue)
        {x: 10, y: 50, label: 'GK', team: 'A'},
        {x: 25, y: 20, label: 'LD', team: 'A'}, {x: 25, y: 40, label: 'ZAD', team: 'A'}, {x: 25, y: 60, label: 'ZAE', team: 'A'}, {x: 25, y: 80, label: 'LE', team: 'A'},
        {x: 45, y: 30, label: 'VOL', team: 'A'}, {x: 45, y: 50, label: 'MC', team: 'A'}, {x: 45, y: 70, label: 'VOL', team: 'A'},
        {x: 68, y: 20, label: 'PD', team: 'A'}, {x: 72, y: 50, label: 'CA', team: 'A'}, {x: 68, y: 80, label: 'PE', team: 'A'},
        // Opponent Team B (Defense - Red)
        {x: 88, y: 50, label: 'GK', team: 'B'},
        {x: 78, y: 20, label: 'LD', team: 'B'}, {x: 78, y: 40, label: 'ZA', team: 'B'}, {x: 78, y: 60, label: 'ZA', team: 'B'}, {x: 78, y: 80, label: 'LE', team: 'B'}
      ],
      '3-5-2': [
        // Team A (Attack - Blue)
        {x: 10, y: 50, label: 'GK', team: 'A'},
        {x: 25, y: 30, label: 'ZAD', team: 'A'}, {x: 25, y: 50, label: 'ZAC', team: 'A'}, {x: 25, y: 70, label: 'ZAE', team: 'A'},
        {x: 42, y: 15, label: 'ALA', team: 'A'}, {x: 45, y: 35, label: 'VOL', team: 'A'}, {x: 45, y: 50, label: 'MC', team: 'A'}, {x: 45, y: 65, label: 'VOL', team: 'A'}, {x: 42, y: 85, label: 'ALA', team: 'A'},
        {x: 68, y: 40, label: 'ATD', team: 'A'}, {x: 68, y: 60, label: 'ATE', team: 'A'},
        // Opponent Team B (Defense - Red)
        {x: 88, y: 50, label: 'GK', team: 'B'},
        {x: 78, y: 30, label: 'ZA', team: 'B'}, {x: 78, y: 50, label: 'ZA', team: 'B'}, {x: 78, y: 70, label: 'ZA', team: 'B'}
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
    toast.success(`Esquema ${formation} aplicado com adversários!`);
  };

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const h = (width * 2) / 3;
        setDimensions({ width, height: h });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Track the last value sent to onChange to prevent loops
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
  const fieldBorder = 20;
  const fw = w - fieldBorder * 2;
  const fh = h - fieldBorder * 2;

  const handleDragEnd = (id: string, isTarget: boolean, e: any) => {
    if (!isEditable) return;
    const { x, y } = e.target.position();
    
    const nx = ((x - fieldBorder) / fw) * 100;
    const ny = ((y - fieldBorder) / fh) * 100;

    const newObjects = objects.map(obj => {
      if (obj.id === id) {
        if (isTarget) {
          return { ...obj, toX: nx, toY: ny, animate: true };
        } else {
          return { ...obj, x: nx, y: ny };
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
    
    // Stop playing and reset playback to 0 during design to align coordinates
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
    
    return (
      <Group>
        <Rect x={0} y={0} width={w} height={h} fill={bgColor} />
        <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} stroke="#fff" strokeWidth={2} opacity={0.6} />
        
        {activity.modality === 'Futebol' && (
          <Group opacity={0.3}>
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={2} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.1} stroke="#fff" strokeWidth={2} />
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.25} width={fw * 0.15} height={fh * 0.5} stroke="#fff" strokeWidth={2} />
            <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.25} width={fw * 0.15} height={fh * 0.5} stroke="#fff" strokeWidth={2} />
          </Group>
        )}

        {activity.modality === 'Futsal' && (
           <Group opacity={0.3}>
             <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={2} />
             <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.15} stroke="#fff" strokeWidth={2} />
             <Rect x={fieldBorder} y={fieldBorder + fh * 0.35} width={fw * 0.15} height={fh * 0.3} stroke="#fff" strokeWidth={2} />
             <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.35} width={fw * 0.15} height={fh * 0.3} stroke="#fff" strokeWidth={2} />
           </Group>
        )}

        {activity.modality === 'Vôlei' && (
           <Group opacity={0.3}>
             <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={4} />
             <Line points={[fieldBorder + fw * 0.33, fieldBorder, fieldBorder + fw * 0.33, fieldBorder + fh]} stroke="#fff" strokeWidth={1} />
             <Line points={[fieldBorder + fw * 0.66, fieldBorder, fieldBorder + fw * 0.66, fieldBorder + fh]} stroke="#fff" strokeWidth={1} />
           </Group>
        )}
      </Group>
    );
  };

  const renderDrill = () => {
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
              {/* Cone Base */}
              <Ellipse 
                x={currentX} 
                y={currentY + 6} 
                radiusX={fw * 0.015} 
                radiusY={fw * 0.006} 
                fill="#ea580c" 
                stroke="#fff" 
                strokeWidth={0.5} 
              />
              {/* Cone Body */}
              <Line 
                points={[
                  currentX - (fw * 0.01), currentY + 5,
                  currentX, currentY - (fw * 0.018),
                  currentX + (fw * 0.01), currentY + 5
                ]} 
                fill="#f97316" 
                stroke="#fff" 
                strokeWidth={0.5} 
                closed 
              />
              {/* Reflective Stripe */}
              <Line 
                points={[
                  currentX - (fw * 0.005), currentY - (fw * 0.002),
                  currentX + (fw * 0.005), currentY - (fw * 0.002),
                  currentX + (fw * 0.003), currentY - (fw * 0.008),
                  currentX - (fw * 0.003), currentY - (fw * 0.008)
                ]} 
                fill="#ffffff" 
                closed 
                opacity={0.85} 
              />
            </Group>
          );
          break;
        case 'barrier':
          element = <Rect x={currentX - 15} y={currentY - 5} width={30} height={10} fill="#f8fafc" stroke="#64748b" cornerRadius={2} strokeWidth={1} />;
          break;
        case 'stake':
          element = <Circle x={currentX} y={currentY} radius={5} fill="#fbbf24" stroke="#fff" strokeWidth={1} />;
          break;
        case 'player':
          const teamColor = TEAM_COLORS[obj.team || 'A'];
          
          // Calculate movement angle for directional wedge
          let playerAngle = 0;
          if (hasPath) {
            const tx = fieldBorder + (Number(obj.toX) / 100) * fw;
            const ty = fieldBorder + (Number(obj.toY) / 100) * fh;
            playerAngle = Math.atan2(ty - oy, tx - ox) * (180 / Math.PI);
          }

          element = (
            <Group>
              {/* Movement Trail / Dashed Arrow showing path */}
              {hasPath && showTrails && (
                <Arrow 
                  points={[ox, oy, fieldBorder + (Number(obj.toX) / 100) * fw, fieldBorder + (Number(obj.toY!) / 100) * fh]} 
                  stroke={teamColor} 
                  strokeWidth={2} 
                  opacity={0.4} 
                  dash={[6, 3]} 
                  pointerLength={6}
                  pointerWidth={6}
                  fill={teamColor}
                />
              )}
              
              {/* Directional pointer wedge indicating movement direction */}
              {hasPath && (
                <Group x={currentX} y={currentY} rotation={playerAngle}>
                  <Line
                    points={[fw * 0.022, -4, fw * 0.035, 0, fw * 0.022, 4]}
                    fill={teamColor}
                    closed
                    opacity={0.8}
                  />
                </Group>
              )}

              {/* Jersey circular token */}
              {/* Glowing active outline */}
              <Circle 
                x={currentX} 
                y={currentY} 
                radius={fw * 0.025} 
                fill={teamColor} 
                stroke={isSelected ? '#fff' : '#1e293b'} 
                strokeWidth={isSelected ? 3 : 1.5} 
                shadowBlur={isSelected ? 12 : 3} 
                shadowColor={isSelected ? '#fff' : '#000'}
                shadowOpacity={0.6}
              />
              
              {/* Shirt Stripes Design inside the Circle token */}
              <Group x={currentX} y={currentY} clipFunc={(ctx) => {
                ctx.arc(0, 0, (fw * 0.025) - 1, 0, Math.PI * 2, false);
              }}>
                {/* Draw team specific pattern */}
                {obj.team === 'A' && (
                  // Team A (Blue): Vertical white stripes
                  <Group>
                    <Line points={[-12, -20, -12, 20]} stroke="#ffffff" strokeWidth={3} opacity={0.3} />
                    <Line points={[-4, -20, -4, 20]} stroke="#ffffff" strokeWidth={3} opacity={0.3} />
                    <Line points={[4, -20, 4, 20]} stroke="#ffffff" strokeWidth={3} opacity={0.3} />
                    <Line points={[12, -20, 12, 20]} stroke="#ffffff" strokeWidth={3} opacity={0.3} />
                  </Group>
                )}
                {obj.team === 'B' && (
                  // Team B (Red): Horizontal black/white stripes or sash
                  <Group>
                    <Line points={[-25, -25, 25, 25]} stroke="#ffffff" strokeWidth={5} opacity={0.4} />
                  </Group>
                )}
                {obj.team === 'C' && (
                  // Team C (Yellow): Green collar and shoulder accents
                  <Group>
                    <Circle x={0} y={-15} radius={8} fill="#22c55e" opacity={0.4} />
                  </Group>
                )}
                {obj.team === 'D' && (
                  // Team D (White): Black vertical stripes
                  <Group>
                    <Line points={[-10, -20, -10, 20]} stroke="#000000" strokeWidth={2.5} opacity={0.4} />
                    <Line points={[0, -20, 0, 20]} stroke="#000000" strokeWidth={2.5} opacity={0.4} />
                    <Line points={[10, -20, 10, 20]} stroke="#000000" strokeWidth={2.5} opacity={0.4} />
                  </Group>
                )}
                
                {/* V-neck collar overlay */}
                <Line
                  points={[-6, -(fw * 0.025), 0, -(fw * 0.01), 6, -(fw * 0.025)]}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              </Group>

              {/* Player Number Text */}
              <Text 
                x={currentX - 10} 
                y={currentY - 6} 
                text={obj.label || ''} 
                fontSize={fw * 0.018} 
                fill={obj.team === 'D' || obj.team === 'C' ? '#000' : '#fff'} 
                fontStyle="bold" 
                align="center" 
                width={20} 
                shadowBlur={2}
                shadowColor={obj.team === 'D' || obj.team === 'C' ? '#fff' : '#000'}
              />
            </Group>
          );
          break;
        case 'ball':
          element = (
            <Group>
              {hasPath && showTrails && (
                <Line 
                  points={[ox, oy, fieldBorder + (Number(obj.toX) / 100) * fw, fieldBorder + (Number(obj.toY!) / 100) * fh]} 
                  stroke="#ffffff" 
                  strokeWidth={1.5} 
                  opacity={0.4} 
                  dash={[3, 3]} 
                />
              )}
              {/* Ball Body */}
              <Circle 
                x={currentX} 
                y={currentY} 
                radius={fw * 0.014} 
                fill="#ffffff" 
                stroke="#1e293b" 
                strokeWidth={1} 
                shadowBlur={4} 
                shadowColor="#000"
                shadowOpacity={0.4}
              />
              {/* Soccer Ball Pentagon Clusters */}
              <Circle x={currentX} y={currentY} radius={fw * 0.004} fill="#000000" />
              <Line points={[currentX, currentY - (fw * 0.004), currentX, currentY - (fw * 0.014)]} stroke="#000" strokeWidth={1} />
              <Line points={[currentX - (fw * 0.003), currentY + (fw * 0.002), currentX - (fw * 0.011), currentY + (fw * 0.008)]} stroke="#000" strokeWidth={1} />
              <Line points={[currentX + (fw * 0.003), currentY + (fw * 0.002), currentX + (fw * 0.011), currentY + (fw * 0.008)]} stroke="#000" strokeWidth={1} />
            </Group>
          );
          break;
        case 'arrow':
          const tx = fieldBorder + (obj.toX! / 100) * fw;
          const ty = fieldBorder + (obj.toY! / 100) * fh;
          element = <Arrow points={[ox, oy, tx, ty]} stroke={obj.color || '#fff'} fill={obj.color || '#fff'} strokeWidth={3} pointerLength={10} pointerWidth={10} opacity={0.6} />;
          break;
      }

      result.push(
        <Group 
          key={obj.id} 
          draggable={isEditable} 
          onDragStart={() => {
            // Pause and reset playback during any editing drag to align base coordinates
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
              x={currentX} 
              y={currentY} 
              radius={fw * 0.04} 
              stroke="#fff" 
              strokeWidth={1.5} 
              dash={[4, 2]} 
            />
          )}
        </Group>
      );

      if (isSelected && isEditable && obj.animate && obj.toX !== undefined && obj.toY !== undefined) {
        const tox = fieldBorder + (obj.toX / 100) * fw;
        const toy = fieldBorder + (obj.toY / 100) * fh;
        result.push(
          <Group 
            key={`${obj.id}-target`} 
            draggable 
            onDragStart={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onDragEnd={(e) => handleDragEnd(obj.id, true, e)}
          >
            <Circle x={tox} y={toy} radius={fw * 0.02} fill="white" opacity={0.5} stroke="#000" strokeWidth={1.5} />
            <Text x={tox - 12} y={toy - 16} text={obj.type === 'arrow' ? 'FIM' : 'DESTINO'} fontSize={fw * 0.013} fill="#fff" fontStyle="black" />
          </Group>
        );
      }
    });

    return result;
  };

  const selectedObject = objects.find(o => o.id === selectedId);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col gap-4">
      {isEditable && (
        <div className="flex flex-col md:flex-row gap-4 mb-2">
          {/* Main Toolbar */}
          <div className="flex items-center gap-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto no-scrollbar">
            {/* Added Outbound (A) and Inbound (B) player buttons directly to fulfill "jogador nas posições" */}
            <button type="button" onClick={() => addObject('player', 'A')} className="p-2.5 bg-blue-600/15 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-black uppercase whitespace-nowrap">
              <User size={14} className="fill-current" /> Azul (A)
            </button>
            <button type="button" onClick={() => addObject('player', 'B')} className="p-2.5 bg-red-600/15 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-black uppercase whitespace-nowrap">
              <User size={14} className="fill-current" /> Vermelho (B)
            </button>
            <button type="button" onClick={() => addObject('ball')} className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white hover:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <Disc size={14} /> Bola
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1" />
            <button type="button" onClick={() => addObject('cone')} className="p-2.5 bg-orange-600/10 text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <Hexagon size={14} /> Cone
            </button>
            <button type="button" onClick={() => addObject('barrier')} className="p-2.5 bg-zinc-700/10 text-zinc-400 rounded-xl hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <Shield size={14} /> Barreira
            </button>
            <button type="button" onClick={() => addObject('arrow')} className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <ArrowRight size={14} /> Vetor
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1" />
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest hidden lg:block">Modelos:</span>
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
            <div className="w-px h-6 bg-zinc-800 mx-1" />
            <button 
              type="button" 
              onClick={() => { if(confirm("Limpar esquema tático?")) { handleUpdate([]); setSelectedId(null); } }} 
              className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Limpar Tudo"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Property Editor */}
          <div className="flex-1 flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl min-h-[52px]">
            {selectedObject ? (
              <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-left-2 transition-all">
                <Settings2 size={16} className="text-theme-primary ml-2 hidden sm:block" />
                
                {selectedObject.type === 'player' && (
                  <>
                    <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl">
                      {(['A', 'B', 'C', 'D'] as const).map(team => (
                        <button
                          key={team}
                          type="button"
                          onClick={() => updateObject(selectedObject.id, { team })}
                          className={cn(
                            "w-6 h-6 rounded-lg transition-all border-2",
                            selectedObject.team === team ? "border-white scale-110" : "border-transparent opacity-50"
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
                      className="w-12 h-8 bg-black/40 border border-zinc-800 rounded-lg text-center text-xs font-bold text-white focus:ring-1 focus:ring-theme-primary"
                    />
                  </>
                )}

                {(selectedObject.type === 'player' || selectedObject.type === 'ball') && (
                  <button
                    type="button"
                    onClick={() => updateObject(selectedObject.id, { animate: !selectedObject.animate })}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
                      selectedObject.animate ? "bg-theme-primary text-black" : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    <Play size={12} fill={selectedObject.animate ? "currentColor" : "none"} />
                    {selectedObject.animate ? "Ativo" : "Estático"}
                  </button>
                )}

                <button 
                  type="button"
                  onClick={removeSelected}
                  className="ml-auto p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 text-zinc-600 italic text-[10px] uppercase font-bold tracking-widest">
                <Info size={14} /> Clique em um jogador ou item para configurar
              </div>
            )}
          </div>
        </div>
      )}

      {/* The Stage / Pitch */}
      <div className="relative group flex-1">
        <Stage 
          width={w} 
          height={h} 
          className="rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
          onClick={() => isEditable && setSelectedId(null)}
        >
          <Layer>
            {renderField()}
            {renderDrill()}
          </Layer>
        </Stage>
        
        {objects.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-[2.5rem]">
              <Zap size={40} className="text-zinc-700 mb-2" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Nenhum esquema configurado</p>
           </div>
        )}

        {isEditable && (
          <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-2">
            <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-2xl">
              <Move size={12} className="text-theme-primary animate-pulse" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Mesa Tática Interativa</span>
            </div>
          </div>
        )}
      </div>

      {/* Globo-Style Interactive Playback Control Deck */}
      <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        {/* Left Controls: Play / Pause / Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "p-3 rounded-2xl transition-all flex items-center justify-center cursor-pointer shadow-lg",
              isPlaying 
                ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20" 
                : "bg-theme-primary text-black hover:bg-theme-primary/80 shadow-theme-primary/20"
            )}
            title={isPlaying ? "Pausar" : "Iniciar Movimentação"}
          >
            {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            className="p-3 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
            title="Reiniciar Posicionamento"
          >
            <RotateCcw size={16} />
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 ml-1">
            {([1, 1.5, 2] as const).map(speed => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer",
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
        <div className="flex-1 w-full flex items-center gap-3">
          <span className="text-[9px] font-mono text-zinc-500 w-8 text-right font-bold">
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
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-theme-primary focus:outline-none"
            />
            {/* Custom glowing track progress overlay */}
            <div 
              className="absolute left-0 top-[15px] h-1.5 bg-theme-primary/40 rounded-lg pointer-events-none" 
              style={{ width: `${currentTime}%` }}
            />
          </div>

          <span className="text-[9px] font-mono text-zinc-500 w-8 text-left font-bold">
            5.0s
          </span>
        </div>

        {/* Right Controls: Trails and Looping Toggles */}
        <div className="flex items-center gap-4">
          {/* Trails Toggle */}
          <button
            type="button"
            onClick={() => setShowTrails(!showTrails)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer",
              showTrails ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
            )}
            title="Mostrar trajetos desenhados"
          >
            {showTrails ? <Eye size={12} /> : <EyeOff size={12} />}
            Trajetos
          </button>

          {/* Looping Toggle */}
          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            className={cn(
              "px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border",
              isLooping ? "bg-theme-primary/10 text-theme-primary border-theme-primary/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"
            )}
          >
            {isLooping ? "Loop Ativo" : "Única Vez"}
          </button>
        </div>
      </div>
    </div>
  );
}
