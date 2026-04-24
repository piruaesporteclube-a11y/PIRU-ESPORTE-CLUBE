import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Ellipse, Arrow, Star } from 'react-konva';
import { MousePointer2, Plus, Trash2, Save, Move, Play, RefreshCcw } from 'lucide-react';
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
  team?: 'A' | 'B';
  label?: string;
  animate?: boolean;
  color?: string;
}

export default function DrillVisualizer({ activity, onChange, isEditable = false }: DrillVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [frame, setFrame] = useState(0);
  const [objects, setObjects] = useState<VisualObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        const h = (clientWidth * 2) / 3;
        setDimensions({ width: clientWidth, height: h });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const interval = setInterval(() => {
      setFrame(f => f + 1);
    }, 50);

    // Load initial objects
    try {
      if (activity.visualData) {
        setObjects(JSON.parse(activity.visualData));
      } else {
        setObjects([]);
      }
    } catch (e) {
      setObjects([]);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateSize);
    };
  }, [activity.visualData]);

  const { width: w, height: h } = dimensions;
  const fieldBorder = 20;
  const fw = w - fieldBorder * 2;
  const fh = h - fieldBorder * 2;

  const t = (frame % 150) / 150; // Slower animation cycle

  const handleDragEnd = (id: string, isTarget: boolean, e: any) => {
    if (!isEditable) return;
    const { x, y } = e.target.position();
    
    // Normalized coordinates (0-100)
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
    setObjects(newObjects);
    onChange?.(JSON.stringify(newObjects));
  };

  const addObject = (type: VisualObject['type']) => {
    const newObj: VisualObject = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 50,
      y: 50,
      label: type === 'player' ? (objects.filter(o => o.type === 'player').length + 1).toString() : '',
      team: 'A',
      color: type === 'arrow' ? '#3b82f6' : undefined
    };

    if (type === 'ball' || type === 'player') {
      newObj.animate = true;
      newObj.toX = 60;
      newObj.toY = 60;
    }

    if (type === 'arrow') {
      newObj.toX = 60;
      newObj.toY = 60;
    }

    const newObjects = [...objects, newObj];
    setObjects(newObjects);
    onChange?.(JSON.stringify(newObjects));
    setSelectedId(newObj.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const newObjects = objects.filter(o => o.id !== selectedId);
    setObjects(newObjects);
    setSelectedId(null);
    setIsEditingTarget(false);
    onChange?.(JSON.stringify(newObjects));
  };

  const toggleAnimate = (id: string) => {
    const newObjects = objects.map(obj => {
      if (obj.id === id) {
        const willAnimate = !obj.animate;
        return { 
          ...obj, 
          animate: willAnimate,
          toX: willAnimate ? (obj.toX || obj.x + 10) : undefined,
          toY: willAnimate ? (obj.toY || obj.y + 10) : undefined
        };
      }
      return obj;
    });
    setObjects(newObjects);
    onChange?.(JSON.stringify(newObjects));
  };

  const renderField = () => {
    switch (activity.modality) {
      case 'Vôlei':
        return (
          <>
            <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} fill="#f97316" stroke="#fff" strokeWidth={2} />
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={4} />
            <Line points={[fieldBorder + fw * 0.33, fieldBorder, fieldBorder + fw * 0.33, fieldBorder + fh]} stroke="#fff" strokeWidth={1} />
            <Line points={[fieldBorder + fw * 0.66, fieldBorder, fieldBorder + fw * 0.66, fieldBorder + fh]} stroke="#fff" strokeWidth={1} />
          </>
        );
      case 'Basquete':
        return (
          <>
            <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} fill="#c2410c" stroke="#fff" strokeWidth={2} />
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={2} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.1} stroke="#fff" strokeWidth={2} />
            <Ellipse x={fieldBorder} y={fieldBorder + fh / 2} radiusX={fw * 0.3} radiusY={fh * 0.45} stroke="#fff" strokeWidth={2} />
            <Ellipse x={fieldBorder + fw} y={fieldBorder + fh / 2} radiusX={fw * 0.3} radiusY={fh * 0.45} stroke="#fff" strokeWidth={2} />
          </>
        );
      case 'Futsal':
        return (
          <>
            <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} fill="#1e3a8a" stroke="#fff" strokeWidth={2} />
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={2} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.15} stroke="#fff" strokeWidth={2} />
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.35} width={fw * 0.15} height={fh * 0.3} stroke="#fff" />
            <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.35} width={fw * 0.15} height={fh * 0.3} stroke="#fff" />
          </>
        );
      case 'Futebol de Areia':
        return (
           <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} fill="#eab308" stroke="#fff" strokeWidth={2} />
        );
      default:
        return (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <Rect 
                key={i} 
                x={fieldBorder + (fw / 8) * i} 
                y={fieldBorder} 
                width={fw / 8} 
                height={fh} 
                fill={i % 2 === 0 ? '#14532d' : '#15803d'} 
              />
            ))}
            <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} stroke="#fff" strokeWidth={2} opacity={0.6} />
            <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#fff" strokeWidth={2} opacity={0.6} />
            <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.1} stroke="#fff" strokeWidth={2} opacity={0.6} />
            <Rect x={fieldBorder} y={fieldBorder + fh * 0.25} width={fw * 0.15} height={fh * 0.5} stroke="#fff" strokeWidth={2} opacity={0.6} />
            <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.25} width={fw * 0.15} height={fh * 0.5} stroke="#fff" strokeWidth={2} opacity={0.6} />
          </>
        );
    }
  };

  const renderDrill = () => {
    const result: React.ReactNode[] = [];

    objects.forEach((obj) => {
      const ox = fieldBorder + (obj.x / 100) * fw;
      const oy = fieldBorder + (obj.y / 100) * fh;
      const isSelected = selectedId === obj.id;

      let currentX = ox;
      let currentY = oy;

      if (obj.animate && obj.toX !== undefined && obj.toY !== undefined && !isEditable) {
        const dx = (obj.toX - obj.x) * t;
        const dy = (obj.toY - obj.y) * t;
        currentX = ox + (dx / 100) * fw;
        currentY = oy + (dy / 100) * fh;
      }

      let element: any = null;

      switch (obj.type) {
        case 'cone':
          element = <Star x={currentX} y={currentY} numPoints={5} innerRadius={fw * 0.01} outerRadius={fw * 0.02} fill="#f97316" stroke="#fff" strokeWidth={1} />;
          break;
        case 'barrier':
          element = <Rect x={currentX - 15} y={currentY - 5} width={30} height={10} fill="#f8fafc" stroke="#64748b" cornerRadius={2} />;
          break;
        case 'stake':
          element = <Circle x={currentX} y={currentY} radius={5} fill="#fbbf24" stroke="#fff" />;
          break;
        case 'player':
          element = (
            <Group>
              {obj.animate && obj.toX !== undefined && isEditable && (
                <Line 
                  points={[ox, oy, fieldBorder + (obj.toX / 100) * fw, fieldBorder + (obj.toY! / 100) * fh]} 
                  stroke={obj.team === 'A' ? '#3b82f6' : '#ef4444'} 
                  strokeWidth={2} 
                  opacity={0.3} 
                  dash={[5, 2]} 
                />
              )}
              <Circle x={currentX} y={currentY} radius={fw * 0.025} fill={obj.team === 'A' ? '#3b82f6' : '#ef4444'} stroke="#fff" strokeWidth={2} shadowBlur={isSelected ? 10 : 0} shadowColor="#fff" />
              <Text x={currentX - 6} y={currentY - 6} text={obj.label || ''} fontSize={12} fill="#fff" fontStyle="bold" />
            </Group>
          );
          break;
        case 'ball':
          element = (
            <Group>
              {obj.animate && obj.toX !== undefined && isEditable && (
                <Line 
                  points={[ox, oy, fieldBorder + (obj.toX / 100) * fw, fieldBorder + (obj.toY! / 100) * fh]} 
                  stroke="#fff" 
                  strokeWidth={1} 
                  opacity={0.3} 
                  dash={[2, 2]} 
                />
              )}
              <Group>
                <Circle x={currentX} y={currentY} radius={fw * 0.015} fill="#fff" stroke="#000" strokeWidth={1} shadowBlur={5} />
                <Line points={[currentX - 3, currentY - 3, currentX + 3, currentY + 3]} stroke="#000" strokeWidth={1} />
                <Line points={[currentX + 3, currentY - 3, currentX - 3, currentY + 3]} stroke="#000" strokeWidth={1} />
              </Group>
            </Group>
          );
          break;
        case 'arrow':
          const tx = fieldBorder + (obj.toX! / 100) * fw;
          const ty = fieldBorder + (obj.toY! / 100) * fh;
          element = <Arrow points={[ox, oy, tx, ty]} stroke={obj.color || '#fff'} fill={obj.color || '#fff'} strokeWidth={3} pointerLength={10} pointerWidth={10} opacity={0.6} dash={[5, 2]} />;
          break;
      }

      result.push(
        <Group 
          key={obj.id} 
          draggable={isEditable} 
          onDragEnd={(e) => handleDragEnd(obj.id, false, e)}
          onClick={(e) => {
            if (!isEditable) return;
            e.cancelBubble = true;
            setSelectedId(obj.id);
            setIsEditingTarget(false);
          }}
        >
          {element}
          {isSelected && isEditable && (
            <Circle 
              x={currentX} 
              y={currentY} 
              radius={fw * 0.04} 
              stroke="#theme-primary" 
              strokeWidth={1} 
              dash={[4, 2]} 
            />
          )}
        </Group>
      );

      // Render Target point if in editor
      if (isSelected && isEditable && obj.animate && obj.toX !== undefined && obj.toY !== undefined) {
        const tox = fieldBorder + (obj.toX / 100) * fw;
        const toy = fieldBorder + (obj.toY / 100) * fh;
        result.push(
          <Group 
            key={`${obj.id}-target`} 
            draggable 
            onDragEnd={(e) => handleDragEnd(obj.id, true, e)}
          >
            <Circle x={tox} y={toy} radius={fw * 0.02} fill="white" opacity={0.5} stroke="#000" strokeWidth={1} />
            <Text x={tox - 10} y={toy - 15} text="ALVO" fontSize={8} fill="#fff" fontStyle="bold" />
          </Group>
        );
      }
    });

    return result;
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col gap-4">
      {isEditable && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2 mr-1">
            <button type="button" onClick={() => addObject('player')} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus size={14} /> Atleta
            </button>
            <button type="button" onClick={() => addObject('ball')} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white hover:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus size={14} /> Bola
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2 mr-1">
            <button type="button" onClick={() => addObject('cone')} className="p-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus size={14} /> Cone
            </button>
            <button type="button" onClick={() => addObject('barrier')} className="p-2 bg-zinc-700/20 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus size={14} /> Barreira
            </button>
            <button type="button" onClick={() => addObject('stake')} className="p-2 bg-yellow-600/20 text-yellow-400 rounded-lg hover:bg-yellow-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus size={14} /> Estaca
            </button>
          </div>

          <button type="button" onClick={() => addObject('arrow')} className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase">
            <Plus size={14} /> Vetor
          </button>
          
          <div className="ml-auto flex items-center gap-2">
            {selectedId && (
              <>
                <button 
                  type="button"
                  onClick={() => toggleAnimate(selectedId)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2",
                    objects.find(o => o.id === selectedId)?.animate 
                      ? "bg-theme-primary text-black" 
                      : "bg-zinc-800 text-zinc-500 hover:text-white"
                  )}
                >
                  <Play size={14} /> Animar
                </button>
                <button 
                  type="button"
                  onClick={removeSelected}
                  className="p-2 bg-red-600/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button 
              type="button"
              onClick={() => {
                if(confirm("Limpar todo o esquema tático?")) setObjects([]);
              }}
              className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-all"
              title="Limpar Tudo"
            >
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="relative group flex-1">
        <Stage 
          width={w} 
          height={h} 
          className="rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
          onClick={() => isEditable && setSelectedId(null)}
        >
          <Layer>
            {renderField()}
            {renderDrill()}
          </Layer>
        </Stage>
        
        {!isEditable && objects.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-[2rem]">
              <Play size={40} className="text-zinc-700 mb-2" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Nenhuma animação definida</p>
           </div>
        )}

        {isEditable && (
          <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
            <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
              <Move size={12} className="text-theme-primary" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Modo Editor Ativo</span>
            </div>
            {selectedId && objects.find(o => o.id === selectedId)?.animate && (
               <div className="bg-theme-primary/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-black/10 flex items-center gap-2">
                 <Play size={12} className="text-black" />
                 <span className="text-[9px] font-black text-black uppercase tracking-widest">Arraste o círculo branco para o destino</span>
               </div>
            )}
          </div>
        )}
      </div>

      {!isEditable && (
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Simulação Dinâmica Metodológica</span>
           </div>
           <div className="text-[9px] font-mono text-zinc-600 uppercase">{activity.modality} // {activity.difficulty}</div>
        </div>
      )}
    </div>
  );
}
