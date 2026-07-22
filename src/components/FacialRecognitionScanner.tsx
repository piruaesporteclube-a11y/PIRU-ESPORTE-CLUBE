import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Attendance, getSubCategory } from '../types';
import { api } from '../api';
import { 
  ScanFace, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Zap, 
  UserCheck, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  ShieldCheck, 
  Search,
  User,
  Clock,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface FacialRecognitionScannerProps {
  athletes: Athlete[];
  attendanceRecords: Record<string, Attendance[]>;
  activeTrainingId?: string;
  eventId?: string;
  date: string;
  onAthleteRecognized: (athlete: Athlete) => Promise<void>;
  onClose?: () => void;
  isLocked?: boolean;
}

export default function FacialRecognitionScanner({
  athletes,
  attendanceRecords,
  activeTrainingId,
  eventId,
  date,
  onAthleteRecognized,
  onClose,
  isLocked = false
}: FacialRecognitionScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [matchedAthlete, setMatchedAthlete] = useState<{
    athlete: Athlete;
    confidence: number;
    reasoning: string;
    scanTime: string;
  } | null>(null);
  
  const [recentScans, setRecentScans] = useState<Array<{
    athlete: Athlete;
    time: string;
  }>>([]);
  
  const [analysisStatus, setAnalysisStatus] = useState<string>('Posicione a câmera no rosto do aluno');
  const [candidateFilter, setCandidateFilter] = useState<string>('');
  
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<boolean>(false);
  const lastRecognizedIdRef = useRef<string | null>(null);

  // Synthesize pleasant sound chime for successful recognition
  const playSuccessChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      
      // First high note (C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Second higher note (G6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1567.98, now + 0.1);
      gain2.gain.setValueAtTime(0.2, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);

    } catch (e) {
      console.warn("Audio playback not allowed without user interaction", e);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setAnalysisStatus('Inicializando câmera do dispositivo...');
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setAnalysisStatus('Pronto! Posicione o rosto do aluno no quadro');
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (facingMode === 'environment') {
        // Fallback to front camera if back camera fails
        setFacingMode('user');
      } else {
        toast.error("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        setAnalysisStatus("Erro ao abrir câmera. Verifique as permissões.");
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, [facingMode]);

  // Capture Frame & Trigger Recognition
  const captureAndRecognize = async () => {
    if (isAnalyzing || cooldownRef.current || !videoRef.current || isLocked) return;
    
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) return;

    try {
      setIsAnalyzing(true);
      setAnalysisStatus('Analisando traços faciais...');

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Filter candidates with photos (limit to active athletes)
      const eligibleAthletes = athletes.filter(a => a.status === 'Ativo' && a.photo && a.photo.length > 10);

      if (eligibleAthletes.length === 0) {
        setAnalysisStatus('Atenção: Nenhum atleta ativo com foto cadastrada.');
        setIsAnalyzing(false);
        return;
      }

      // Prepare list of candidates for API
      const candidatesPayload = eligibleAthletes.map(a => ({
        id: a.id,
        name: a.name,
        photo: a.photo
      }));

      // Send to server-side Gemini Facial Recognition API
      const res = await api.recognizeFace(frameDataUrl, candidatesPayload);

      if (res && res.success && res.match && res.match.matchedAthleteId) {
        const matchedId = res.match.matchedAthleteId;
        const confidence = res.match.confidence || 0.85;
        const reasoning = res.match.reasoning || 'Reconhecimento facial confirmado por IA.';

        // Ensure student exists in local list
        const foundAthlete = athletes.find(a => a.id === matchedId);

        if (foundAthlete && confidence >= 0.60) {
          // Trigger successful recognition
          cooldownRef.current = true;
          lastRecognizedIdRef.current = foundAthlete.id;
          
          playSuccessChime();
          
          const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          setMatchedAthlete({
            athlete: foundAthlete,
            confidence: Math.round(confidence * 100),
            reasoning,
            scanTime: nowStr
          });

          // Register presence in database & local state
          await onAthleteRecognized(foundAthlete);

          setRecentScans(prev => [
            { athlete: foundAthlete, time: nowStr },
            ...prev.filter(item => item.athlete.id !== foundAthlete.id)
          ].slice(0, 5));

          setAnalysisStatus(`✅ Presença de ${foundAthlete.name} REGISTRADA!`);
          
          // Pause scan for 3.5 seconds to avoid repeated triggers
          setTimeout(() => {
            setMatchedAthlete(null);
            cooldownRef.current = false;
            setAnalysisStatus('Pronto para o próximo aluno!');
          }, 3500);

          setIsAnalyzing(false);
          return;
        }
      }

      setAnalysisStatus('Nenhum aluno reconhecido nesta captura. Alinhe o rosto no centro.');
    } catch (err) {
      console.warn("Facial recognition processing error:", err);
      setAnalysisStatus('Aguardando alinhamento do rosto...');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-scanning loop
  useEffect(() => {
    if (isAutoScanning && !isLocked) {
      scanTimerRef.current = setInterval(() => {
        if (!isAnalyzing && !cooldownRef.current) {
          captureAndRecognize();
        }
      }, 2000);
    } else {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    }

    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, [isAutoScanning, isAnalyzing, athletes, isLocked]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 md:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-theme-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
            <ScanFace size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                Reconhecimento Facial
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                IA em Tempo Real
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Aponte a câmera para o rosto do atleta para marcar presença automática pela foto do cadastro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Som Ativado" : "Som Mudo"}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              soundEnabled ? "bg-zinc-900 border-zinc-700 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
            )}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Switch Camera */}
          <button
            onClick={toggleFacingMode}
            title="Alternar Câmera (Frontal / Traseira)"
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw size={16} className="text-theme-primary" />
            <span className="hidden sm:inline">{facingMode === 'environment' ? 'Câmera Traseira' : 'Câmera Frontal'}</span>
          </button>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Camera Viewport (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl flex items-center justify-center group">
            
            {/* Live Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Face Alignment Oval & Overlay Graphics */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              
              {/* Outer Vignette Darkening */}
              <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/80" />

              {/* Animated Oval Face Guide Frame */}
              <div className={cn(
                "relative w-52 h-64 sm:w-64 sm:h-80 border-2 rounded-[50%] transition-all duration-300 flex items-center justify-center",
                matchedAthlete 
                  ? "border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.6)] bg-emerald-500/10 scale-105" 
                  : isAnalyzing 
                  ? "border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]" 
                  : "border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              )}>
                {/* Corner Crosshairs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-8 h-1 bg-emerald-400 rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 w-8 h-1 bg-emerald-400 rounded-full" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 h-8 w-1 bg-emerald-400 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 h-8 w-1 bg-emerald-400 rounded-full" />

                {/* Laser Scanning Bar Animation */}
                {isAutoScanning && !matchedAthlete && (
                  <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse" 
                       style={{ animation: 'scanMove 2s infinite ease-in-out' }} />
                )}

                {/* Center Target Marker */}
                {!matchedAthlete && (
                  <div className="text-emerald-400/50 flex flex-col items-center gap-1">
                    <ScanFace size={48} className="opacity-40 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70">
                      Rosto Aluno
                    </span>
                  </div>
                )}
              </div>

              {/* Status Badge at Top of Camera */}
              <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-auto">
                <div className="px-3.5 py-1.5 bg-black/80 backdrop-blur-md rounded-2xl border border-zinc-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full animate-ping",
                    isAnalyzing ? "bg-amber-400" : matchedAthlete ? "bg-emerald-400" : "bg-emerald-500"
                  )} />
                  <span className="text-zinc-200 font-mono text-[11px]">{analysisStatus}</span>
                </div>

                <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <ShieldCheck size={14} />
                  <span>Cadastros Ativos</span>
                </div>
              </div>

              {/* Recognized Match Card Overlay Popup */}
              <AnimatePresence>
                {matchedAthlete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="absolute inset-x-4 bottom-4 bg-gradient-to-r from-emerald-950/95 via-black/95 to-zinc-950/95 border-2 border-emerald-500 rounded-3xl p-4 shadow-[0_10px_40px_rgba(16,185,129,0.5)] backdrop-blur-xl flex items-center justify-between gap-4 pointer-events-auto z-20"
                  >
                    <div className="flex items-center gap-4">
                      {/* Student Photo */}
                      <div className="relative shrink-0">
                        {matchedAthlete.athlete.photo ? (
                          <img
                            src={matchedAthlete.athlete.photo}
                            alt={matchedAthlete.athlete.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-emerald-400 flex items-center justify-center text-zinc-400">
                            <User size={32} />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-1 shadow-md">
                          <CheckCircle2 size={16} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-black text-[10px] uppercase tracking-wider border border-emerald-500/30">
                          <Sparkles size={12} />
                          <span>Presença Confirmada • {matchedAthlete.scanTime}</span>
                        </div>
                        <h3 className="text-lg font-black text-white leading-tight">
                          {matchedAthlete.athlete.name}
                        </h3>
                        <p className="text-xs text-zinc-300 font-medium flex items-center gap-2">
                          <span>Categoria: <strong className="text-emerald-400 uppercase">{getSubCategory(matchedAthlete.athlete.birth_date)}</strong></span>
                          <span>•</span>
                          <span>Nº <strong className="text-emerald-400">{matchedAthlete.athlete.jersey_number || 'S/N'}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-emerald-400">
                        {matchedAthlete.confidence}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                        Precisão IA
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Scanner Bottom Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoScanning(!isAutoScanning)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md",
                  isAutoScanning 
                    ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                    : "bg-zinc-800 text-zinc-300 hover:text-white"
                )}
              >
                {isAutoScanning ? <Pause size={16} /> : <Play size={16} />}
                <span>{isAutoScanning ? 'Varredura Automática Ativa' : 'Pausado'}</span>
              </button>

              <button
                onClick={captureAndRecognize}
                disabled={isAnalyzing || isLocked}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border border-zinc-700 disabled:opacity-50 shadow-md"
              >
                <Camera size={16} className="text-theme-primary" />
                <span>Analisar Agora</span>
              </button>
            </div>

            <div className="text-xs text-zinc-400 font-medium">
              Atletas com Foto: <strong className="text-white">{athletes.filter(a => a.status === 'Ativo' && a.photo).length}</strong> de {athletes.length}
            </div>
          </div>
        </div>

        {/* Right Side Column (4 Cols): Recent Scans Feed & Quick Manual Attendance Backup */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Realtime Attendance Stream */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Últimas Presenças
                </h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-800 px-2 py-0.5 rounded-md">
                Sessão Atual
              </span>
            </div>

            {recentScans.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl space-y-1">
                <ScanFace size={24} className="mx-auto text-zinc-600 mb-1" />
                <p>Nenhuma presença registrada nesta sessão.</p>
                <p className="text-[11px] text-zinc-600">Aponte a câmera para os alunos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScans.map((item, idx) => (
                  <motion.div
                    key={`${item.athlete.id}_${item.time}_${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.athlete.photo ? (
                        <img
                          src={item.athlete.photo}
                          alt={item.athlete.name}
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-500/50 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <User size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {item.athlete.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {getSubCategory(item.athlete.birth_date)} • Nº {item.athlete.jersey_number || 'S/N'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black">
                        {item.time}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">
                        Presente
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Manual Search & Confirm Backup */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Search size={14} className="text-theme-primary" />
                <span>Confirmar Aluno Manualmente</span>
              </h3>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome ou número..."
                value={candidateFilter}
                onChange={e => setCandidateFilter(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-theme-primary"
              />
            </div>

            {candidateFilter.trim().length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                {athletes
                  .filter(a => a.status === 'Ativo' && (
                    a.name.toLowerCase().includes(candidateFilter.toLowerCase()) ||
                    (a.jersey_number && a.jersey_number.includes(candidateFilter))
                  ))
                  .slice(0, 5)
                  .map(athlete => {
                    const records = attendanceRecords[athlete.id] || [];
                    const isPresent = records.some(r => r.status === 'Presente');

                    return (
                      <div
                        key={athlete.id}
                        className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {athlete.photo ? (
                            <img src={athlete.photo} alt={athlete.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                              <User size={14} className="text-zinc-400" />
                            </div>
                          )}
                          <span className="font-bold text-white truncate">{athlete.name}</span>
                        </div>

                        <button
                          onClick={() => {
                            onAthleteRecognized(athlete);
                            toast.success(`Presença manual confirmada para ${athlete.name}`);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-black text-[10px] uppercase transition-all cursor-pointer shrink-0",
                            isPresent 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                              : "bg-theme-primary text-black hover:brightness-110"
                          )}
                        >
                          {isPresent ? 'Presente' : 'Marcar Presença'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
