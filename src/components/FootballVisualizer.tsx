import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group } from 'react-konva';
import { motion } from 'motion/react';
import { TrainingActivity } from '../types';

interface FootballVisualizerProps {
  activity: TrainingActivity;
  width?: number;
  height?: number;
}

export default function FootballVisualizer({ activity, width = 600, height = 400 }: FootballVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth } = containerRef.current;
      const h = (clientWidth * 2) / 3;
      setDimensions({ width: clientWidth, height: h });
    }

    const interval = setInterval(() => {
      setFrame(f => f + 1);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const { width: w, height: h } = dimensions;

  // Field measurements
  const fieldBorder = 20;
  const fw = w - fieldBorder * 2;
  const fh = h - fieldBorder * 2;

  // Animation constants
  const t = (frame % 100) / 100; // 0 to 1 cycle
  const pulse = Math.sin(frame * 0.1) * 2;

  // Logic to determine what to draw based on activity
  const renderDrill = () => {
    const category = activity.category;
    const name = activity.name.toUpperCase();

    if (category === 'Ataque' || name.includes('FINALIZAÇÃO') || name.includes('ATAQUE')) {
      // Striker drill
      const startX = fieldBorder + fw * 0.3;
      const startY = fieldBorder + fh * 0.5;
      const targetX = fieldBorder + fw * 0.9;
      const targetY = fieldBorder + fh * 0.5 + Math.sin(frame * 0.05) * 40;
      
      const currentX = startX + (targetX - startX) * t;
      const currentY = startY + (targetY - startY) * t;

      return (
        <>
          {/* Goal */}
          <Rect x={fieldBorder + fw - 10} y={fieldBorder + fh * 0.4} width={10} height={fh * 0.2} fill="#fff" />
          {/* Obstacles (cones) */}
          <Circle x={fieldBorder + fw * 0.6} y={fieldBorder + fh * 0.4} radius={8} fill="#f97316" />
          <Circle x={fieldBorder + fw * 0.6} y={fieldBorder + fh * 0.6} radius={8} fill="#f97316" />
          {/* Player */}
          <Circle x={startX} y={startY} radius={12} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
          {/* Ball */}
          <Circle x={currentX} y={currentY} radius={5} fill="#fff" shadowBlur={10} shadowColor="rgba(255,255,255,0.5)" />
          <Line points={[startX, startY, currentX, currentY]} stroke="#fff" strokeWidth={1} dash={[5, 5]} opacity={0.3} />
        </>
      );
    }

    if (activity.category === 'Coordenação Motora' || activity.name.includes('COORDENAÇÃO')) {
      // Agility ladder
      const ladderX = fieldBorder + fw * 0.2;
      const ladderY = fieldBorder + fh * 0.5;
      const stepWidth = 30;
      const numSteps = 6;
      
      const currentStep = Math.floor(t * numSteps);
      const playerX = ladderX + currentStep * stepWidth + stepWidth / 2;
      const sideShift = Math.sin(frame * 0.4) * 15;

      return (
        <Group>
          {/* Ladder */}
          {Array.from({ length: numSteps }).map((_, i) => (
            <Rect 
              key={i} 
              x={ladderX + i * stepWidth} 
              y={ladderY - 20} 
              width={stepWidth} 
              height={40} 
              stroke="#fff" 
              strokeWidth={1} 
              opacity={0.3} 
            />
          ))}
          {/* Player */}
          <Circle 
            x={playerX} 
            y={ladderY + sideShift} 
            radius={10} 
            fill="#eab308" 
            stroke="#fff" 
            strokeWidth={2} 
            shadowBlur={pulse > 0 ? pulse : 0}
            shadowColor="#eab308"
          />
        </Group>
      );
    }

    if (activity.category === 'Tático' || activity.name.includes('POSSE')) {
      // Possession rondo
      const centerX = fieldBorder + fw * 0.5;
      const centerY = fieldBorder + fh * 0.5;
      const radius = 60;
      const ballAngle = frame * 0.1;
      const ballX = centerX + Math.cos(ballAngle) * radius;
      const ballY = centerY + Math.sin(ballAngle) * radius;

      return (
        <>
          {/* Players in circle */}
          {[0, 90, 180, 270].map(angle => (
            <Circle 
              key={angle} 
              x={centerX + Math.cos((angle * Math.PI) / 180) * radius} 
              y={centerY + Math.sin((angle * Math.PI) / 180) * radius} 
              radius={10} 
              fill="#ef4444" 
              stroke="#fff" 
            />
          ))}
          {/* Players in middle */}
          <Circle x={centerX} y={centerY} radius={10} fill="#3b82f6" stroke="#fff" />
          {/* Ball */}
          <Circle x={ballX} y={ballY} radius={5} fill="#fff" />
        </>
      );
    }

    // Default: Generic movement
    const moveX = fieldBorder + fw * 0.2 + (fw * 0.6 * t);
    const moveY = fieldBorder + fh * 0.5 + Math.sin(frame * 0.1) * 20;

    return (
      <>
        <Circle x={moveX} y={moveY} radius={10} fill="#10b981" stroke="#fff" strokeWidth={2} />
        <Circle x={moveX + 15} y={moveY} radius={4} fill="#fff" />
      </>
    );
  };

  return (
    <div ref={containerRef} className="w-full bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-inner group">
      <Stage width={w} height={h}>
        <Layer>
          {/* Grass */}
          <Rect x={0} y={0} width={w} height={h} fill="#14532d" fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: w, y: h }} fillLinearGradientColorStops={[0, '#14532d', 1, '#064e3b']} />
          
          {/* Field Lines */}
          <Rect x={fieldBorder} y={fieldBorder} width={fw} height={fh} stroke="#ffffff" strokeWidth={2} opacity={0.2} />
          <Line points={[fieldBorder + fw / 2, fieldBorder, fieldBorder + fw / 2, fieldBorder + fh]} stroke="#ffffff" strokeWidth={2} opacity={0.2} />
          <Circle x={fieldBorder + fw / 2} y={fieldBorder + fh / 2} radius={fw * 0.1} stroke="#ffffff" strokeWidth={2} opacity={0.2} />
          
          {/* Penalty Areas */}
          <Rect x={fieldBorder} y={fieldBorder + fh * 0.25} width={fw * 0.15} height={fh * 0.5} stroke="#ffffff" strokeWidth={2} opacity={0.2} />
          <Rect x={fieldBorder + fw - fw * 0.15} y={fieldBorder + fh * 0.25} width={fw * 0.15} height={fh * 0.5} stroke="#ffffff" strokeWidth={2} opacity={0.2} />

          {/* Drills Layer */}
          {renderDrill()}
        </Layer>
      </Stage>
      <div className="p-4 bg-black/50 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Simulação Tática em Tempo Real
        </span>
        <span className="text-[10px] font-mono text-zinc-700 uppercase">{activity.category}</span>
      </div>
    </div>
  );
}
