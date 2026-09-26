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

// Phonetic normalization for common Brazilian Portuguese names and variations
function phoneticNormalize(str: string): string {
  return normalizePortuguese(str)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch/g, 'x')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/k/g, 'c')
    .replace(/ck/g, 'c')
    .replace(/ç/g, 's')
    .replace(/ss/g, 's')
    .replace(/sc/g, 's')
    .replace(/xc/g, 's')
    .replace(/rr/g, 'r')
    .replace(/tt/g, 't')
    .replace(/ll/g, 'l')
    .replace(/nn/g, 'n')
    .replace(/mm/g, 'm')
    .replace(/lh/g, 'li')
    .replace(/nh/g, 'ni')
    .replace(/ao\b/g, 'an')
    .replace(/z\b/g, 's')
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

// Portuguese noise connectors to ignore in full name token comparison
const CONNECTOR_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em']);

// Extract significant name tokens (length >= 2, excluding connectors)
function getNameTokens(str: string): string[] {
  return normalizePortuguese(str)
    .split(' ')
    .filter(token => token.length >= 2 && !CONNECTOR_WORDS.has(token));
}

// Levenshtein distance for fuzzy matching typos or phonetic proximity
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

// High-precision individual word similarity scoring (0.0 to 1.0)
// Tolerates slips like "luas" vs "lucas" (Levenshtein dist = 1)
function wordSimilarity(spokenWord: string, nameWord: string): number {
  if (spokenWord === nameWord) return 1.0;
  if (phoneticNormalize(spokenWord) === phoneticNormalize(nameWord)) return 0.98;

  const lenS = spokenWord.length;
  const lenN = nameWord.length;
  const minLen = Math.min(lenS, lenN);
  const maxLen = Math.max(lenS, lenN);

  // Levenshtein typo/slip tolerance: e.g. "luas" vs "lucas", "migel" vs "miguel"
  if (minLen >= 4) {
    const dist = levenshteinDistance(spokenWord, nameWord);
    if (dist === 1) return 0.88; // e.g. "luas" -> "lucas"
    if (dist === 2 && minLen >= 6) return 0.76;
  } else if (minLen === 3) {
    const dist = levenshteinDistance(spokenWord, nameWord);
    if (dist === 1) return 0.82; // e.g. short nicknames or names
  }

  // Prefix matching (e.g. "guilherm" vs "guilherme")
  if (minLen >= 4 && (spokenWord.startsWith(nameWord) || nameWord.startsWith(spokenWord))) {
    const ratio = minLen / maxLen;
    if (ratio >= 0.75) return 0.82;
  }

  return 0;
}

export interface CandidateMatch {
  athlete: Athlete;
  score: number;
  reason: string;
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
  const [readyChimeEnabled, setReadyChimeEnabled] = useState<boolean>(true);
  const [voiceSynthesisFeedback, setVoiceSynthesisFeedback] = useState<boolean>(true);
  const [isSystemSpeaking, setIsSystemSpeaking] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Recognition / Card states
  const [matchedAthlete, setMatchedAthlete] = useState<Athlete | null>(null);
  const [matchedReason, setMatchedReason] = useState<string>('');
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatch[]>([]);
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
  const candidateMatchesRef = useRef<CandidateMatch[]>([]);
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
  const playChime = useCallback((type: 'success' | 'match' | 'cancel' | 'error' | 'ready') => {
    if (!soundFeedback) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      if (type === 'ready') {
        if (!readyChimeEnabled) return;
        // Crisp, friendly, energetic dual-tone "PODE FALAR" alert: A5 (880Hz) -> D6 (1174.66Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, now + 0.07);
        gain2.gain.setValueAtTime(0.22, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.07);
        osc2.stop(now + 0.22);
      } else if (type === 'match') {
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
  }, [soundFeedback, readyChimeEnabled]);

  // Voice synthesis feedback (Portuguese)
  const speakText = useCallback((text: string) => {
    if (!voiceSynthesisFeedback || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      isSystemSpeakingRef.current = true;
      setIsSystemSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.15; // natural tempo
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setTimeout(() => {
          isSystemSpeakingRef.current = false;
          setIsSystemSpeaking(false);
          // Play ready alert chime so user knows mic is ready for the next command!
          playChime('ready');
        }, 300);
      };
      utterance.onerror = () => {
        isSystemSpeakingRef.current = false;
        setIsSystemSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      isSystemSpeakingRef.current = false;
      setIsSystemSpeaking(false);
      console.warn('Speech synthesis failed', e);
    }
  }, [voiceSynthesisFeedback, playChime]);

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
        setMatchedReason('');
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
        setMatchedReason('');
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
    setMatchedReason('');
    setCandidateMatches([]);
    setTranscript('');
    setInterimTranscript('');
    lastProcessedTranscriptRef.current = '';
    setLastActionMessage({
      text: 'Seleção cancelada. Fale o nome do atleta.',
      type: 'info'
    });
  }, [playChime]);

  // Brazilian common compound given names that should never be treated as family surnames when spoken alone
  const COMPOUND_GIVEN_NAMES = useMemo(() => new Set([
    'lucas', 'pedro', 'gabriel', 'henrique', 'victor', 'vitor', 'miguel', 
    'arthur', 'artur', 'eduardo', 'felipe', 'guilherme', 'davi', 'lucca', 
    'luca', 'mateus', 'matheus', 'clara', 'eduarda', 'maria', 'ana', 'joao'
  ]), []);

  // Surgical candidate matching score for an athlete given spoken text
  const scoreAthleteMatch = useCallback((athlete: Athlete, spokenText: string): { score: number; reason: string } => {
    const spokenClean = normalizePortuguese(spokenText);
    const nameNorm = normalizePortuguese(athlete.name);
    const nicknameNorm = normalizePortuguese(athlete.nickname || '');
    const spokenPhonetic = phoneticNormalize(spokenText);
    const namePhonetic = phoneticNormalize(athlete.name);
    const jersey = (athlete.jersey_number || '').trim();

    // 1. Jersey number mention
    if (jersey) {
      const jerseyPatterns = [
        `camisa ${jersey}`,
        `numero ${jersey}`,
        `n ${jersey}`,
        `camisa n ${jersey}`
      ];
      const hasJerseyMention = spokenClean === jersey || jerseyPatterns.some(p => spokenClean.includes(p));
      if (hasJerseyMention) {
        const nameTokens = getNameTokens(athlete.name);
        const spokenTokens = getNameTokens(spokenText);
        const hasNameMention = spokenTokens.some(st => nameTokens.some(nt => nt === st));
        if (hasNameMention) {
          return { score: 99, reason: `Camisa #${jersey} + Nome` };
        }
        return { score: 95, reason: `Camisa #${jersey}` };
      }
    }

    // 2. Nickname exact match
    if (nicknameNorm) {
      const nickTokens = getNameTokens(nicknameNorm);
      const spokenTokens = getNameTokens(spokenClean);
      if (spokenClean === nicknameNorm || spokenPhonetic === phoneticNormalize(nicknameNorm)) {
        return { score: 99, reason: `Apelido "${athlete.nickname}"` };
      }
      if (spokenTokens.length >= 1 && nickTokens.some(nt => spokenTokens.includes(nt))) {
        return { score: 94, reason: `Apelido "${athlete.nickname}"` };
      }
    }

    // 3. Name tokens analysis
    const spokenTokens = getNameTokens(spokenClean);
    const nameTokens = getNameTokens(nameNorm);

    if (spokenTokens.length === 0 || nameTokens.length === 0) {
      return { score: 0, reason: '' };
    }

    // Exact full name match
    if (spokenTokens.join(' ') === nameTokens.join(' ')) {
      return { score: 100, reason: 'Nome Completo Exato' };
    }
    if (phoneticNormalize(spokenTokens.join(' ')) === phoneticNormalize(nameTokens.join(' '))) {
      return { score: 99, reason: 'Nome Completo Fonético' };
    }

    // For each spoken token, find the best matching token in the athlete's name
    let matchedSpokenCount = 0;
    let similaritySum = 0;
    const matchedNameIndices: number[] = [];
    const usedNameIndices = new Set<number>();
    let hadFuzzyMatch = false;

    for (const st of spokenTokens) {
      let bestSim = 0;
      let bestIdx = -1;

      for (let i = 0; i < nameTokens.length; i++) {
        if (usedNameIndices.has(i)) continue;
        const sim = wordSimilarity(st, nameTokens[i]);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = i;
        }
      }

      if (bestSim >= 0.75 && bestIdx !== -1) {
        matchedSpokenCount++;
        similaritySum += bestSim;
        matchedNameIndices.push(bestIdx);
        usedNameIndices.add(bestIdx);
        if (bestSim < 0.95) hadFuzzyMatch = true;
      }
    }

    const spokenCoverage = matchedSpokenCount / spokenTokens.length;
    const avgSimilarity = matchedSpokenCount > 0 ? similaritySum / matchedSpokenCount : 0;

    // CASE A: User spoke only 1 word (e.g. "Lucas", "João", "Machado", "Luas")
    if (spokenTokens.length === 1) {
      const singleWord = spokenTokens[0];

      // Check if word matches FIRST NAME (Index 0)
      if (matchedNameIndices.includes(0)) {
        const base = 88;
        const finalScore = Math.round(base * avgSimilarity);
        return { 
          score: finalScore, 
          reason: hadFuzzyMatch ? 'Primeiro Nome Aprox.' : 'Primeiro Nome' 
        };
      }

      // Check if word matches Nickname
      if (nicknameNorm && wordSimilarity(singleWord, nicknameNorm) >= 0.75) {
        return {
          score: 92,
          reason: `Apelido "${athlete.nickname}"`
        };
      }

      // If the spoken word did NOT match the first name or nickname:
      // Could it be a family surname (e.g. "Machado", "Miranda", "Ferreira", "Silva")?
      // CRITICAL SURGICAL RULE:
      // If the word is a common given name (e.g. "lucas", "pedro", "gabriel", "joao"), but this athlete's
      // first name is something else (e.g. "João Lucas", "Pedro Lucas"), this athlete MUST NOT MATCH!
      // When a coach calls "Lucas", they are NEVER calling "João Lucas"!
      if (COMPOUND_GIVEN_NAMES.has(singleWord)) {
        return { score: 0, reason: '' };
      }

      // It is a genuine family surname:
      // Check last name:
      if (matchedNameIndices.includes(nameTokens.length - 1)) {
        const base = 90;
        const finalScore = Math.round(base * avgSimilarity);
        return { 
          score: finalScore, 
          reason: hadFuzzyMatch ? 'Sobrenome Aprox.' : 'Sobrenome de Família' 
        };
      }

      // Check middle surname:
      if (matchedNameIndices.some(idx => idx > 0 && idx < nameTokens.length - 1)) {
        const base = 75;
        const finalScore = Math.round(base * avgSimilarity);
        return { 
          score: finalScore, 
          reason: hadFuzzyMatch ? 'Sobrenome do Meio Aprox.' : 'Sobrenome Intermediário' 
        };
      }

      return { score: 0, reason: '' };
    }

    // CASE B: User spoke 2 or more words (e.g. "Lucas Machado", "Lucas Miranda", "Lucas Henrique Miranda Machado", "Luas Machado", "João Lucas")
    // CRITICAL SURGICAL RULE:
    // If the user spoke multiple words, EVERY SINGLE SPOKEN WORD MUST MATCH A DISTINCT TOKEN in the athlete's name!
    // If ANY spoken word is missing (coverage < 1.0), this athlete is eliminated (Score: 0)!
    // Example: user said "João Lucas". "Lucas Machado" has no "João" -> Score 0!
    // Example: user said "Lucas Machado". "João Lucas" has no "Machado" -> Score 0!
    if (spokenTokens.length >= 2) {
      if (spokenCoverage < 1.0) {
        return { score: 0, reason: '' };
      }

      // Check order
      let isOrderPreserved = true;
      for (let i = 1; i < matchedNameIndices.length; i++) {
        if (matchedNameIndices[i] < matchedNameIndices[i - 1]) {
          isOrderPreserved = false;
          break;
        }
      }

      let baseScore = 80;
      let reason = 'Correspondência Parcial';

      const matchedFirstName = matchedNameIndices.includes(0);
      const matchedLastName = matchedNameIndices.includes(nameTokens.length - 1);
      const matchedMiddleName = matchedNameIndices.some(idx => idx > 0 && idx < nameTokens.length - 1);
      const athleteCoverage = matchedSpokenCount / nameTokens.length;

      // 1. EXACT FULL NAME MATCH: All tokens of the athlete's name were spoken!
      // (e.g. "João Lucas" -> João Lucas, "Lucas Miranda" -> Lucas Miranda, "Lucas Henrique Miranda Machado")
      if (matchedSpokenCount === nameTokens.length && isOrderPreserved) {
        baseScore = 100;
        reason = hadFuzzyMatch ? 'Nome Completo Aprox.' : 'Nome Completo Exato';
      }
      // 2. First Name + Primary Family Last Name (e.g. "Lucas Machado" or "Luas Machado" for "Lucas Henrique Miranda Machado")
      else if (matchedFirstName && matchedLastName) {
        baseScore = 98;
        reason = hadFuzzyMatch ? 'Nome + Sobrenome Aprox.' : 'Nome + Sobrenome de Família';
      }
      // 3. First two names in sequence when athlete has more tokens (e.g. "Lucas Henrique" for "Lucas Henrique Miranda Machado")
      else if (matchedNameIndices.length >= 2 && matchedNameIndices[0] === 0 && matchedNameIndices[1] === 1) {
        baseScore = 92;
        reason = hadFuzzyMatch ? 'Dois Primeiros Nomes Aprox.' : 'Dois Primeiros Nomes';
      }
      // 4. First Name + Middle Name (e.g. "Lucas Miranda" for "Lucas Henrique Miranda Machado")
      // CRUCIAL: The athlete's primary family last name ("Machado") was NOT spoken.
      // Score is kept at 82 so that an athlete whose FULL name is literally "Lucas Miranda" (Score 100)
      // wins unambiguously without creating a false homonym tie!
      else if (matchedFirstName && matchedMiddleName) {
        baseScore = 82;
        reason = hadFuzzyMatch ? 'Nome + Sobrenome Intermediário Aprox.' : 'Nome + Sobrenome do Meio';
      }
      // 5. Middle + Last name (e.g. "Miranda Machado")
      else if (matchedMiddleName && matchedLastName) {
        baseScore = 86;
        reason = hadFuzzyMatch ? 'Sobrenomes Aprox.' : 'Sobrenomes';
      } else {
        baseScore = 80;
        reason = 'Correspondência Parcial';
      }

      if (isOrderPreserved && baseScore < 100) {
        baseScore = Math.min(99, baseScore + 2);
      }

      const finalScore = Math.min(100, Math.round(baseScore * avgSimilarity));
      return { score: finalScore, reason };
    }

    return { score: 0, reason: '' };
  }, [COMPOUND_GIVEN_NAMES]);

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
      const isCancelCmd = /^(cancelar|cancela|voltar|limpar|nenhum|outro|trocar|esquece|apagar|nao e ele|nao)$/i.test(cleanText);
      if (isCancelCmd) {
        handleCancelSelection();
        return;
      }
    }

    // 2. If multiple candidates are shown and waiting for choice
    if (currentCandidates.length > 1) {
      // Check number selection: "1", "2", "3", "primeiro", "segundo", "terceiro"
      if (/\b(1|primeiro|primeira|opcao um|o primeiro|um)\b/i.test(cleanText)) {
        const chosen = currentCandidates[0];
        setMatchedAthlete(chosen.athlete);
        setMatchedReason(chosen.reason);
        setCandidateMatches([]);
        playChime('match');
        speakText(`${chosen.athlete.name}. Diga OK para confirmar presença.`);
        return;
      }
      if (/\b(2|segundo|segunda|opcao dois|o segundo|dois)\b/i.test(cleanText) && currentCandidates[1]) {
        const chosen = currentCandidates[1];
        setMatchedAthlete(chosen.athlete);
        setMatchedReason(chosen.reason);
        setCandidateMatches([]);
        playChime('match');
        speakText(`${chosen.athlete.name}. Diga OK para confirmar presença.`);
        return;
      }
      if (/\b(3|terceiro|terceira|opcao tres|o terceiro|tres)\b/i.test(cleanText) && currentCandidates[2]) {
        const chosen = currentCandidates[2];
        setMatchedAthlete(chosen.athlete);
        setMatchedReason(chosen.reason);
        setCandidateMatches([]);
        playChime('match');
        speakText(`${chosen.athlete.name}. Diga OK para confirmar presença.`);
        return;
      }

      // Check if user spoke a distinguishing surname or name for one of the candidates (e.g. "Machado" or "Gabriel")
      const candidateScored = currentCandidates.map(c => ({
        candidate: c,
        score: scoreAthleteMatch(c.athlete, cleanText).score
      })).filter(cs => cs.score >= 70);

      candidateScored.sort((a, b) => b.score - a.score);

      if (candidateScored.length === 1 || (candidateScored.length > 1 && candidateScored[0].score > candidateScored[1].score + 10)) {
        const chosen = candidateScored[0].candidate;
        setMatchedAthlete(chosen.athlete);
        setMatchedReason(chosen.reason);
        setCandidateMatches([]);
        playChime('match');
        speakText(`${chosen.athlete.name}. Diga OK para confirmar presença.`);
        return;
      }
    }

    // 3. Search for athlete by name / nickname / jersey / full name
    // Filter out lone control words when no card is active
    const isControlWord = /^(ok|okay|sim|nao|cancelar|cancela|limpar|ajuda|teste|chamada|presenca|fala|falta)$/i.test(cleanText);
    if (isControlWord && !currentMatched) {
      return;
    }

    // Strip generic conversational / filler spoken phrases:
    let searchTarget = cleanText
      .replace(/\b(marcar|marca|presenca|chamada|aluno|atleta|por favor|confirma|confirmar|chama|coloca|bota|fala|troca|trocar|muda|mudar|nao e o|nao e a|e o|e a|pro|pra)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If searchTarget became empty or single letter, fallback to cleanText if valid
    if (!searchTarget || searchTarget.length < 2) {
      if (cleanText.length >= 2 && !isControlWord) {
        searchTarget = cleanText;
      } else {
        return;
      }
    }

    // Score all eligible athletes with surgical precision
    const pool = eligibleAthletes.length > 0 ? eligibleAthletes : athletes;
    const scored: CandidateMatch[] = pool.map(a => {
      const res = scoreAthleteMatch(a, searchTarget);
      return {
        athlete: a,
        score: res.score,
        reason: res.reason
      };
    }).filter(item => item.score >= 70);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const topScore = scored[0].score;
      // Close matches threshold: if top score is high (>= 92), only consider athletes within 5 points
      const tieThreshold = topScore >= 92 ? 5 : 8;
      const closeMatches = scored.filter(s => s.score >= 75 && (topScore - s.score) <= tieThreshold);

      // If a card is currently showing:
      if (currentMatched) {
        const best = scored[0];
        // If the best match is a DIFFERENT athlete with high confidence (score >= 75)
        if (best.athlete.id !== currentMatched.id && best.score >= 75) {
          if (closeMatches.length > 1) {
            setCandidateMatches(closeMatches.slice(0, 4));
            setMatchedAthlete(null);
            setMatchedReason('');
            playChime('match');
            speakText(`Encontrei ${closeMatches.length} atletas. Diga o sobrenome ou o número.`);
            setLastActionMessage({
              text: `${closeMatches.length} atletas encontrados. Diga o sobrenome ou o número.`,
              type: 'warn'
            });
            return;
          }
          setMatchedAthlete(best.athlete);
          setMatchedReason(best.reason);
          setCandidateMatches([]);
          playChime('match');
          const displayName = best.athlete.nickname || best.athlete.name;
          speakText(`Atleta alterado para ${displayName}! Diga OK para confirmar.`);
          setLastActionMessage({
            text: `Atleta alterado: ${best.athlete.name} (${best.reason})`,
            type: 'info'
          });
          return;
        }

        // If it's the SAME athlete with updated/confirmed full name
        if (best.athlete.id === currentMatched.id) {
          setMatchedReason(best.reason);
          if (closeMatches.length <= 1) {
            setCandidateMatches([]);
          }
          return;
        }

        return;
      }

      // No card currently showing:
      // CRITICAL SURGICAL LOGIC:
      // If there are multiple close matches (e.g. multiple athletes called Lucas):
      // DO NOT arbitrarily pick one as matchedAthlete! Leave matchedAthlete null and prompt for disambiguation!
      if (closeMatches.length > 1) {
        setCandidateMatches(closeMatches.slice(0, 4));
        setMatchedAthlete(null); // ZERO GUESSWORK!
        setMatchedReason('');
        playChime('match');
        const candidateNames = closeMatches.map((c, i) => `${i + 1}: ${c.athlete.name}`).join(', ');
        speakText(`Existem ${closeMatches.length} atletas com esse nome. Diga o sobrenome ou o número: ${candidateNames}`);
        setLastActionMessage({
          text: `Atenção: ${closeMatches.length} atletas encontrados. Diga o sobrenome ou número para escolher.`,
          type: 'warn'
        });
      } else {
        // Single unambiguous winner!
        const best = scored[0];
        setMatchedAthlete(best.athlete);
        setMatchedReason(best.reason);
        setCandidateMatches([]);
        playChime('match');
        const displayName = best.athlete.nickname || best.athlete.name;
        speakText(`${displayName}! Diga OK para confirmar.`);
        setLastActionMessage({
          text: `Encontrado: ${best.athlete.name} (${best.reason})`,
          type: 'success'
        });
      }
    } else {
      // No match found
      if (!isFromInterim && cleanText.length >= 3 && !isControlWord) {
        setLastActionMessage({
          text: `Nenhum atleta encontrado para "${rawText}". Tente falar o nome completo ou apelido.`,
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
        if (shouldListenRef.current && !err.message?.includes('already started')) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(safeStart, 150);
        }
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
      if (!isSystemSpeakingRef.current) {
        setIsSpeechDetected(true);
      }
    };

    recognition.onspeechend = () => {
      setIsSpeechDetected(false);
    };

    recognition.onresult = (event: any) => {
      // Discard audio events while the computer is reading aloud to avoid audio feedback echoes
      if (isSystemSpeakingRef.current) {
        return;
      }

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

        // Immediate check ONLY for fast single-syllable commands when a card is ALREADY showing or candidates are showing!
        const normInterim = normalizePortuguese(cleanInterim);
        const isFastCmd = /\b(ok|okay|o k|sim|confirma|confirmar|falta|cancelar|cancela|trocar|1|2|3|primeiro|segundo|terceiro)\b/i.test(normInterim);

        if (isFastCmd && (matchedAthleteRef.current || candidateMatchesRef.current.length > 1)) {
          if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
          processVoiceCommandRef.current(cleanInterim, false);
          setInterimTranscript('');
          return;
        }

        // For athlete names: DO NOT run search on interim results!
        // Running on interim prematurely cuts off the speaker while they are speaking full or compound names
        // like "Lucas Machado" or "João Lucas" or "Lucas Miranda".
        // Instead, schedule a fallback search ONLY if 1600ms elapse with no final event:
        if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
        interimDebounceRef.current = setTimeout(() => {
          if (cleanInterim && !isSystemSpeakingRef.current) {
            processVoiceCommandRef.current(cleanInterim, false);
          }
        }, 1600);
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
        // Normal silence event in Web Speech API, will auto restart smoothly on onend
      } else if (err === 'aborted') {
        // Normal abort on pause or transition
      } else {
        console.warn('SpeechRecognition notice:', err);
      }
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      setIsSpeechDetected(false);

      // If component is active and mic wasn't manually paused or blocked, restart smoothly without tight looping
      // CRUCIAL: DO NOT call setIsListening(false) here when shouldListenRef.current is true,
      // because Chrome calls onend every 5s of silence, and toggling isListening makes the UI flicker!
      if (shouldListenRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          safeStart();
        }, 60);
      } else {
        setIsListening(false);
      }
    };

    // Initial start
    safeStart();

    // Initial ready chime cue after scanner mounts
    const initialChimeTimer = setTimeout(() => {
      playChime('ready');
    }, 450);

    return () => {
      shouldListenRef.current = false;
      clearTimeout(initialChimeTimer);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [playChime]); // Run ONLY once on mount!

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
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {}
      playChime('ready');
      toast.success('Microfone pronto! Pode falar.');
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
            onClick={() => playChime('ready')}
            className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 border border-zinc-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ouvir som do bip (aviso quando pode falar)"
          >
            <Volume2 size={15} />
            <span className="hidden sm:inline">Ouvir Bip</span>
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
            title={soundFeedback ? "Sons ativados (Bipes de sucesso e alerta)" : "Sons desativados"}
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
                  Fale o nome completo ou primeiro nome + sobrenome (ex: <span className="text-amber-300 font-bold">"Lucas Machado"</span>, <span className="text-amber-300 font-bold">"Lucas Miranda"</span>, <span className="text-amber-300 font-bold">"João Lucas"</span>). O sistema tolera pequenas variações ou erros de fala (ex: <span className="text-amber-300 font-bold">"Luas Machado"</span>).
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
                  Diga: <span className="text-rose-300 font-bold">"Cancelar"</span>, <span className="text-rose-300 font-bold">"Trocar"</span> ou simplesmente fale o nome correto do outro atleta que o card troca na hora.
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

      {/* REAL-TIME SPEAK ALERT BANNER: ALERTING EXACTLY WHEN THE COACH CAN SPEAK */}
      <div className="mb-6 relative z-10">
        {isSystemSpeaking ? (
          <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10 flex items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center shrink-0 shadow-md">
                <Volume2 size={26} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-black">
                    Aguarde
                  </span>
                  <h4 className="text-base font-black text-amber-300 uppercase tracking-wide">
                    O Sistema Está Falando...
                  </h4>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Aguarde o som do <strong>"Bip"</strong> para falar seu próximo comando. O microfone será liberado assim que o sistema terminar!
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 hidden sm:inline-block">
              🔊 Áudio ativo
            </span>
          </div>
        ) : isListening ? (
          <div className={cn(
            "p-4 rounded-2xl border-2 shadow-lg transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
            isSpeechDetected 
              ? "bg-indigo-950/40 border-indigo-500/60 shadow-indigo-500/10" 
              : matchedAthlete
                ? "bg-emerald-950/40 border-emerald-500/60 shadow-emerald-500/10"
                : candidateMatches.length > 1
                  ? "bg-amber-950/40 border-amber-500/60 shadow-amber-500/10"
                  : "bg-emerald-950/30 border-emerald-500/40 shadow-emerald-500/10"
          )}>
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-all",
                isSpeechDetected 
                  ? "bg-indigo-500 text-white animate-pulse" 
                  : "bg-emerald-500 text-black ring-4 ring-emerald-500/20"
              )}>
                <Mic size={26} className={isSpeechDetected ? "animate-bounce" : ""} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono",
                    isSpeechDetected ? "bg-indigo-500 text-white" : "bg-emerald-500 text-black font-sans font-black"
                  )}>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    {isSpeechDetected ? "Ouvindo Sua Voz..." : "PODE FALAR AGORA!"}
                  </span>
                  <h4 className="text-base font-black text-white uppercase tracking-wide">
                    {matchedAthlete 
                      ? "Aguardando confirmação de presença" 
                      : candidateMatches.length > 1 
                        ? "Desempate de homônimos encontrado" 
                        : "Microfone Aberto • Pronto para Ouvir"}
                  </h4>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  {matchedAthlete ? (
                    <>Diga <strong className="text-emerald-400 uppercase font-black">"OK"</strong> ou <strong className="text-emerald-400 uppercase font-black">"SIM"</strong> para confirmar {matchedAthlete.name}, ou fale outro nome para trocar.</>
                  ) : candidateMatches.length > 1 ? (
                    <>Diga o <strong className="text-amber-400 font-black">Sobrenome</strong> (ex: "Machado", "Miranda") ou o <strong className="text-amber-400 font-black">Número</strong> (1, 2...).</>
                  ) : (
                    <>Fale o nome do atleta: <span className="text-emerald-300 font-bold">"Lucas Machado"</span>, <span className="text-emerald-300 font-bold">"Lucas Miranda"</span>, <span className="text-emerald-300 font-bold">"João Lucas"</span>...</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => playChime('ready')}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tocar som de bip de alerta"
              >
                <Volume2 size={14} className="text-amber-400" />
                <span>Ouvir Bip</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                <MicOff size={26} />
              </div>
              <div>
                <h4 className="text-base font-black text-white uppercase tracking-wide">
                  Microfone Pausado
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Clique no botão <strong>"Ligar Mic"</strong> acima ou aperte a barra de espaço para reativar o reconhecimento de voz.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
            >
              Ligar Mic
            </button>
          </div>
        )}
      </div>

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
                        {matchedReason && (
                          <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/40 rounded-lg text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
                            <Sparkles size={11} className="text-amber-400" />
                            {matchedReason}
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
                      setMatchedReason(cand.reason);
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
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                        {cand.reason && (
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded">
                            {cand.reason}
                          </span>
                        )}
                        <span>
                          {cand.athlete.nickname ? `"${cand.athlete.nickname}" • ` : ''}{getSubCategory(cand.athlete.birth_date)}
                        </span>
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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 flex flex-col space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

            {/* Quick Test Chips for Coach Verification */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
              <span className="text-zinc-500 font-bold uppercase">Testar:</span>
              {[
                'Lucas Machado',
                'Luas Machado',
                'Lucas Henrique Miranda Machado',
                'Lucas Miranda',
                'João Lucas',
                'Lucas',
                'OK',
                'Cancelar'
              ].map((testPhrase) => (
                <button
                  key={testPhrase}
                  type="button"
                  onClick={() => {
                    setSimulationInput(testPhrase);
                    processVoiceCommand(testPhrase);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-zinc-800/80 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-zinc-700/80 hover:border-amber-500/40 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  "{testPhrase}"
                </button>
              ))}
            </div>
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
