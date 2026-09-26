import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Athlete, Attendance, getSubCategory } from '../types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  UserCheck, 
  User, 
  Search, 
  RotateCcw, 
  Check, 
  ArrowRight, 
  Layers, 
  HelpCircle,
  Radio,
  Clock,
  Shirt,
  Volume1
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../utils';

interface VoiceAttendanceScannerProps {
  athletes: Athlete[];
  attendanceRecords: Record<string, Attendance[]>;
  activeTrainingId?: string;
  eventId?: string;
  date: string;
  isLocked?: boolean;
  onClose?: () => void;
  onAthleteRecognized: (athlete: Athlete) => Promise<void>;
  onMarkAbsence?: (athlete: Athlete, justification?: string) => Promise<void>;
}

// Helper to remove accents and special characters
function normalizePortuguese(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert numbers in words to digits for jersey or candidate matching
function parseSpokenNumbers(text: string): string {
  const map: Record<string, string> = {
    'zero': '0', 'um': '1', 'uma': '1', 'primeiro': '1', 'primeira': '1',
    'dois': '2', 'duas': '2', 'segundo': '2', 'segunda': '2',
    'tres': '3', 'terceiro': '3', 'terceira': '3',
    'quatro': '4', 'quarto': '4',
    'cinco': '5', 'quinto': '5',
    'seis': '6', 'meia': '6', 'sexto': '6',
    'sete': '7', 'setimo': '7',
    'oito': '8', 'oitavo': '8',
    'nove': '9', 'nono': '9',
    'dez': '10', 'decimo': '10'
  };
  let words = text.split(' ');
  return words.map(w => map[w] || w).join(' ');
}

export default function VoiceAttendanceScanner({
  athletes,
  attendanceRecords,
  activeTrainingId,
  eventId,
  date,
  isLocked = false,
  onClose,
  onAthleteRecognized,
  onMarkAbsence
}: VoiceAttendanceScannerProps) {
  // Speech recognition states
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [soundFeedback, setSoundFeedback] = useState<boolean>(true);
  const [voiceSynthesisFeedback, setVoiceSynthesisFeedback] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Recognition / Card states
  const [matchedAthlete, setMatchedAthlete] = useState<Athlete | null>(null);
  const [candidateMatches, setCandidateMatches] = useState<{ athlete: Athlete; score: number }[]>([]);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [lastActionMessage, setLastActionMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [recentPresences, setRecentPresences] = useState<{ athlete: Athlete; time: string }[]>([]);

  // Simulation fallback input
  const [simulationInput, setSimulationInput] = useState<string>('');

  // Audio level visualizer state
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // References
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const confirmationCooldownRef = useRef<boolean>(false);

  // Active eligible athletes (active status preferred)
  const eligibleAthletes = useMemo(() => {
    return athletes.filter(a => a.status === 'Ativo' || !a.status);
  }, [athletes]);

  // Audio chimes
  const playChime = useCallback((type: 'success' | 'match' | 'cancel' | 'error') => {
    if (!soundFeedback) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'match') {
        // High double tone for card found
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success') {
        // Cheerful major arpeggio for presence confirmed
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.25, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
      } else if (type === 'cancel') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio chime failed', e);
    }
  }, [soundFeedback]);

  // Voice synthesis feedback (Portuguese)
  const speakText = useCallback((text: string) => {
    if (!voiceSynthesisFeedback || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.1; // natural tempo
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  }, [voiceSynthesisFeedback]);

  // Check if athlete is already present in this training/event/date
  const isAthletePresent = useCallback((athleteId: string) => {
    const records = attendanceRecords[athleteId] || [];
    return records.some(r => {
      if (activeTrainingId) return r.training_id === activeTrainingId && r.status === 'Presente';
      if (eventId) return r.event_id === eventId && r.status === 'Presente';
      return r.status === 'Presente';
    });
  }, [attendanceRecords, activeTrainingId, eventId]);

  // Confirm presence for the given athlete
  const handleConfirmPresence = useCallback(async (athlete: Athlete) => {
    if (isLocked) {
      toast.error('Chamada bloqueada para alterações.');
      return;
    }
    if (confirmationCooldownRef.current) return;
    confirmationCooldownRef.current = true;
    setIsConfirming(true);

    try {
      await onAthleteRecognized(athlete);

      playChime('success');
      const displayName = athlete.nickname || athlete.name.split(' ')[0];
      speakText(`Presença de ${displayName} confirmada!`);

      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setRecentPresences(prev => [{ athlete, time: nowTime }, ...prev.filter(p => p.athlete.id !== athlete.id)].slice(0, 8));

      setLastActionMessage({
        text: `Presença confirmada: ${athlete.name}`,
        type: 'success'
      });

      toast.success(`✅ Presença de ${athlete.name} registrada com sucesso!`);

      // Briefly keep card visible with checkmark, then reset to listen for next
      setTimeout(() => {
        setMatchedAthlete(null);
        setCandidateMatches([]);
        setIsConfirming(false);
        confirmationCooldownRef.current = false;
        setTranscript('');
        setInterimTranscript('');
      }, 1300);
    } catch (err: any) {
      setIsConfirming(false);
      confirmationCooldownRef.current = false;
      playChime('error');
      toast.error(`Erro ao salvar presença: ${err?.message || 'erro de rede'}`);
    }
  }, [isLocked, onAthleteRecognized, playChime, speakText]);

  // Mark absence with optional justification
  const handleConfirmAbsence = useCallback(async (athlete: Athlete, reason = 'Falta registrada por voz') => {
    if (isLocked) {
      toast.error('Chamada bloqueada.');
      return;
    }
    if (confirmationCooldownRef.current) return;
    confirmationCooldownRef.current = true;

    try {
      if (onMarkAbsence) {
        await onMarkAbsence(athlete, reason);
      }
      playChime('cancel');
      const displayName = athlete.nickname || athlete.name.split(' ')[0];
      speakText(`Falta de ${displayName} registrada.`);

      setLastActionMessage({
        text: `Falta registrada: ${athlete.name}`,
        type: 'info'
      });
      toast.info(`Ausência de ${athlete.name} registrada.`);

      setTimeout(() => {
        setMatchedAthlete(null);
        setCandidateMatches([]);
        confirmationCooldownRef.current = false;
        setTranscript('');
        setInterimTranscript('');
      }, 1000);
    } catch (err: any) {
      confirmationCooldownRef.current = false;
      toast.error('Erro ao registrar falta.');
    }
  }, [isLocked, onMarkAbsence, playChime, speakText]);

  // Cancel currently matched card
  const handleCancelSelection = useCallback(() => {
    playChime('cancel');
    setMatchedAthlete(null);
    setCandidateMatches([]);
    setTranscript('');
    setInterimTranscript('');
    setLastActionMessage({
      text: 'Seleção cancelada. Fale o nome do atleta.',
      type: 'info'
    });
  }, [playChime]);

  // Evaluate candidate matching score for an athlete given spoken text
  const scoreAthleteMatch = useCallback((athlete: Athlete, spokenNorm: string): number => {
    const nameNorm = normalizePortuguese(athlete.name);
    const nicknameNorm = normalizePortuguese(athlete.nickname || '');
    const jersey = (athlete.jersey_number || '').trim();

    // Exact matches
    if (spokenNorm === nameNorm) return 100;
    if (nicknameNorm && spokenNorm === nicknameNorm) return 98;

    // Check jersey number if mentioned
    if (jersey && (spokenNorm.includes(`camisa ${jersey}`) || spokenNorm.includes(`numero ${jersey}`) || spokenNorm === jersey)) {
      return 95;
    }

    const nameParts = nameNorm.split(' ').filter(p => p.length >= 2);
    const spokenParts = spokenNorm.split(' ').filter(p => p.length >= 2);

    if (nameParts.length === 0 || spokenParts.length === 0) return 0;

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    // Spoken contains exact full name
    if (spokenNorm.includes(nameNorm)) return 92;

    // Both first name and last name spoken
    if (spokenParts.includes(firstName) && spokenParts.includes(lastName)) return 90;

    // Nickname matched as whole word
    if (nicknameNorm && spokenParts.includes(nicknameNorm)) return 88;

    // Spoken starts with or matches first name
    if (spokenParts.includes(firstName)) {
      // If there are other names in spoken text matching middle or last names
      const otherMatches = nameParts.slice(1).filter(np => spokenParts.includes(np));
      if (otherMatches.length > 0) return 85;
      return 75; // single first name match
    }

    // Check if spoken contains nickname as substring
    if (nicknameNorm && nicknameNorm.length >= 3 && spokenNorm.includes(nicknameNorm)) return 72;

    // Check surname match
    if (spokenParts.includes(lastName) && lastName.length >= 4) return 65;

    // Partial start-with
    if (firstName.length >= 4 && spokenParts.some(sp => sp.length >= 4 && (firstName.startsWith(sp) || sp.startsWith(firstName)))) {
      return 60;
    }

    return 0;
  }, []);

  // Process any speech command (spoken or simulated)
  const processVoiceCommand = useCallback((rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const cleanText = parseSpokenNumbers(normalizePortuguese(rawText));

    console.log('[Voice Attendance] Processed command:', cleanText, 'Raw:', rawText);

    // 1. If currently an athlete card is displayed waiting for confirmation
    if (matchedAthlete) {
      // Check confirmation commands: "ok", "sim", "confirma", "confirmar", "presente", "marca", etc.
      const isConfirmCmd = /\b(ok|okay|o k|sim|confirma|confirmar|confirmado|presente|marca|marcar|certo|positivo|pode marcar|isso|valida|validar)\b/i.test(cleanText);
      if (isConfirmCmd) {
        handleConfirmPresence(matchedAthlete);
        return;
      }

      // Check absence commands: "falta", "faltou", "ausente"
      const isAbsenceCmd = /\b(falta|faltou|ausente|nao veio|nao compareceu)\b/i.test(cleanText);
      if (isAbsenceCmd) {
        handleConfirmAbsence(matchedAthlete);
        return;
      }

      // Check cancel commands: "cancelar", "cancela", "voltar", "limpar", "trocar", "nenhum", "outro"
      const isCancelCmd = /\b(cancelar|cancela|voltar|limpar|nenhum|outro|trocar|esquece|apagar|nao e ele|nao)\b/i.test(cleanText);
      if (isCancelCmd) {
        handleCancelSelection();
        return;
      }
    }

    // 2. If multiple candidates are shown and waiting for choice (e.g. "1", "2", "primeiro", "segundo")
    if (candidateMatches.length > 1) {
      if (/\b(1|primeiro|primeira|opcao um|o primeiro)\b/i.test(cleanText)) {
        const chosen = candidateMatches[0].athlete;
        setMatchedAthlete(chosen);
        setCandidateMatches([]);
        playChime('match');
        speakText(`Atleta ${chosen.name}. Diga OK para confirmar presença.`);
        return;
      }
      if (/\b(2|segundo|segunda|opcao dois|o segundo)\b/i.test(cleanText) && candidateMatches[1]) {
        const chosen = candidateMatches[1].athlete;
        setMatchedAthlete(chosen);
        setCandidateMatches([]);
        playChime('match');
        speakText(`Atleta ${chosen.name}. Diga OK para confirmar presença.`);
        return;
      }
      if (/\b(3|terceiro|terceira|opcao tres|o terceiro)\b/i.test(cleanText) && candidateMatches[2]) {
        const chosen = candidateMatches[2].athlete;
        setMatchedAthlete(chosen);
        setCandidateMatches([]);
        playChime('match');
        speakText(`Atleta ${chosen.name}. Diga OK para confirmar presença.`);
        return;
      }
    }

    // 3. Search for athlete by name / nickname / jersey
    // Filter out pure command words so they don't accidentally match
    const isControlWord = /^(ok|sim|nao|cancelar|limpar|ajuda|teste|chamada|presenca|fala|falta)$/i.test(cleanText);
    if (isControlWord && !matchedAthlete) {
      return;
    }

    // Strip generic filler phrases: "presenca do", "marcar presenca de", "atleta", "aluno", "por favor"
    const searchTarget = cleanText
      .replace(/\b(marcar|marca|presenca|chamada|do|da|de|aluno|atleta|o|a|por favor|confirma)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!searchTarget || searchTarget.length < 2) return;

    // Score all eligible athletes
    const scored = eligibleAthletes.map(a => ({
      athlete: a,
      score: scoreAthleteMatch(a, searchTarget)
    })).filter(item => item.score >= 60);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const topScore = scored[0].score;
      // If there are multiple close matches (e.g. score >= 75 and within 10 points)
      const closeMatches = scored.filter(s => s.score >= 70 && (topScore - s.score) <= 15);

      if (closeMatches.length > 1) {
        setCandidateMatches(closeMatches.slice(0, 3));
        setMatchedAthlete(closeMatches[0].athlete);
        playChime('match');
        speakText(`Encontrei ${closeMatches.length} atletas. Diga OK para ${closeMatches[0].athlete.name}, ou diga o sobrenome.`);
      } else {
        const best = scored[0].athlete;
        setMatchedAthlete(best);
        setCandidateMatches([]);
        playChime('match');
        const displayName = best.nickname || best.name.split(' ')[0];
        speakText(`${displayName}! Diga OK para confirmar.`);
      }
    } else {
      // No match found
      if (cleanText.length >= 3 && !isControlWord) {
        setLastActionMessage({
          text: `Nenhum atleta encontrado para "${rawText}". Tente falar o nome ou sobrenome.`,
          type: 'warn'
        });
      }
    }
  }, [matchedAthlete, candidateMatches, eligibleAthletes, scoreAthleteMatch, handleConfirmPresence, handleConfirmAbsence, handleCancelSelection, playChime, speakText]);

  // Audio level visualizer with MediaStream
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let localContext: AudioContext | null = null;

    const startAudioVisualizer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        microphoneStreamRef.current = stream;
        localStream = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        localContext = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err: any) {
        console.warn('Audio visualizer stream unavailable:', err);
      }
    };

    if (isListening) {
      startAudioVisualizer();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (localContext && localContext.state !== 'closed') {
        try { localContext.close(); } catch (e) {}
      }
    };
  }, [isListening]);

  // SpeechRecognition initialization and auto-restart loop
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      toast.warning('O reconhecimento de voz nativo não está disponível neste navegador. Você pode simular os comandos de voz no campo abaixo.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      setMicPermissionDenied(false);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript + ' ';
        } else {
          interim += res[0].transcript + ' ';
        }
      }

      if (interim) {
        setInterimTranscript(interim.trim());
      }

      if (final.trim()) {
        const spoken = final.trim();
        setTranscript(spoken);
        setInterimTranscript('');
        processVoiceCommand(spoken);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicPermissionDenied(true);
        setIsListening(false);
        shouldListenRef.current = false;
        toast.error('Permissão de microfone negada. Conceda acesso nas configurações do navegador.');
      } else if (event.error === 'no-speech') {
        // Normal silence, will auto-restart
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // If we should still be listening (component mounted and not paused), restart automatically!
      if (shouldListenRef.current && !micPermissionDenied) {
        try {
          recognition.start();
        } catch (e) {
          // Retry after small delay
          setTimeout(() => {
            if (shouldListenRef.current) {
              try { recognition.start(); } catch (err) {}
            }
          }, 300);
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('Could not start recognition initially', err);
    }

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [processVoiceCommand, micPermissionDenied]);

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      shouldListenRef.current = false;
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      toast.info('Microfone pausado.');
    } else {
      shouldListenRef.current = true;
      try { recognitionRef.current.start(); } catch (e) {}
      setIsListening(true);
      toast.success('Microfone ouvindo novamente!');
    }
  };

  // Keyboard shortcut: Spacebar toggles voice, Enter confirms OK if matched
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        toggleListening();
      } else if (e.key === 'Enter' && matchedAthlete) {
        e.preventDefault();
        handleConfirmPresence(matchedAthlete);
      } else if (e.key === 'Escape') {
        if (matchedAthlete) {
          handleCancelSelection();
        } else if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening, matchedAthlete, handleConfirmPresence, handleCancelSelection, onClose]);

  return (
    <div className="bg-zinc-950 border-2 border-amber-500/50 rounded-3xl p-5 md:p-7 shadow-[0_20px_60px_rgba(245,158,11,0.25)] relative overflow-hidden text-white">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl shadow-lg transition-all duration-300",
            isListening 
              ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse" 
              : "bg-zinc-800 text-zinc-400"
          )}>
            <Mic size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-black uppercase tracking-wider text-white">
                Chamada por Comando de Voz
              </h3>
              <span className={cn(
                "text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border flex items-center gap-1.5",
                isListening 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40" 
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isListening ? "bg-amber-400 animate-ping" : "bg-zinc-500")} />
                {isListening ? "Ouvindo em Tempo Real" : "Microfone Pausado"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Fale o <strong className="text-white">Nome ou Apelido</strong> do atleta. O card aparecerá na tela e ao dizer <strong className="text-amber-400 font-black">"OK"</strong> a presença é gravada!
            </p>
          </div>
        </div>

        {/* Action icons / toggles */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Audio Equalizer visualizer */}
          {isListening && (
            <div className="hidden sm:flex items-center gap-1 px-3 py-2 bg-zinc-900 border border-amber-500/30 rounded-xl" title="Sensibilidade de áudio">
              <div className="flex items-end gap-0.5 h-4 w-12">
                {[15, 35, 60, 90, 45, 75, 30].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(15, Math.min(100, (audioLevel / 100) * h + Math.random() * 20))}%`
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400">{audioLevel}%</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border",
              isListening
                ? "bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700"
            )}
            title={isListening ? "Pausar reconhecimento" : "Ativar microfone"}
          >
            {isListening ? <Mic size={15} /> : <MicOff size={15} />}
            <span className="hidden sm:inline">{isListening ? 'Ouvindo' : 'Ligar Mic'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundFeedback(!soundFeedback)}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              soundFeedback 
                ? "bg-zinc-900 border-zinc-700 text-amber-400 hover:text-white" 
                : "bg-zinc-900/60 border-zinc-800 text-zinc-600"
            )}
            title={soundFeedback ? "Sons ativados (Bipes de sucesso)" : "Sons desativados"}
          >
            {soundFeedback ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !voiceSynthesisFeedback;
              setVoiceSynthesisFeedback(next);
              if (next) speakText("Resposta por voz ativada");
            }}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              voiceSynthesisFeedback 
                ? "bg-zinc-900 border-emerald-500/40 text-emerald-400" 
                : "bg-zinc-900/60 border-zinc-800 text-zinc-600"
            )}
            title={voiceSynthesisFeedback ? "Voz do Sistema Ativa (Fala confirmação)" : "Voz do Sistema Muda"}
          >
            <Radio size={16} />
          </button>

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Comandos disponíveis"
          >
            <HelpCircle size={16} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Fechar chamada por voz"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Help Drawer if opened */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4 mb-5 text-xs space-y-2"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Comandos de Voz Reconhecidos:
              </span>
              <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-zinc-300">
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <strong className="text-white block font-bold mb-1">1. Falar Nome do Aluno</strong>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Ex: <span className="text-amber-300">"Gabriel"</span>, <span className="text-amber-300">"Lucas Silva"</span>, <span className="text-amber-300">"Pelezinho"</span> ou <span className="text-amber-300">"Camisa 10"</span>.
                </p>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <strong className="text-emerald-400 block font-bold mb-1">2. Confirmar Presença ("OK")</strong>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Quando o card aparecer, diga: <span className="text-emerald-300">"OK"</span>, <span className="text-emerald-300">"Sim"</span>, <span className="text-emerald-300">"Confirmar"</span> ou <span className="text-emerald-300">"Presente"</span>.
                </p>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <strong className="text-rose-400 block font-bold mb-1">3. Cancelar ou Trocar</strong>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Diga: <span className="text-rose-300">"Cancelar"</span>, <span className="text-rose-300">"Outro"</span> ou simplesmente fale o nome de outro aluno diretamente.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission alert if mic blocked */}
      {micPermissionDenied && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl mb-6 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-400 shrink-0" />
            <div className="text-xs">
              <strong className="text-rose-300 font-bold block">Acesso ao Microfone Bloqueado</strong>
              <p className="text-zinc-400">Clique no ícone de cadeado/permissões ao lado da barra de endereço do navegador e selecione "Permitir Microfone", depois recarregue.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Card Focus + Live Transcript + Recent presences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Active Athlete Card & Voice Command Area */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Live Audio Transcript Box */}
          <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Radio size={12} className={isListening ? "text-amber-400 animate-pulse" : "text-zinc-600"} />
                Transcrição ao Vivo:
              </span>
              {(transcript || interimTranscript) && (
                <button
                  type="button"
                  onClick={() => { setTranscript(''); setInterimTranscript(''); }}
                  className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="min-h-[46px] flex items-center">
              {transcript || interimTranscript ? (
                <p className="text-sm sm:text-base font-bold text-white tracking-wide">
                  "{transcript || interimTranscript}"
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-500 italic flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400/80 animate-ping inline-block" />
                  {matchedAthlete 
                    ? `Diga em voz alta: "OK" para confirmar presença de ${matchedAthlete.nickname || matchedAthlete.name.split(' ')[0]}...` 
                    : "Fale em voz alta o nome do atleta (ex: \"Gabriel\", \"Lucas\", \"Arthur\")..."}
                </p>
              )}
            </div>

            {/* Instruction banner based on state */}
            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[11px]">
              {matchedAthlete ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-400" />
                  Atleta encontrado! Diga <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 uppercase font-black">"OK"</span> no microfone.
                </span>
              ) : (
                <span className="text-zinc-400 font-medium">
                  💡 Dica: Você também pode falar <strong className="text-amber-300">"Camisa 10"</strong> ou apelidos.
                </span>
              )}

              {lastActionMessage && (
                <span className={cn(
                  "font-bold truncate max-w-[240px]",
                  lastActionMessage.type === 'success' ? "text-emerald-400" : lastActionMessage.type === 'warn' ? "text-amber-400" : "text-zinc-400"
                )}>
                  {lastActionMessage.text}
                </span>
              )}
            </div>
          </div>

          {/* THE ATHLETE CARD (as requested: "o sistema mostraria o card e com o comando de ok por voz registraria a presença") */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {matchedAthlete ? (
                <motion.div
                  key={matchedAthlete.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "rounded-3xl p-6 border-2 transition-all relative overflow-hidden",
                    isConfirming 
                      ? "bg-emerald-950/80 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.5)]" 
                      : isAthletePresent(matchedAthlete.id)
                        ? "bg-gradient-to-br from-zinc-900 via-emerald-950/30 to-zinc-950 border-emerald-500/60 shadow-xl shadow-emerald-500/10"
                        : "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-amber-500/60 shadow-2xl shadow-amber-500/15"
                  )}
                >
                  {/* Status watermark */}
                  <div className="absolute top-4 right-4 z-10">
                    {isAthletePresent(matchedAthlete.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Já Presente Hoje
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <Clock size={14} className="text-amber-400" />
                        Aguardando "OK"
                      </span>
                    )}
                  </div>

                  {/* Top card row: Photo + Athlete Details */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
                    
                    {/* Athlete Photo with glowing frame */}
                    <div className="relative group shrink-0">
                      <div className={cn(
                        "w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 shadow-xl transition-all relative",
                        isAthletePresent(matchedAthlete.id) 
                          ? "border-emerald-400 shadow-emerald-500/30" 
                          : "border-amber-400 shadow-amber-500/30"
                      )}>
                        {matchedAthlete.photo && matchedAthlete.photo.trim() !== '' ? (
                          <img 
                            src={matchedAthlete.photo} 
                            alt={matchedAthlete.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center text-zinc-500">
                            <User size={48} />
                            <span className="text-[10px] font-bold uppercase mt-1">Sem Foto</span>
                          </div>
                        )}
                      </div>

                      {/* Jersey number badge */}
                      {matchedAthlete.jersey_number && (
                        <div className="absolute -bottom-2 -right-2 bg-black border-2 border-amber-400 text-amber-300 px-2.5 py-0.5 rounded-xl text-xs font-black uppercase shadow-lg flex items-center gap-1">
                          <Shirt size={12} />
                          <span>#{matchedAthlete.jersey_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Athlete Text Metadata */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="px-2.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] font-black uppercase text-amber-400">
                          {getSubCategory(matchedAthlete.birth_date)}
                        </span>
                        {matchedAthlete.position && (
                          <span className="px-2.5 py-0.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-[10px] font-bold uppercase text-zinc-300">
                            {matchedAthlete.position}
                          </span>
                        )}
                        {matchedAthlete.modality && (
                          <span className="px-2.5 py-0.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-[10px] font-bold uppercase text-zinc-400">
                            {matchedAthlete.modality}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight truncate">
                        {matchedAthlete.name}
                      </h2>

                      {matchedAthlete.nickname && (
                        <p className="text-sm font-black text-amber-400 uppercase tracking-wider mt-0.5">
                          "{matchedAthlete.nickname}"
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-zinc-400">
                        <span>Doc: <strong className="text-zinc-200">{matchedAthlete.doc || 'S/D'}</strong></span>
                        {matchedAthlete.guardian_name && (
                          <span>Resp: <strong className="text-zinc-200">{matchedAthlete.guardian_name.split(' ')[0]}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* VOICE ACTION TRIGGER ZONE */}
                  <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    
                    {/* Big pulsing OK Confirmation Button */}
                    <button
                      type="button"
                      disabled={isConfirming || isLocked}
                      onClick={() => handleConfirmPresence(matchedAthlete)}
                      className={cn(
                        "flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg",
                        isConfirming 
                          ? "bg-emerald-400 text-black scale-95" 
                          : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 hover:scale-102 active:scale-98 animate-pulse"
                      )}
                    >
                      <CheckCircle2 size={22} className="shrink-0" />
                      <div className="text-left">
                        <span className="block text-xs leading-none opacity-80">Comando de Voz ou Toque:</span>
                        <span className="text-base font-black leading-tight">Dizer "OK" ou Confirmar</span>
                      </div>
                    </button>

                    {/* Secondary Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmAbsence(matchedAthlete)}
                        disabled={isConfirming || isLocked}
                        className="px-4 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer"
                        title="Dizer 'Falta' ou marcar ausência"
                      >
                        Marcar Falta
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelSelection}
                        disabled={isConfirming}
                        className="px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer"
                        title="Cancelar seleção deste card"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Progress Indicator */}
                  {isConfirming && (
                    <motion.div 
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-400 origin-left"
                    />
                  )}
                </motion.div>
              ) : (
                /* Empty state waiting for voice input */
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-2 border-dashed border-zinc-800 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-zinc-900/30"
                >
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Mic size={36} className={isListening ? "animate-bounce" : ""} />
                    </div>
                    {isListening && (
                      <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping pointer-events-none" />
                    )}
                  </div>

                  <h4 className="text-base sm:text-lg font-black uppercase tracking-wider text-white mb-1">
                    Aguardando o Nome do Atleta
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mb-4">
                    Diga em voz alta o primeiro nome, sobrenome ou apelido do aluno. O card será exibido instantaneamente aqui.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-zinc-800/80 rounded-xl text-[11px] font-bold text-zinc-300 border border-zinc-700">
                      🗣️ "Arthur"
                    </span>
                    <span className="px-3 py-1 bg-zinc-800/80 rounded-xl text-[11px] font-bold text-zinc-300 border border-zinc-700">
                      🗣️ "Lucas"
                    </span>
                    <span className="px-3 py-1 bg-zinc-800/80 rounded-xl text-[11px] font-bold text-zinc-300 border border-zinc-700">
                      🗣️ "Pelezinho"
                    </span>
                    <span className="px-3 py-1 bg-zinc-800/80 rounded-xl text-[11px] font-bold text-zinc-300 border border-zinc-700">
                      🗣️ "Camisa 10"
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Multiple Matches candidates list if spoken name is ambiguous */}
          {candidateMatches.length > 1 && (
            <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Mais de um atleta encontrado. Diga o número ou clique:
                </span>
                <span className="text-[10px] text-zinc-400">({candidateMatches.length} opções)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidateMatches.map((cand, idx) => (
                  <button
                    key={cand.athlete.id}
                    type="button"
                    onClick={() => {
                      setMatchedAthlete(cand.athlete);
                      setCandidateMatches([]);
                      playChime('match');
                    }}
                    className={cn(
                      "p-3 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer",
                      matchedAthlete?.id === cand.athlete.id
                        ? "bg-amber-500/20 border-amber-400 text-white"
                        : "bg-black/50 border-zinc-800 hover:border-amber-500/50 text-zinc-300"
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase truncate">{cand.athlete.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {cand.athlete.nickname ? `"${cand.athlete.nickname}" • ` : ''}{getSubCategory(cand.athlete.birth_date)}
                      </p>
                    </div>
                    {isAthletePresent(cand.athlete.id) && (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fallback Simulation Input Box: Enables testing and usage without mic */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-400 shrink-0 flex items-center gap-1">
              <Search size={12} /> Testar Comando Manualmente:
            </span>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (simulationInput.trim()) {
                  processVoiceCommand(simulationInput.trim());
                  setSimulationInput('');
                }
              }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Digite um nome (ex: Lucas) ou 'OK' e aperte Enter..."
                className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-xl transition-all cursor-pointer shrink-0"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Roster Quick-Pick + Session Presences Log */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Quick Roster Selector (Search or Tap) */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col h-72">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <UserCheck size={14} className="text-amber-400" />
                Atletas da Chamada ({eligibleAthletes.length})
              </span>
              <span className="text-[10px] text-zinc-400">Toque para selecionar</span>
            </div>

            <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 custom-scrollbar">
              {eligibleAthletes.slice(0, 40).map(athlete => {
                const present = isAthletePresent(athlete.id);
                const isSelected = matchedAthlete?.id === athlete.id;

                return (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => {
                      setMatchedAthlete(athlete);
                      setCandidateMatches([]);
                      playChime('match');
                    }}
                    className={cn(
                      "w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-500/20 border-amber-400 text-white"
                        : present
                          ? "bg-emerald-950/20 border-emerald-500/30 text-zinc-300"
                          : "bg-black/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                        {athlete.photo ? (
                          <img src={athlete.photo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                            <User size={14} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase truncate">{athlete.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          {athlete.nickname ? `"${athlete.nickname}" • ` : ''}#{athlete.jersey_number || 'S/N'} • {getSubCategory(athlete.birth_date)}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {present ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Check size={10} /> Presente
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-zinc-500">
                          Pendente
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Presences Recorded this Session */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col flex-1 min-h-[160px]">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Presenças Registradas nesta Sessão
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                {recentPresences.length} atletas
              </span>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 max-h-48 custom-scrollbar">
              {recentPresences.length > 0 ? (
                recentPresences.map((rec, i) => (
                  <motion.div
                    key={`${rec.athlete.id}-${rec.time}-${i}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {rec.athlete.photo ? (
                          <img src={rec.athlete.photo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <User size={12} />
                          </div>
                        )}
                      </div>
                      <span className="font-bold uppercase text-white truncate text-[11px]">
                        {rec.athlete.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0 ml-2">
                      {rec.time} ✓
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="py-6 text-center text-zinc-600 text-xs">
                  <p>Nenhuma presença registrada ainda nesta sessão de voz.</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Fale o nome do atleta e diga "OK".</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
