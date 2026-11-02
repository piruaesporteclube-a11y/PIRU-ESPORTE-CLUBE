import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Attendance, getSubCategory } from '../types';
import { api } from '../api';
import { 
  Users, 
  Camera, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Check, 
  UserPlus, 
  AlertCircle, 
  Layers, 
  Search,
  ScanFace
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface GroupPhotoAttendanceProps {
  athletes: Athlete[];
  attendanceRecords: Record<string, Attendance[]>;
  date: string;
  activeTrainingId?: string;
  eventId?: string;
  onConfirmPresence: (athleteIds: string[]) => Promise<void>;
  onClose: () => void;
  isLocked?: boolean;
}

export default function GroupPhotoAttendance({
  athletes,
  attendanceRecords,
  date,
  onConfirmPresence,
  onClose,
  isLocked = false
}: GroupPhotoAttendanceProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  
  const [detectedAthletes, setDetectedAthletes] = useState<Array<{
    athleteId: string;
    athleteName: string;
    confidence: number;
    locationInPhoto?: string;
  }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalFacesCount, setTotalFacesCount] = useState<number>(0);
  const [summaryText, setSummaryText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Manual search to add an extra athlete if needed
  const [manualSearch, setManualSearch] = useState('');
  const [isManualSelectorOpen, setIsManualSelectorOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start Camera
  const startCamera = async (targetFacingMode?: 'environment' | 'user') => {
    const fMode = targetFacingMode || facingMode;
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: fMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      toast.error("Não foi possível acessar a câmera. Verifique as permissões de vídeo.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
    toast.info(`Câmera alternada para ${nextMode === 'user' ? 'Frontal (Selfie)' : 'Traseira'}.`);
  };

  useEffect(() => {
    if (mode === 'camera' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, capturedPhoto]);

  // Capture frame from video
  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(photoBase64);
    stopCamera();
    analyzeGroupPhoto(photoBase64);
  };

  // Upload photo file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCapturedPhoto(base64);
        stopCamera();
        analyzeGroupPhoto(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini Analysis
  const analyzeGroupPhoto = async (photoDataUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisStatus('Analisando fisionomia e rostos da turma com Inteligência Artificial...');

    try {
      // Filter candidates with registered photos
      const candidates = athletes
        .filter(a => a.photo && a.photo.trim().length > 10)
        .sort((a, b) => {
          const aBio = a.biometrics_face_registered ? 1 : 0;
          const bBio = b.biometrics_face_registered ? 1 : 0;
          if (aBio !== bBio) return bBio - aBio;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 60)
        .map(a => ({
          id: a.id,
          name: a.name,
          photo: a.photo!
        }));

      if (candidates.length === 0) {
        toast.error("Nenhum atleta possui foto cadastrada no sistema para comparação.");
        setIsAnalyzing(false);
        return;
      }

      const res = await api.recognizeGroupPhoto(photoDataUrl, candidates);

      if (res && res.success && Array.isArray(res.detectedAthletes)) {
        const detected = res.detectedAthletes;
        setDetectedAthletes(detected);
        setTotalFacesCount(res.totalFacesCount || detected.length);
        setSummaryText(res.summary || `${detected.length} atletas identificados na foto.`);

        // Pre-select all detected athletes
        const initialSelected = new Set<string>();
        detected.forEach((item: any) => {
          if (item.athleteId) {
            initialSelected.add(item.athleteId);
          }
        });
        setSelectedIds(initialSelected);

        if (detected.length > 0) {
          toast.success(`🎉 ${detected.length} atletas reconhecidos com sucesso na foto!`);
        } else {
          toast.info("A IA não conseguiu identificar correspondências exatas com os atletas cadastrados.");
        }
      } else {
        toast.error("Não foi possível analisar os rostos da foto.");
      }
    } catch (err: any) {
      console.error("Group photo recognition error:", err);
      toast.error(`Erro ao analisar foto: ${err.message || 'Falha na IA'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelectAthlete = (athleteId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  };

  const addManualAthlete = (athlete: Athlete) => {
    setSelectedIds(prev => new Set(prev).add(athlete.id));
    if (!detectedAthletes.some(d => d.athleteId === athlete.id)) {
      setDetectedAthletes(prev => [
        ...prev,
        {
          athleteId: athlete.id,
          athleteName: athlete.name,
          confidence: 1.0,
          locationInPhoto: "Adicionado manualmente pelo professor"
        }
      ]);
    }
    setIsManualSelectorOpen(false);
    setManualSearch('');
    toast.success(`${athlete.name} incluído na chamada!`);
  };

  const handleConfirmAll = async () => {
    if (selectedIds.size === 0) {
      toast.error("Nenhum atleta selecionado.");
      return;
    }
    setIsSaving(true);
    const loadingToast = toast.loading(`Registrando presença de ${selectedIds.size} atletas...`);
    try {
      await onConfirmPresence(Array.from(selectedIds));
      toast.success(`✅ Presença confirmada para ${selectedIds.size} alunos a partir da foto!`, { id: loadingToast });
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao salvar presença: ${err.message}`, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const resetPhoto = () => {
    setCapturedPhoto(null);
    setDetectedAthletes([]);
    setSelectedIds(new Set());
    setSummaryText('');
    setTotalFacesCount(0);
    if (mode === 'camera') {
      startCamera();
    }
  };

  const manualFilteredAthletes = athletes.filter(a => {
    if (selectedIds.has(a.id)) return false;
    if (!manualSearch.trim()) return true;
    const clean = manualSearch.toLowerCase();
    return a.name.toLowerCase().includes(clean) || (a.nickname || '').toLowerCase().includes(clean);
  });

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 no-print overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-zinc-950 border border-theme-primary/30 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-auto text-left relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-theme-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-theme-primary/20 border border-theme-primary/40 flex items-center justify-center text-theme-primary shadow-lg shadow-theme-primary/10">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Chamada por Foto da Turma
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-theme-primary text-black">
                  IA Coletiva
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Tire uma foto coletiva dos alunos reunidos. A IA identifica todos os presentes de uma só vez.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector (Camera vs Upload) when no photo is taken */}
        {!capturedPhoto && (
          <div className="flex bg-black p-1 rounded-2xl border border-zinc-800 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={cn(
                "flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                mode === 'camera'
                  ? "bg-theme-primary text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Camera size={14} />
              <span>Tirar Foto Agora</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                "flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                mode === 'upload'
                  ? "bg-theme-primary text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Upload size={14} />
              <span>Enviar da Galeria</span>
            </button>
          </div>
        )}

        {/* Live Camera View */}
        {mode === 'camera' && !capturedPhoto && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-black border-2 border-zinc-800 aspect-16/9 sm:aspect-16/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  facingMode === 'user' && "scale-x-[-1]"
                )}
              />

              {/* Group alignment overlay guides */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase text-theme-primary tracking-wider">
                  👥 Reúna todos os alunos no enquadramento
                </div>

                <div className="w-full max-w-md h-32 border-2 border-dashed border-theme-primary/50 rounded-2xl flex items-center justify-center">
                  <span className="text-[11px] font-black text-theme-primary/80 uppercase tracking-widest bg-black/70 px-3 py-1 rounded-xl">
                    Posicione a Turma Aqui
                  </span>
                </div>

                <div className="text-[9px] text-zinc-400 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase font-bold">
                  Dica: Peça para todos olharem de frente para a câmera
                </div>
              </div>
            </div>

            {/* Camera Controls */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                title="Alternar entre câmera frontal e traseira"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">
                  {facingMode === 'environment' ? 'Usar Câmera Selfie' : 'Usar Câmera Traseira'}
                </span>
                <span className="sm:hidden">Trocar</span>
              </button>

              <button
                type="button"
                onClick={capturePhotoFromCamera}
                className="flex-1 max-w-xs py-3.5 bg-theme-primary hover:bg-theme-primary/90 text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-theme-primary/20 cursor-pointer"
              >
                <Camera size={18} />
                <span>Capturar Foto da Turma</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload Mode Box */}
        {mode === 'upload' && !capturedPhoto && (
          <div className="p-8 sm:p-12 border-2 border-dashed border-zinc-800 hover:border-theme-primary/50 rounded-3xl bg-black/40 flex flex-col items-center justify-center text-center space-y-4 transition-all">
            <div className="w-16 h-16 rounded-3xl bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-theme-primary">
              <Upload size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Carregue a foto coletiva da turma
              </h4>
              <p className="text-xs text-zinc-400 max-w-md">
                Selecione uma foto tirada com seu celular no gramado ou quadra onde os alunos apareçam juntos.
              </p>
            </div>

            <label className="px-6 py-3 bg-theme-primary hover:bg-theme-primary/90 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-theme-primary/20 inline-flex items-center gap-2">
              <Upload size={16} />
              <span>Escolher Foto no Dispositivo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}

        {/* Photo Captured & Analysis / Recognition Results */}
        {capturedPhoto && (
          <div className="space-y-5">
            {/* Photo Thumbnail Banner with Scan Effect */}
            <div className="relative rounded-3xl overflow-hidden border border-zinc-800 max-h-56 flex items-center justify-center bg-black">
              <img
                src={capturedPhoto}
                className="w-full h-full object-cover max-h-56 filter brightness-95"
                alt="Foto da Turma"
              />

              {/* Scanning Laser Beam overlay while analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-theme-primary/10 flex flex-col items-center justify-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-theme-primary to-transparent animate-scan absolute top-0" />
                  <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-theme-primary/40 flex items-center gap-2 text-xs font-black text-theme-primary uppercase tracking-wider animate-pulse">
                    <Sparkles size={16} />
                    <span>{analysisStatus}</span>
                  </div>
                </div>
              )}

              {!isAnalyzing && (
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 flex items-center gap-2 text-[11px] font-black text-white uppercase">
                  <span>📸 Foto da Turma Processada</span>
                  <button
                    type="button"
                    onClick={resetPhoto}
                    className="ml-2 text-theme-primary hover:underline cursor-pointer"
                  >
                    Tirar Outra Foto
                  </button>
                </div>
              )}
            </div>

            {/* Results Grid when not analyzing */}
            {!isAnalyzing && (
              <div className="space-y-4">
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>{detectedAthletes.length} Alunos Identificados pela IA</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {selectedIds.size} de {detectedAthletes.length} selecionados para presença de hoje ({date}).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIds.size === detectedAthletes.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(detectedAthletes.map(d => d.athleteId)));
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-zinc-700 transition-all cursor-pointer"
                    >
                      {selectedIds.size === detectedAthletes.length ? "Desmarcar Todos" : "Marcar Todos"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsManualSelectorOpen(!isManualSelectorOpen)}
                      className="px-3 py-1.5 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary rounded-xl text-[10px] font-black uppercase tracking-wider border border-theme-primary/30 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <UserPlus size={12} />
                      <span>+ Adicionar Aluno</span>
                    </button>
                  </div>
                </div>

                {/* Manual Student Inserter Modal Dropdown */}
                {isManualSelectorOpen && (
                  <div className="p-3.5 bg-zinc-900 border border-theme-primary/30 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        Selecione um aluno para incluir na chamada desta foto:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsManualSelectorOpen(false)}
                        className="text-zinc-500 hover:text-white p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar aluno por nome..."
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto divide-y divide-zinc-800/60 border border-zinc-800 rounded-xl">
                      {manualFilteredAthletes.slice(0, 15).map(ath => (
                        <div
                          key={ath.id}
                          onClick={() => addManualAthlete(ath)}
                          className="flex items-center justify-between p-2 hover:bg-zinc-800/80 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                              {ath.photo ? (
                                <img src={ath.photo} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                  {ath.name[0]}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-white uppercase">{ath.name}</span>
                          </div>
                          <span className="text-[10px] text-theme-primary font-mono">{getSubCategory(ath.birth_date)}</span>
                        </div>
                      ))}
                      {manualFilteredAthletes.length === 0 && (
                        <div className="p-3 text-center text-xs text-zinc-500">
                          Nenhum outro atleta encontrado.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* List of Detected Athletes */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {detectedAthletes.map((item) => {
                    const athlete = athletes.find(a => a.id === item.athleteId);
                    const isChecked = selectedIds.has(item.athleteId);

                    return (
                      <div
                        key={item.athleteId}
                        onClick={() => toggleSelectAthlete(item.athleteId)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                          isChecked
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                            : "bg-zinc-900/40 border-zinc-800/80 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Checkbox indicator */}
                          <div
                            className={cn(
                              "w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0",
                              isChecked
                                ? "bg-emerald-500 border-emerald-400 text-black shadow-sm"
                                : "bg-black border-zinc-700 text-transparent"
                            )}
                          >
                            <Check size={14} className="stroke-[3.5]" />
                          </div>

                          {/* Athlete Photo */}
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                            {athlete?.photo ? (
                              <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                {item.athleteName[0]}
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-black text-white uppercase truncate">
                              {athlete?.name || item.athleteName}
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium truncate">
                              {athlete && (
                                <span className="text-theme-primary font-bold">{getSubCategory(athlete.birth_date)}</span>
                              )}
                              {item.locationInPhoto && (
                                <span>• {item.locationInPhoto}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Confidence Tag */}
                        <div className="shrink-0 text-right ml-2">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {Math.round(item.confidence * 100)}% Match
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {detectedAthletes.length === 0 && (
                    <div className="py-8 text-center bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-2">
                      <AlertCircle className="mx-auto text-zinc-500" size={28} />
                      <p className="text-xs font-bold text-zinc-400 uppercase">
                        Nenhum aluno identificado automaticamente nesta foto.
                      </p>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                        Tente tirar uma foto mais próxima, com iluminação frontal, ou adicione os alunos manualmente pelo botão acima.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmation Footer Bar */}
                <div className="border-t border-zinc-850 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={resetPhoto}
                    className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Tirar Nova Foto
                  </button>

                  <button
                    type="button"
                    disabled={selectedIds.size === 0 || isSaving || isLocked}
                    onClick={handleConfirmAll}
                    className={cn(
                      "w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer",
                      selectedIds.size > 0 && !isSaving && !isLocked
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 hover:scale-102 active:scale-98"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60"
                    )}
                  >
                    <CheckCircle2 size={18} />
                    <span>Confirmar Presença dos {selectedIds.size} Alunos (1 Clique)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
