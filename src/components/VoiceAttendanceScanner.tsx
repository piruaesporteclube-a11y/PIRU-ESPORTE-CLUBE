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
  Check, 
  HelpCircle,
  Radio,
  Clock,
  Shirt
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

// Remove accents and special characters
function normalizePortuguese(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Phonetic normalization for common Brazilian variations (e.g. Matheus/Mateus, Gabriel, etc.)
function phoneticNormalize(str: string): string {
  return normalizePortuguese(str)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch/g, 'x')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/k/g, 'c')
    .replace(/ss/g, 's')
    .replace(/rr/g, 'r')
    .replace(/tt/g, 't')
    .replace(/ll/g, 'l')
    .replace(/nn/g, 'n')
    .replace(/mm/g, 'm')
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
  const words = text.split(' ');
  return words.map(w => map[w] || w).join(' ');
}

// Simple Levenshtein distance for fuzzy matching typos or phonetic proximity
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
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
  const [isSpeechDetected, setIsSpeechDetected] = useState<boolean>(false);
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

  // References to keep callbacks completely stable across renders and prevent recognition reloads
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(true);
  const isStartingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<any>(null);
  const interimDebounceRef = useRef<any>(null);
  const isSystemSpeakingRef = useRef<boolean>(false);
  const confirmationCooldownRef = useRef<boolean>(false);
  const lastProcessedTranscriptRef = useRef<string>('');
  const matchedAthleteRef = useRef<Athlete | null>(null);
  const candidateMatchesRef = useRef<{ athlete: Athlete; score: number }[]>([]);
  const isConfirmingRef = useRef<boolean>(false);

  // Sync ref mirrors
  matchedAthleteRef.current = matchedAthlete;
  candidateMatchesRef.current = candidateMatches;
  isConfirmingRef.current = isConfirming;

  // Active eligible athletes (active status preferred, fallback to all)
  const eligibleAthletes = useMemo(() => {
    const activeOnly = athletes.filter(a => !a.status || a.status.toLowerCase() === 'ativo');
    return activeOnly.length > 0 ? activeOnly : athletes;
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
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.22, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.22);
        });
      } else if (type === 'cancel') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
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
      isSystemSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.15; // natural tempo
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setTimeout(() => {
          isSystemSpeakingRef.current = false;
        }, 400);
      };
      utterance.onerror = () => {
        isSystemSpeakingRef.current = false;
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      isSystemSpeakingRef.current = false;
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
        lastProcessedTranscriptRef.current = '';
      }, 1200);
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
        lastProcessedTranscriptRef.current = '';
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
    lastProcessedTranscriptRef.current = '';
    setLastActionMessage({
      text: 'Seleção cancelada. Fale o nome do atleta.',
      type: 'info'
    });
  }, [playChime]);

  // Evaluate candidate matching score for an athlete given spoken text
  const scoreAthleteMatch = useCallback((athlete: Athlete, spokenNorm: string): number => {
    const nameNorm = normalizePortuguese(athlete.name);
    const nicknameNorm = normalizePortuguese(athlete.nickname || '');
    const spokenPhonetic = phoneticNormalize(spokenNorm);
    const namePhonetic = phoneticNormalize(athlete.name);
    const nicknamePhonetic = athlete.nickname ? phoneticNormalize(athlete.nickname) : '';
    const jersey = (athlete.jersey_number || '').trim();

    // 1. Exact match on raw normalized or phonetic
    if (spokenNorm === nameNorm || spokenPhonetic === namePhonetic) return 100;
    if (nicknameNorm && (spokenNorm === nicknameNorm || spokenPhonetic === nicknamePhonetic)) return 99;

    // 2. Check jersey number if mentioned (e.g. "camisa 10", "numero 7", "10")
    if (jersey && (
      spokenNorm === jersey || 
      spokenNorm.includes(`camisa ${jersey}`) || 
      spokenNorm.includes(`numero ${jersey}`) || 
      spokenNorm.includes(`n ${jersey}`)
    )) {
      return 95;
    }

    const nameParts = nameNorm.split(' ').filter(p => p.length >= 2);
    const spokenParts = spokenNorm.split(' ').filter(p => p.length >= 2);
    const phoneticParts = namePhonetic.split(' ').filter(p => p.length >= 2);
    const spokenPhoneticParts = spokenPhonetic.split(' ').filter(p => p.length >= 2);

    if (nameParts.length === 0 || spokenParts.length === 0) return 0;

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const firstPhonetic = phoneticParts[0];

    // 3. Spoken contains full name
    if (spokenNorm.includes(nameNorm) || spokenPhonetic.includes(namePhonetic)) return 94;

    // 4. Full name contains spoken text as contiguous phrase (e.g. "João Pedro" in "João Pedro da Silva")
    if (spokenNorm.length >= 4 && nameNorm.includes(spokenNorm)) return 92;
    if (spokenPhonetic.length >= 4 && namePhonetic.includes(spokenPhonetic)) return 90;

    // 5. Spoken contains both first and last name
    if (spokenParts.includes(firstName) && spokenParts.includes(lastName)) return 88;

    // 6. Nickname matched as single word
    if (nicknameNorm && spokenParts.includes(nicknameNorm)) return 87;
    if (nicknamePhonetic && spokenPhoneticParts.includes(nicknamePhonetic)) return 86;

    // 7. Spoken matches first name exactly
    if (spokenParts.includes(firstName) || spokenPhoneticParts.includes(firstPhonetic)) {
      const otherMatches = nameParts.slice(1).filter(np => spokenParts.includes(np));
      if (otherMatches.length > 0) return 85;
      return 78; // Single first name match
    }

    // 8. Nickname as substring
    if (nicknameNorm && nicknameNorm.length >= 3 && spokenNorm.includes(nicknameNorm)) return 75;

    // 9. Spoken matches surname (last name)
    if (spokenParts.includes(lastName) && lastName.length >= 3) return 72;

    // 10. Fuzzy similarity (Levenshtein) on first name or nickname
    if (spokenParts.length === 1) {
      const word = spokenParts[0];
      if (word.length >= 4) {
        const distFirst = levenshteinDistance(word, firstName);
        if (distFirst <= 1) return 74;
        if (distFirst <= 2 && word.length >= 5) return 66;

        if (nicknameNorm && nicknameNorm.length >= 4) {
          const distNick = levenshteinDistance(word, nicknameNorm);
          if (distNick <= 1) return 73;
        }
      }
    }

    // 11. Partial starts-with for longer names (e.g. "Guilherm" -> "Guilherme")
    if (firstName.length >= 5 && spokenParts.some(sp => sp.length >= 4 && (firstName.startsWith(sp) || sp.startsWith(firstName)))) {
      return 65;
    }

    return 0;
  }, []);

  // Process any speech command (spoken or simulated)
  const processVoiceCommand = useCallback((rawText: string, isFromInterim = false) => {
    if (!rawText || !rawText.trim()) return;
    if (isSystemSpeakingRef.current) return; // Don't process system speaking echoes
    if (isConfirmingRef.current) return; // In the middle of confirmation save

    const cleanText = parseSpokenNumbers(normalizePortuguese(rawText));
    if (!cleanText) return;

    // Deduplicate identical repetitive triggers in quick succession
    if (lastProcessedTranscriptRef.current === cleanText && isFromInterim) {
      return;
    }
    lastProcessedTranscriptRef.current = cleanText;

    const currentMatched = matchedAthleteRef.current;
    const currentCandidates = candidateMatchesRef.current;

    // 1. If currently an athlete card is displayed waiting for confirmation
    if (currentMatched) {
      // Check confirmation commands: "ok", "sim", "confirma", "confirmar", "presente", "marca", "positivo", "valida"
      const isConfirmCmd = /\b(ok|okay|o k|sim|confirma|confirmar|confirmado|presente|marca|marcar|certo|positivo|pode marcar|isso|valida|validar|salvar)\b/i.test(cleanText);
      if (isConfirmCmd) {
        handleConfirmPresence(currentMatched);
        return;
      }

      // Check absence commands: "falta", "faltou", "ausente", "nao veio"
      const isAbsenceCmd = /\b(falta|faltou|ausente|nao veio|nao compareceu)\b/i.test(cleanText);
      if (isAbsenceCmd) {
        handleConfirmAbsence(currentMatched);
        return;
      }

      // Check cancel commands: "cancelar", "cancela", "voltar", "limpar", "trocar", "nenhum", "outro", "esquece"
      const isCancelCmd = /\b(cancelar|cancela|voltar|limpar|nenhum|outro|trocar|esquece|apagar|nao e ele|nao)\b/i.test(cleanText);
      if (isCancelCmd) {
        handleCancelSelection();
        return;
      }
    }

    // 2. If multiple candidates are shown and waiting for choice (e.g. "1", "2", "primeiro", "segundo")
    if (currentCandidates.length > 1) {
      if (/\b(1|primeiro|primeira|opcao um|o primeiro)\b/i.test(cleanText)) {
        const chosen = currentCandidates[0].athlete;
        setMatchedAthlete(chosen);
        setCandidateMatches([]);
        playChime('match');
        speakText(`Atleta ${chosen.name}. Diga OK para confirmar presença.`);
        return;
      }
      if (/\b(2|segundo|segunda|opcao dois|o segundo)\b/i.test(cleanText) && currentCandidates[1]) {
        const chosen = currentCandidates[1].athlete;
        setMatchedAthlete(chosen);
        setCandidateMatches([]);
        playChime('match');
        speakText(`Atleta ${chosen.name}. Diga OK para confirmar presença.`);
        return;
      }
      if (/\b(3|terceiro|terceira|opcao tres|o terceiro)\b/i.test(cleanText) && currentCandidates[2]) {
        const chosen = currentCandidates[2].athlete;
        setMatchedAthlete(chosen);
        setCandidateMatches([]);
        playChime('match');
        speakText(`Atleta ${chosen.name}. Diga OK para confirmar presença.`);
        return;
      }
    }

    // 3. Search for athlete by name / nickname / jersey
    // Filter out lone control words when no card is active
    const isControlWord = /^(ok|okay|sim|nao|cancelar|cancela|limpar|ajuda|teste|chamada|presenca|fala|falta)$/i.test(cleanText);
    if (isControlWord && !currentMatched) {
      return;
    }

    // Strip generic filler spoken phrases: "presenca do", "marcar presenca de", "atleta", "aluno", "por favor"
    let searchTarget = cleanText
      .replace(/\b(marcar|marca|presenca|chamada|aluno|atleta|por favor|confirma|chama|coloca|bota|fala|de|da|do|dos|das|pro|pra)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If searchTarget became empty or single letter (unless it's a number), check original cleanText
    if (!searchTarget || searchTarget.length < 2) {
      if (cleanText.length >= 2 && !isControlWord) {
        searchTarget = cleanText;
      } else {
        return;
      }
    }

    // Score all eligible athletes
    const pool = eligibleAthletes.length > 0 ? eligibleAthletes : athletes;
    const scored = pool.map(a => ({
      athlete: a,
      score: scoreAthleteMatch(a, searchTarget)
    })).filter(item => item.score >= 65);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const topScore = scored[0].score;
      // If there are multiple close matches (e.g. score >= 75 and within 12 points)
      const closeMatches = scored.filter(s => s.score >= 70 && (topScore - s.score) <= 12);

      if (closeMatches.length > 1) {
        setCandidateMatches(closeMatches.slice(0, 3));
        setMatchedAthlete(closeMatches[0].athlete);
        playChime('match');
        speakText(`Encontrei ${closeMatches.length} atletas. Diga OK para ${closeMatches[0].athlete.nickname || closeMatches[0].athlete.name.split(' ')[0]}, ou diga o número.`);
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
      if (!isFromInterim && cleanText.length >= 3 && !isControlWord) {
        setLastActionMessage({
          text: `Nenhum atleta encontrado para "${rawText}". Tente falar o primeiro nome ou apelido.`,
          type: 'warn'
        });
      }
    }
  }, [eligibleAthletes, athletes, scoreAthleteMatch, handleConfirmPresence, handleConfirmAbsence, handleCancelSelection, playChime, speakText]);

  // Keep ref updated to processVoiceCommand so the SpeechRecognition effect never restarts on state change
  const processVoiceCommandRef = useRef(processVoiceCommand);
  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  // SpeechRecognition lifecycle: initialized ONCE on mount, rock-solid, zero flickering
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 2;

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    // Helper to safely start recognition
    const safeStart = () => {
      if (!shouldListenRef.current || isStartingRef.current) return;
      isStartingRef.current = true;
      try {
        recognition.start();
      } catch (err: any) {
        // Recognition already started or transitioning
        isStartingRef.current = false;
      }
    };

    recognition.onstart = () => {
      isStartingRef.current = false;
      setIsListening(true);
      setMicPermissionDenied(false);
    };

    recognition.onaudiostart = () => {
      setIsSpeechDetected(false);
    };

    recognition.onspeechstart = () => {
      setIsSpeechDetected(true);
    };

    recognition.onspeechend = () => {
      setIsSpeechDetected(false);
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

      const cleanInterim = interim.trim();
      const cleanFinal = final.trim();

      if (cleanInterim) {
        setInterimTranscript(cleanInterim);
        setIsSpeechDetected(true);

        // Immediate check for fast command response ("OK", "Sim", "Cancelar", "Falta", "1", "2")
        const normInterim = normalizePortuguese(cleanInterim);
        const isFastCmd = /\b(ok|okay|o k|sim|confirma|confirmar|falta|cancelar|cancela|trocar|1|2|primeiro|segundo)\b/i.test(normInterim);

        if (isFastCmd && (matchedAthleteRef.current || candidateMatchesRef.current.length > 1)) {
          processVoiceCommandRef.current(cleanInterim, false);
          setInterimTranscript('');
          return;
        }

        // Debounce interim name recognition: if user spoke a name and pauses for 500ms, process it even before Chrome fires isFinal!
        if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
        interimDebounceRef.current = setTimeout(() => {
          if (cleanInterim && !matchedAthleteRef.current) {
            processVoiceCommandRef.current(cleanInterim, true);
          }
        }, 500);
      }

      if (cleanFinal) {
        if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
        setTranscript(cleanFinal);
        setInterimTranscript('');
        setIsSpeechDetected(false);
        processVoiceCommandRef.current(cleanFinal, false);
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;
      const err = event.error;

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        shouldListenRef.current = false;
        setMicPermissionDenied(true);
        setIsListening(false);
        toast.error('Permissão de microfone negada. Conceda acesso nas configurações do navegador.');
      } else if (err === 'no-speech') {
        // Normal silence event, will auto restart cleanly on onend
      } else if (err === 'aborted') {
        // Normal abort on pause
      } else {
        console.warn('SpeechRecognition notice:', err);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartingRef.current = false;
      setIsSpeechDetected(false);

      // If component is active and mic wasn't manually paused or blocked, restart smoothly without tight looping
      if (shouldListenRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          safeStart();
        }, 250);
      }
    };

    // Initial start
    safeStart();

    return () => {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []); // Run ONLY once on mount!

  // Toggle listening manually (Pause / Resume)
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setIsSpeechDetected(false);
      toast.info('Microfone pausado.');
    } else {
      shouldListenRef.current = true;
      setMicPermissionDenied(false);
      try {
        recognitionRef.current.start();
      } catch (e) {}
      toast.success('Microfone ouvindo novamente!');
    }
  };

  // Keyboard shortcut: Spacebar toggles voice, Enter confirms OK if matched, Escape cancels
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
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "p-3 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer",
              isListening 
                ? "bg-amber-500 text-black shadow-amber-500/30 ring-4 ring-amber-500/20" 
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
            title={isListening ? "Clique para pausar microfone" : "Clique para ligar microfone"}
          >
            {isListening ? <Mic size={28} className={isSpeechDetected ? "animate-bounce" : ""} /> : <MicOff size={28} />}
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl font-black uppercase tracking-wider text-white">
                Chamada por Comando de Voz
              </h3>
              <span className={cn(
                "text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all",
                isListening 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40" 
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isListening ? "bg-amber-400 animate-ping" : "bg-zinc-500")} />
                {isListening ? (isSpeechDetected ? "Voz Detectada!" : "Microfone Aberto • Ouvindo") : "Microfone Pausado"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Fale o <strong className="text-white">Nome ou Apelido</strong> do atleta. O card aparecerá na tela e ao dizer <strong className="text-amber-400 font-black">"OK"</strong> a presença é gravada!
            </p>
          </div>
        </div>

        {/* Action icons / toggles */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Animated Equalizer Visualizer (No getUserMedia conflict) */}
          {isListening && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-amber-500/30 rounded-xl" title="Sensibilidade de áudio">
              <div className="flex items-end gap-0.5 h-4 w-12">
                {[40, 70, 100, 80, 50, 90, 60].map((h, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-all duration-150",
                      isSpeechDetected ? "bg-emerald-400" : "bg-amber-400"
                    )}
                    style={{
                      height: isSpeechDetected
                        ? `${Math.max(25, (h * 0.8) + (i % 2 === 0 ? 15 : -10))}%`
                        : `${Math.max(15, (h * 0.35))}%`
                    }}
                  />
                ))}
              </div>
              <span className={cn("text-[10px] font-mono font-bold", isSpeechDetected ? "text-emerald-400" : "text-amber-400")}>
                {isSpeechDetected ? 'FALANDO' : 'OUVINDO'}
              </span>
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
            title={isListening ? "Pausar reconhecimento de voz" : "Ativar microfone"}
          >
            {isListening ? <Mic size={15} /> : <MicOff size={15} />}
            <span>{isListening ? 'Pausar Mic' : 'Ligar Mic'}</span>
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
            className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4 mb-5 text-xs space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Como usar os comandos de voz:
              </span>
              <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-zinc-300">
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <strong className="text-white block font-bold mb-1">1. Falar Nome do Aluno</strong>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Ex: <span className="text-amber-300 font-bold">"Gabriel"</span>, <span className="text-amber-300 font-bold">"Lucas"</span>, <span className="text-amber-300 font-bold">"Arthur"</span>, ou pelo apelido.
                </p>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <strong className="text-emerald-400 block font-bold mb-1">2. Confirmar Presença ("OK")</strong>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Com o card exibido, diga: <span className="text-emerald-300 font-bold">"OK"</span>, <span className="text-emerald-300 font-bold">"Sim"</span>, <span className="text-emerald-300 font-bold">"Confirmar"</span> ou <span className="text-emerald-300 font-bold">"Presente"</span>.
                </p>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <strong className="text-rose-400 block font-bold mb-1">3. Cancelar ou Trocar</strong>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Diga: <span className="text-rose-300 font-bold">"Cancelar"</span>, <span className="text-rose-300 font-bold">"Trocar"</span> ou simplesmente fale o nome de outro atleta.
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
              <p className="text-zinc-400">Clique no ícone de permissões na barra do seu navegador (cadeado ao lado do endereço) e selecione "Permitir Microfone". Depois clique no botão "Ligar Mic".</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase text-xs rounded-xl cursor-pointer shrink-0"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Unsupported browser fallback warning */}
      {!isSupported && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-6 text-xs text-amber-200">
          <strong>Aviso de Navegador:</strong> O reconhecimento de voz Web Speech API nativo funciona com maior estabilidade no Google Chrome, Microsoft Edge ou Safari. Você também pode digitar nomes e comandos no campo abaixo.
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
                  className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold cursor-pointer"
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
                  <span className={cn("w-2 h-2 rounded-full inline-block", isListening ? "bg-amber-400/80 animate-ping" : "bg-zinc-600")} />
                  {isListening ? (
                    matchedAthlete 
                      ? `Diga em voz alta: "OK" para confirmar presença de ${matchedAthlete.nickname || matchedAthlete.name.split(' ')[0]}...` 
                      : "Fale em voz alta o nome do atleta (ex: \"Gabriel\", \"Lucas\", \"Arthur\")..."
                  ) : (
                    "Microfone pausado. Clique em 'Ligar Mic' para falar."
                  )}
                </p>
              )}
            </div>

            {/* Instruction banner based on state */}
            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[11px] flex-wrap">
              {matchedAthlete ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-400" />
                  Atleta encontrado! Diga <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 uppercase font-black">"OK"</span> no microfone.
                </span>
              ) : (
                <span className="text-zinc-400 font-medium">
                  💡 Fale o nome e em seguida confirme com <strong className="text-amber-300">"OK"</strong>.
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

          {/* THE ATHLETE CARD */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {matchedAthlete ? (
                <motion.div
                  key={matchedAthlete.id}
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -8 }}
                  transition={{ duration: 0.18 }}
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
                          : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 hover:scale-[1.02] active:scale-98 animate-pulse"
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

                  {/* Confirmation Progress Bar */}
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
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                      isListening 
                        ? "bg-amber-500/10 border-2 border-amber-500/40 text-amber-400" 
                        : "bg-zinc-800 border-2 border-zinc-700 text-zinc-500"
                    )}>
                      <Mic size={36} className={isSpeechDetected ? "animate-bounce" : ""} />
                    </div>
                    {isListening && (
                      <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping pointer-events-none" />
                    )}
                  </div>

                  <h4 className="text-base sm:text-lg font-black uppercase tracking-wider text-white mb-1">
                    {isListening ? "Aguardando o Nome do Atleta" : "Microfone Pausado"}
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mb-4">
                    {isListening 
                      ? "Diga em voz alta o primeiro nome, sobrenome ou apelido do aluno. O card será exibido instantaneamente." 
                      : "Clique no botão 'Ligar Mic' acima para iniciar a chamada por voz."}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-zinc-800/80 rounded-xl text-[11px] font-bold text-zinc-300 border border-zinc-700">
                      🗣️ Fale um nome (ex: "Lucas", "Gabriel", "Arthur")
                    </span>
                    <span className="px-3 py-1 bg-zinc-800/80 rounded-xl text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                      ✓ Depois diga "OK"
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
              <Search size={12} /> Digitar / Testar Comando:
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
                placeholder="Digite o nome de um atleta ou 'OK' e tecle Enter..."
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
              {eligibleAthletes.slice(0, 50).map(athlete => {
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
