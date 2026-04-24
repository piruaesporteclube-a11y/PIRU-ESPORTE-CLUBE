import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Ellipse, Arrow, Star } from 'react-konva';
import { MousePointer2, Plus, Trash2, Save, Move, Play, RotateCcw, User, Disc, Hexagon, ArrowRight, Settings2, Shield, Info, Zap } from 'lucide-react';
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
  A: '#3b82f6',
  B: '#ef4444',
  C: '#f59e0b',
  D: '#ffffff'
};

export default function DrillVisualizer({ activity, onChange, isEditable = false }: DrillVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [frame, setFrame] = useState(0);
  const [objects, setObjects] = useState<VisualObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const t = useMemo(() => {
    const progress = (frame % 300) / 300;
    return (1 - Math.cos(progress * Math.PI)) / 2;
  }, [frame]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setFrame(f => f + 1));
    return () => cancelAnimationFrame(handle);
  }, [frame]);

  const applyFormation = (formation: string) => {
    const formations: Record<string, {x: number, y: number, label: string}[]> = {
      '4-4-2': [
        {x: 10, y: 50, label: 'GK'},
        {x: 25, y: 20, label: 'LD'}, {x: 25, y: 40, label: 'ZAD'}, {x: 25, y: 60, label: 'ZAE'}, {x: 25, y: 80, label: 'LE'},
        {x: 45, y: 20, label: 'MD'}, {x: 45, y: 40, label: 'VOLD'}, {x: 45, y: 60, label: 'VOLE'}, {x: 45, y: 80, label: 'ME'},
        {x: 75, y: 35, label: 'ATD'}, {x: 75, y: 65, label: 'ATE'}
      ],
      '4-3-3': [
        {x: 10, y: 50, label: 'GK'},
        {x: 25, y: 20, label: 'LD'}, {x: 25, y: 40, label: 'ZAD'}, {x: 25, y: 60, label: 'ZAE'}, {x: 25, y: 80, label: 'LE'},
        {x: 45, y: 30, label: 'VOLD'}, {x: 45, y: 50, label: 'MC'}, {x: 45, y: 70, label: 'VOLE'},
        {x: 75, y: 20, label: 'PD'}, {x: 80, y: 50, label: 'CA'}, {x: 75, y: 80, label: 'PE'}
      ],
      '3-5-2': [
        {x: 10, y: 50, label: 'GK'},
        {x: 25, y: 30, label: 'ZAD'}, {x: 25, y: 50, label: 'ZAC'}, {x: 25, y: 70, label: 'ZAE'},
        {x: 45, y: 15, label: 'ALA D'}, {x: 45, y: 35, label: 'VOLD'}, {x: 45, y: 50, label: 'MC'}, {x: 45, y: 65, label: 'VOLE'}, {x: 45, y: 85, label: 'ALA E'},
        {x: 75, y: 40, label: 'ATD'}, {x: 75, y: 60, label: 'ATE'}
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
      team: 'A'
    }));

    const nextObjects = [...objects.filter(o => o.type !== 'player'), ...newPlayers];
    setObjects(nextObjects);
    onChange?.(JSON.stringify(nextObjects));
    toast.success(`Esquema ${formation} aplicado!`);
  };

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
      window.removeEventListener('resize', updateSize);
    };
  }, [activity.visualData]);

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

    if (type === 'ball' || type === 'player' || type === 'arrow') {
      newObj.animate = true;
      newObj.toX = 60;
      newObj.toY = 60;
    }

    const newObjects = [...objects, newObj];
    setObjects(newObjects);
    onChange?.(JSON.stringify(newObjects));
    setSelectedId(newObj.id);
  };

  const updateObject = (id: string, updates: Partial<VisualObject>) => {
    const newObjects = objects.map(obj => obj.id === id ? { ...obj, ...updates } : obj);
    setObjects(newObjects);
    onChange?.(JSON.stringify(newObjects));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const newObjects = objects.filter(o => o.id !== selectedId);
    setObjects(newObjects);
    setSelectedId(null);
    onChange?.(JSON.stringify(newObjects));
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
          const teamColor = TEAM_COLORS[obj.team || 'A'];
          element = (
            <Group>
              {obj.animate && obj.toX !== undefined && isEditable && (
                <Line 
                  points={[ox, oy, fieldBorder + (obj.toX / 100) * fw, fieldBorder + (obj.toY! / 100) * fh]} 
                  stroke={teamColor} 
                  strokeWidth={2} 
                  opacity={0.3} 
                  dash={[5, 2]} 
                />
              )}
              <Circle x={currentX} y={currentY} radius={fw * 0.025} fill={teamColor} stroke="#fff" strokeWidth={2} shadowBlur={isSelected ? 10 : 0} shadowColor="#fff" />
              <Text x={currentX - 6} y={currentY - 6} text={obj.label || ''} fontSize={10} fill={obj.team === 'D' ? '#000' : '#fff'} fontStyle="bold" align="center" width={12} />
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
          element = <Arrow points={[ox, oy, tx, ty]} stroke={obj.color || '#fff'} fill={obj.color || '#fff'} strokeWidth={3} pointerLength={10} pointerWidth={10} opacity={0.6} />;
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
          }}
        >
          {element}
          {isSelected && isEditable && (
            <Circle 
              x={currentX} 
              y={currentY} 
              radius={fw * 0.04} 
              stroke="#fff" 
              strokeWidth={1} 
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
            onDragEnd={(e) => handleDragEnd(obj.id, true, e)}
          >
            <Circle x={tox} y={toy} radius={fw * 0.02} fill="white" opacity={0.5} stroke="#000" strokeWidth={1} />
            <Text x={tox - 10} y={toy - 15} text={obj.type === 'arrow' ? 'FIM' : 'ALVO'} fontSize={8} fill="#fff" fontStyle="bold" />
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
            <button type="button" onClick={() => addObject('player')} className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap">
              <User size={14} /> Atleta
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
              onClick={() => { if(confirm("Limpar esquema tático?")) { setObjects([]); setSelectedId(null); onChange?.('[]'); } }} 
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
                    {selectedObject.animate ? "Ativo" : "Parado"}
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
                <Info size={14} /> Selecione um item para configurar
              </div>
            )}
          </div>
        </div>
      )}

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
        
        {!isEditable && objects.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-[2.5rem]">
              <Zap size={40} className="text-zinc-700 mb-2" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Nenhum esquema configurado</p>
           </div>
        )}

        {isEditable && (
          <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-2">
            <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-2xl">
              <Move size={12} className="text-theme-primary" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Modo Editor</span>
            </div>
          </div>
        )}
      </div>

      {!isEditable && (
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Simulação Tática Dinâmica</span>
           </div>
           <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{activity.modality} // {activity.difficulty}</div>
        </div>
      )}
    </div>
  );
}
