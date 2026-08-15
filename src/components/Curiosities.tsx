import React, { useState, useMemo, useRef } from 'react';
import { Athlete, Professor, getSubCategory } from '../types';
import { 
  Sparkles, 
  Users, 
  Calendar, 
  Trophy, 
  Cake, 
  Flame, 
  Search, 
  Share2, 
  Download, 
  Heart, 
  Shirt, 
  MapPin, 
  Compass, 
  Award, 
  Layers, 
  Filter, 
  Smile, 
  HelpCircle, 
  ChevronRight, 
  Star, 
  Zap, 
  Eye, 
  CheckCircle2,
  RefreshCw,
  Instagram,
  X,
  Phone,
  Hash
} from 'lucide-react';
import { format, parseISO, differenceInYears, differenceInMonths, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import * as htmlToImage from 'html-to-image';

interface CuriositiesProps {
  athletes: Athlete[];
  professors?: Professor[];
}

// Zodiac Sign helper
interface ZodiacSign {
  name: string;
  symbol: string;
  emoji: string;
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
  trait: string;
  footballStyle: string;
  color: string;
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: 'Capricórnio', symbol: '♑', emoji: '🐐', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19, trait: 'Foco e disciplina tática', footballStyle: 'Guerreiro incansável e capitão nato', color: 'from-amber-600 to-amber-900' },
  { name: 'Aquário', symbol: '♒', emoji: '⚡', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18, trait: 'Criatividade e inovação', footballStyle: 'Dribles inesperados e jogadas geniais', color: 'from-sky-500 to-blue-800' },
  { name: 'Peixes', symbol: '♓', emoji: '🐟', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20, trait: 'Magia e sensibilidade', footballStyle: 'Toque refinado e passe milimétrico', color: 'from-teal-500 to-emerald-800' },
  { name: 'Áries', symbol: '♈', emoji: '🐏', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19, trait: 'Velocidade e agressividade positiva', footballStyle: 'Explosão física e arrancadas fulminantes', color: 'from-red-500 to-rose-800' },
  { name: 'Touro', symbol: '♉', emoji: '🐂', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20, trait: 'Força e solidez', footballStyle: 'Chute potente e proteção de bola impecável', color: 'from-emerald-600 to-green-950' },
  { name: 'Gêmeos', symbol: '♊', emoji: '👥', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20, trait: 'Agilidade e raciocínio rápido', footballStyle: 'Visão de jogo periférica e polivalência', color: 'from-yellow-400 to-amber-700' },
  { name: 'Câncer', symbol: '♋', emoji: '🦀', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22, trait: 'Espírito de equipe e garra', footballStyle: 'Joga pelo grupo e nunca desiste de uma dividida', color: 'from-indigo-400 to-indigo-900' },
  { name: 'Leão', symbol: '♌', emoji: '🦁', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22, trait: 'Protagonismo e liderança', footballStyle: 'Decisivo nos momentos decisivos e artilheiro nato', color: 'from-amber-400 to-orange-700' },
  { name: 'Virgem', symbol: '♍', emoji: '🌾', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22, trait: 'Perfeccionismo e posicionamento', footballStyle: 'Posicionamento impecável e zero erros na saída de bola', color: 'from-emerald-500 to-teal-900' },
  { name: 'Libra', symbol: '♎', emoji: '⚖️', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22, trait: 'Equilíbrio e elegância', footballStyle: 'Futebol clássico, cabeça erguida e controle total', color: 'from-pink-400 to-purple-800' },
  { name: 'Escorpião', symbol: '♏', emoji: '🦂', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21, trait: 'Intensidade e poder de recuperação', footballStyle: 'Desarme cirúrgico e fôlego inesgotável', color: 'from-rose-600 to-red-950' },
  { name: 'Sagitário', symbol: '♐', emoji: '🏹', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21, trait: 'Alegria e ousadia', footballStyle: 'Finalização de longa distância e energia contagiante', color: 'from-purple-500 to-indigo-900' },
];

const getZodiacSign = (day: number, month: number): ZodiacSign => {
  for (const sign of ZODIAC_SIGNS) {
    if (sign.startMonth === sign.endMonth) {
      if (month === sign.startMonth && day >= sign.startDay && day <= sign.endDay) return sign;
    } else if (sign.startMonth === 12 && sign.endMonth === 1) {
      if ((month === 12 && day >= sign.startDay) || (month === 1 && day <= sign.endDay)) return sign;
    } else {
      if ((month === sign.startMonth && day >= sign.startDay) || (month === sign.endMonth && day <= sign.endDay)) {
        return sign;
      }
    }
  }
  return ZODIAC_SIGNS[0];
};

const WEEK_DAYS = [
  { day: 0, name: 'Domingo', nickname: 'Nascidos no Domingo dos Clássicos' },
  { day: 1, name: 'Segunda-feira', nickname: 'Início da Semana com Foco Total' },
  { day: 2, name: 'Terça-feira', nickname: 'Guerreiros de Terça' },
  { day: 3, name: 'Quarta-feira', nickname: 'Noite de Libertadores & Decisão' },
  { day: 4, name: 'Quinta-feira', nickname: 'Quinta dos Campeões' },
  { day: 5, name: 'Sexta-feira', nickname: 'Talento da Sexta' },
  { day: 6, name: 'Sábado', nickname: 'Dia Sagrado do Futebol' },
];

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Curiosities({ athletes, professors = [] }: CuriositiesProps) {
  const { settings } = useTheme();
  const [activeTab, setActiveTab] = useState<'highlights' | 'names' | 'birthdays' | 'zodiac' | 'dna' | 'families' | 'matcher'>('highlights');
  const [selectedItemDetail, setSelectedItemDetail] = useState<{ title: string; subtitle?: string; athletes: Athlete[] } | null>(null);
  const [interactiveSearch, setInteractiveSearch] = useState('');
  const [interactiveBirthday, setInteractiveBirthday] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const storyCardRef = useRef<HTMLDivElement>(null);

  // Active athletes list
  const activeAthletes = useMemo(() => {
    return athletes.filter(a => a.status !== 'Inativo' && a.confirmation !== 'Recusado');
  }, [athletes]);

  // 1. FIRST NAMES FREQUENCY
  const firstNamesStats = useMemo(() => {
    const map = new Map<string, Athlete[]>();
    activeAthletes.forEach(a => {
      if (!a.name) return;
      const parts = a.name.trim().split(/\s+/);
      if (parts.length > 0) {
        const rawFirst = parts[0];
        // Capitalize properly
        const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
        if (firstName.length >= 2) {
          const list = map.get(firstName) || [];
          list.push(a);
          map.set(firstName, list);
        }
      }
    });

    const entries = Array.from(map.entries()).map(([name, list]) => ({
      name,
      count: list.length,
      athletes: list,
      percentage: activeAthletes.length > 0 ? ((list.length / activeAthletes.length) * 100).toFixed(1) : '0'
    }));

    entries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return entries;
  }, [activeAthletes]);

  // Compound names stats
  const compoundNamesStats = useMemo(() => {
    const map = new Map<string, Athlete[]>();
    activeAthletes.forEach(a => {
      if (!a.name) return;
      const parts = a.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        const firstTwo = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()} ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()}`;
        // Only if not a preposition
        if (!['De', 'Da', 'Do', 'Dos', 'Das', 'E'].includes(parts[1])) {
          const list = map.get(firstTwo) || [];
          list.push(a);
          map.set(firstTwo, list);
        }
      }
    });

    const entries = Array.from(map.entries())
      .filter(([_, list]) => list.length >= 2)
      .map(([name, list]) => ({
        name,
        count: list.length,
        athletes: list
      }));

    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [activeAthletes]);

  // 2. SURNAMES / FAMILIES FREQUENCY
  const surnamesStats = useMemo(() => {
    const map = new Map<string, Athlete[]>();
    const ignoredWords = new Set(['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'JUNIOR', 'JÚNIOR', 'FILHO', 'NETO', 'SOBRINHO']);

    activeAthletes.forEach(a => {
      if (!a.name) return;
      const parts = a.name.trim().toUpperCase().split(/\s+/);
      if (parts.length > 1) {
        // Look at all words after the first name
        for (let i = 1; i < parts.length; i++) {
          const rawSurname = parts[i];
          if (!ignoredWords.has(rawSurname) && rawSurname.length > 2) {
            const surname = rawSurname.charAt(0).toUpperCase() + rawSurname.slice(1).toLowerCase();
            const list = map.get(surname) || [];
            if (!list.some(item => item.id === a.id)) {
              list.push(a);
              map.set(surname, list);
            }
          }
        }
      }
    });

    const entries = Array.from(map.entries()).map(([surname, list]) => ({
      surname,
      count: list.length,
      athletes: list,
      percentage: activeAthletes.length > 0 ? ((list.length / activeAthletes.length) * 100).toFixed(1) : '0'
    }));

    entries.sort((a, b) => b.count - a.count || a.surname.localeCompare(b.surname));
    return entries;
  }, [activeAthletes]);

  // 3. BIRTHDAY TWINS & EXACT COSMIC TWINS
  const birthdayTwinsStats = useMemo(() => {
    const dayMonthMap = new Map<string, { day: number; month: number; athletes: Athlete[] }>();
    const exactDateMap = new Map<string, Athlete[]>();

    activeAthletes.forEach(a => {
      if (!a.birth_date) return;
      try {
        let d: number, m: number, y: number;
        if (a.birth_date.includes('/')) {
          const [dStr, mStr, yStr] = a.birth_date.split('/');
          d = parseInt(dStr, 10);
          m = parseInt(mStr, 10);
          y = parseInt(yStr, 10);
        } else {
          const dateObj = parseISO(a.birth_date);
          d = dateObj.getDate();
          m = dateObj.getMonth() + 1;
          y = dateObj.getFullYear();
        }

        if (isNaN(d) || isNaN(m)) return;

        const dayMonthKey = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
        const currentList = dayMonthMap.get(dayMonthKey) || { day: d, month: m, athletes: [] };
        currentList.athletes.push(a);
        dayMonthMap.set(dayMonthKey, currentList);

        if (!isNaN(y)) {
          const exactKey = `${dayMonthKey}/${y}`;
          const exactList = exactDateMap.get(exactKey) || [];
          exactList.push(a);
          exactDateMap.set(exactKey, exactList);
        }
      } catch (_) {}
    });

    // Filter only those with 2+ athletes
    const twins = Array.from(dayMonthMap.entries())
      .filter(([_, data]) => data.athletes.length >= 2)
      .map(([key, data]) => ({
        dateKey: key,
        formatted: `${data.day} de ${MONTHS_NAMES[data.month - 1]}`,
        count: data.athletes.length,
        athletes: data.athletes
      }))
      .sort((a, b) => b.count - a.count);

    const cosmicTwins = Array.from(exactDateMap.entries())
      .filter(([_, list]) => list.length >= 2)
      .map(([key, list]) => ({
        exactDate: key,
        count: list.length,
        athletes: list
      }))
      .sort((a, b) => b.count - a.count);

    return { twins, cosmicTwins };
  }, [activeAthletes]);

  // 4. ZODIAC STATS
  const zodiacStats = useMemo(() => {
    const map = new Map<string, { sign: ZodiacSign; athletes: Athlete[] }>();
    ZODIAC_SIGNS.forEach(s => map.set(s.name, { sign: s, athletes: [] }));

    activeAthletes.forEach(a => {
      if (!a.birth_date) return;
      try {
        let d: number, m: number;
        if (a.birth_date.includes('/')) {
          const [dStr, mStr] = a.birth_date.split('/');
          d = parseInt(dStr, 10);
          m = parseInt(mStr, 10);
        } else {
          const dateObj = parseISO(a.birth_date);
          d = dateObj.getDate();
          m = dateObj.getMonth() + 1;
        }
        if (!isNaN(d) && !isNaN(m)) {
          const sign = getZodiacSign(d, m);
          const entry = map.get(sign.name);
          if (entry) {
            entry.athletes.push(a);
          }
        }
      } catch (_) {}
    });

    const list = Array.from(map.values()).map(item => ({
      ...item.sign,
      count: item.athletes.length,
      athletes: item.athletes,
      percentage: activeAthletes.length > 0 ? ((item.athletes.length / activeAthletes.length) * 100).toFixed(1) : '0'
    }));

    list.sort((a, b) => b.count - a.count);
    return list;
  }, [activeAthletes]);

  // 5. MONTH AND DAY OF THE WEEK OF BIRTH
  const birthTemporalStats = useMemo(() => {
    const monthCounts = Array(12).fill(0).map((_, i) => ({ monthIndex: i, name: MONTHS_NAMES[i], count: 0, athletes: [] as Athlete[] }));
    const weekCounts = Array(7).fill(0).map((_, i) => ({ dayIndex: i, name: WEEK_DAYS[i].name, nickname: WEEK_DAYS[i].nickname, count: 0, athletes: [] as Athlete[] }));

    activeAthletes.forEach(a => {
      if (!a.birth_date) return;
      try {
        let dateObj: Date;
        if (a.birth_date.includes('/')) {
          const [d, m, y] = a.birth_date.split('/');
          dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        } else {
          dateObj = parseISO(a.birth_date);
        }

        if (!isNaN(dateObj.getTime())) {
          const m = dateObj.getMonth();
          const w = dateObj.getDay();

          if (monthCounts[m]) {
            monthCounts[m].count++;
            monthCounts[m].athletes.push(a);
          }
          if (weekCounts[w]) {
            weekCounts[w].count++;
            weekCounts[w].athletes.push(a);
          }
        }
      } catch (_) {}
    });

    const sortedMonths = [...monthCounts].sort((a, b) => b.count - a.count);
    const sortedWeeks = [...weekCounts].sort((a, b) => b.count - a.count);

    return { monthCounts, sortedMonths, weekCounts, sortedWeeks };
  }, [activeAthletes]);

  // 6. CAÇULA & VETERANO + AGE STATS
  const ageExtremes = useMemo(() => {
    if (activeAthletes.length === 0) return null;

    const parseAthleteDate = (bStr: string): Date | null => {
      try {
        if (!bStr) return null;
        if (bStr.includes('/')) {
          const [d, m, y] = bStr.split('/');
          const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
          return isNaN(dt.getTime()) ? null : dt;
        }
        const dt = parseISO(bStr);
        return isNaN(dt.getTime()) ? null : dt;
      } catch (_) {
        return null;
      }
    };

    const validAthletes = activeAthletes
      .map(a => ({ athlete: a, date: parseAthleteDate(a.birth_date) }))
      .filter((item): item is { athlete: Athlete; date: Date } => item.date !== null);

    if (validAthletes.length === 0) return null;

    // Youngest = highest timestamp
    validAthletes.sort((a, b) => b.date.getTime() - a.date.getTime());
    const youngest = validAthletes[0];
    const oldest = validAthletes[validAthletes.length - 1];

    const now = new Date();
    const youngestYears = differenceInYears(now, youngest.date);
    const youngestMonths = differenceInMonths(now, youngest.date) % 12;

    const oldestYears = differenceInYears(now, oldest.date);
    const oldestMonths = differenceInMonths(now, oldest.date) % 12;

    const ageDiffYears = differenceInYears(youngest.date, oldest.date);

    // Calculate average age
    const totalAgeYears = validAthletes.reduce((sum, item) => sum + differenceInYears(now, item.date), 0);
    const avgAge = (totalAgeYears / validAthletes.length).toFixed(1);

    return {
      youngest: {
        athlete: youngest.athlete,
        date: youngest.date,
        formatted: format(youngest.date, "dd/MM/yyyy"),
        ageDisplay: `${youngestYears} ano${youngestYears === 1 ? '' : 's'}${youngestMonths > 0 ? ` e ${youngestMonths} m` : ''}`
      },
      oldest: {
        athlete: oldest.athlete,
        date: oldest.date,
        formatted: format(oldest.date, "dd/MM/yyyy"),
        ageDisplay: `${oldestYears} ano${oldestYears === 1 ? '' : 's'}${oldestMonths > 0 ? ` e ${oldestMonths} m` : ''}`
      },
      ageDiffYears,
      avgAge
    };
  }, [activeAthletes]);

  // 7. JERSEY NUMBERS & MODALITIES
  const jerseyNumberStats = useMemo(() => {
    const map = new Map<string, Athlete[]>();
    activeAthletes.forEach(a => {
      if (!a.jersey_number) return;
      const num = a.jersey_number.trim();
      if (num) {
        const list = map.get(num) || [];
        list.push(a);
        map.set(num, list);
      }
    });

    const entries = Array.from(map.entries()).map(([num, list]) => ({
      number: num,
      count: list.length,
      athletes: list
    }));

    entries.sort((a, b) => b.count - a.count || parseInt(a.number) - parseInt(b.number));
    return entries;
  }, [activeAthletes]);

  // 8. DETECT POSSIBLE SIBLINGS / FAMILIES (Same guardian phone or same address + surname)
  const familyConnections = useMemo(() => {
    const phoneMap = new Map<string, Athlete[]>();
    activeAthletes.forEach(a => {
      const cleanPhone = (a.guardian_phone || a.contact || '').replace(/\D/g, '');
      if (cleanPhone.length >= 8) {
        const list = phoneMap.get(cleanPhone) || [];
        list.push(a);
        phoneMap.set(cleanPhone, list);
      }
    });

    const families = Array.from(phoneMap.entries())
      .filter(([_, list]) => list.length >= 2)
      .map(([phone, list]) => {
        // Find common surnames or guardian name
        const guardianName = list[0].guardian_name || 'Família Conectada';
        return {
          phone,
          guardianName,
          count: list.length,
          athletes: list
        };
      })
      .sort((a, b) => b.count - a.count);

    return families;
  }, [activeAthletes]);

  // 9. NEIGHBORHOODS & CITIES STATS
  const locationStats = useMemo(() => {
    const map = new Map<string, Athlete[]>();
    activeAthletes.forEach(a => {
      const neigh = (a.neighborhood || '').trim().toUpperCase();
      if (neigh && neigh !== '-' && neigh !== 'NÃO INFORMADO') {
        const titleCase = neigh.charAt(0).toUpperCase() + neigh.slice(1).toLowerCase();
        const list = map.get(titleCase) || [];
        list.push(a);
        map.set(titleCase, list);
      }
    });

    const entries = Array.from(map.entries()).map(([name, list]) => ({
      neighborhood: name,
      count: list.length,
      athletes: list
    }));

    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [activeAthletes]);

  // 10. INTERACTIVE FINDER / MATCHER
  const interactiveMatches = useMemo(() => {
    if (!interactiveSearch.trim() && !interactiveBirthday) return null;

    const term = interactiveSearch.trim().toUpperCase();
    
    let matchingByName: Athlete[] = [];
    let matchingBySurname: Athlete[] = [];
    let matchingByBirthday: Athlete[] = [];
    let matchingZodiac: { sign: ZodiacSign; athletes: Athlete[] } | null = null;

    if (term) {
      matchingByName = activeAthletes.filter(a => {
        const firstName = (a.name || '').trim().split(/\s+/)[0]?.toUpperCase();
        return firstName === term || firstName.startsWith(term);
      });

      matchingBySurname = activeAthletes.filter(a => {
        const parts = (a.name || '').trim().toUpperCase().split(/\s+/);
        return parts.slice(1).some(s => s === term || s.includes(term));
      });
    }

    if (interactiveBirthday) {
      try {
        const [targetYear, targetMonth, targetDay] = interactiveBirthday.split('-').map(Number);
        if (targetDay && targetMonth) {
          matchingByBirthday = activeAthletes.filter(a => {
            if (!a.birth_date) return false;
            let d: number, m: number;
            if (a.birth_date.includes('/')) {
              const [dStr, mStr] = a.birth_date.split('/');
              d = parseInt(dStr, 10);
              m = parseInt(mStr, 10);
            } else {
              const dt = parseISO(a.birth_date);
              d = dt.getDate();
              m = dt.getMonth() + 1;
            }
            return d === targetDay && m === targetMonth;
          });

          const sign = getZodiacSign(targetDay, targetMonth);
          const athletesInSign = activeAthletes.filter(a => {
            if (!a.birth_date) return false;
            let d: number, m: number;
            if (a.birth_date.includes('/')) {
              const [dStr, mStr] = a.birth_date.split('/');
              d = parseInt(dStr, 10);
              m = parseInt(mStr, 10);
            } else {
              const dt = parseISO(a.birth_date);
              d = dt.getDate();
              m = dt.getMonth() + 1;
            }
            return getZodiacSign(d, m).name === sign.name;
          });

          matchingZodiac = { sign, athletes: athletesInSign };
        }
      } catch (_) {}
    }

    return {
      matchingByName,
      matchingBySurname,
      matchingByBirthday,
      matchingZodiac
    };
  }, [activeAthletes, interactiveSearch, interactiveBirthday]);

  // Export Story Card
  const handleExportStory = async () => {
    if (!storyCardRef.current) return;
    setIsGeneratingStory(true);
    try {
      const dataUrl = await htmlToImage.toPng(storyCardRef.current, {
        quality: 0.95,
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `pirua-curiosidades-${format(new Date(), 'yyyyMMdd-HHmm')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem de Curiosidades gerada com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const topName = firstNamesStats[0];
  const topSurname = surnamesStats[0];
  const topSign = zodiacStats[0];
  const topMonth = birthTemporalStats.sortedMonths[0];
  const topWeekDay = birthTemporalStats.sortedWeeks[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/40 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
          <Sparkles size={240} className="text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest">
              <Sparkles size={14} className="animate-spin" />
              <span>Raio-X & Fatos Curiosos do Elenco</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight flex items-center gap-3">
              Curiosidades <span className="text-theme-primary">Piruá E.C.</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl">
              Descubra dados surpreendentes, homônimos, sobrenomes mais fortes, irmãos de chuteira, 
              gêmeos de aniversário e o mapa astrológico dos nossos craques!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('matcher')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Search size={16} />
              <span>Buscar Meu "Clone"</span>
            </button>
            <button
              onClick={handleExportStory}
              disabled={isGeneratingStory}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer"
            >
              <Instagram size={16} className="text-pink-500" />
              <span>{isGeneratingStory ? 'Gerando...' : 'Gerar Story'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'highlights', label: '🌟 Destaques de Impacto', count: null },
          { id: 'names', label: '👥 Nomes & Sobrenomes', count: firstNamesStats.length },
          { id: 'birthdays', label: '🎂 Gêmeos de Aniversário', count: birthdayTwinsStats.twins.length },
          { id: 'zodiac', label: '✨ Signos dos Craques', count: 12 },
          { id: 'dna', label: '⚡ DNA & Temporadas', count: null },
          { id: 'families', label: '👨‍👩‍👧‍👦 Famílias & Raízes', count: familyConnections.length },
          { id: 'matcher', label: '🔍 Conexões do Atleta', count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border shrink-0 flex items-center gap-2 cursor-pointer",
              activeTab === tab.id
                ? "bg-theme-primary text-black border-theme-primary shadow-lg shadow-theme-primary/20 scale-[1.02]"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-black",
                activeTab === tab.id ? "bg-black text-theme-primary" : "bg-zinc-800 text-zinc-300"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: HIGHLIGHTS */}
      {activeTab === 'highlights' && (
        <div className="space-y-6">
          {/* Quick Metrics Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Top First Name */}
            <div 
              onClick={() => topName && setSelectedItemDetail({ title: `Atletas com o nome "${topName.name}"`, subtitle: `${topName.count} atletas compartilham este nome`, athletes: topName.athletes })}
              className="p-6 bg-zinc-950/90 border border-zinc-800/90 hover:border-amber-500/50 rounded-3xl transition-all group cursor-pointer relative overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Nome Campeão</span>
                <Users size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {topName ? topName.name : '-'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1 font-bold">
                <span className="text-amber-400">{topName?.count || 0} atletas</span> ({topName?.percentage || 0}% do elenco)
              </p>
              <div className="mt-3 text-[10px] text-zinc-500 group-hover:text-amber-400 transition-colors uppercase font-bold flex items-center gap-1">
                <span>Clique para listar</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Top Surname */}
            <div 
              onClick={() => topSurname && setSelectedItemDetail({ title: `Família "${topSurname.surname}"`, subtitle: `${topSurname.count} atletas carregam este sobrenome`, athletes: topSurname.athletes })}
              className="p-6 bg-zinc-950/90 border border-zinc-800/90 hover:border-emerald-500/50 rounded-3xl transition-all group cursor-pointer relative overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Sobrenome / Família</span>
                <Heart size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {topSurname ? topSurname.surname : '-'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1 font-bold">
                <span className="text-emerald-400">{topSurname?.count || 0} craques</span> com essa raiz
              </p>
              <div className="mt-3 text-[10px] text-zinc-500 group-hover:text-emerald-400 transition-colors uppercase font-bold flex items-center gap-1">
                <span>Clique para listar</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Birthday Twins */}
            <div 
              onClick={() => setActiveTab('birthdays')}
              className="p-6 bg-zinc-950/90 border border-zinc-800/90 hover:border-pink-500/50 rounded-3xl transition-all group cursor-pointer relative overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">Gêmeos de Aniversário</span>
                <Cake size={18} className="text-pink-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {birthdayTwinsStats.twins.length} datas
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-bold">
                <span className="text-pink-400">{birthdayTwinsStats.cosmicTwins.length}</span> gêmeos de ano e dia!
              </p>
              <div className="mt-3 text-[10px] text-zinc-500 group-hover:text-pink-400 transition-colors uppercase font-bold flex items-center gap-1">
                <span>Ver datas compartilhadas</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Top Zodiac Sign */}
            <div 
              onClick={() => topSign && setSelectedItemDetail({ title: `Signo ${topSign.name} (${topSign.symbol})`, subtitle: topSign.footballStyle, athletes: topSign.athletes })}
              className="p-6 bg-zinc-950/90 border border-zinc-800/90 hover:border-sky-500/50 rounded-3xl transition-all group cursor-pointer relative overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">Signo Predominante</span>
                <Sparkles size={18} className="text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>{topSign?.emoji}</span>
                <span>{topSign?.name}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-bold">
                <span className="text-sky-400">{topSign?.count || 0} atletas</span> ({topSign?.percentage}%)
              </p>
              <div className="mt-3 text-[10px] text-zinc-500 group-hover:text-sky-400 transition-colors uppercase font-bold flex items-center gap-1">
                <span>Ver elenco de {topSign?.name}</span>
                <ChevronRight size={12} />
              </div>
            </div>
          </div>

          {/* Age Highlights Cards: O Caçula & O Veterano */}
          {ageExtremes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Youngest */}
              <div className="p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 border border-amber-500/30 rounded-3xl shadow-xl flex items-center gap-5">
                {youngestAvatar(ageExtremes.youngest.athlete)}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-lg">
                    <Sparkles size={10} /> O Caçula do Piruá
                  </div>
                  <h4 className="text-lg font-black text-white uppercase truncate">
                    {ageExtremes.youngest.athlete.name}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Nascido em <strong className="text-white">{ageExtremes.youngest.formatted}</strong> ({ageExtremes.youngest.ageDisplay})
                  </p>
                  <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">
                    Categoria: {getSubCategory(ageExtremes.youngest.athlete.birth_date)}
                  </p>
                </div>
              </div>

              {/* Oldest */}
              <div className="p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950/20 border border-blue-500/30 rounded-3xl shadow-xl flex items-center gap-5">
                {youngestAvatar(ageExtremes.oldest.athlete)}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-lg">
                    <Award size={10} /> O Veterano do Elenco
                  </div>
                  <h4 className="text-lg font-black text-white uppercase truncate">
                    {ageExtremes.oldest.athlete.name}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Nascido em <strong className="text-white">{ageExtremes.oldest.formatted}</strong> ({ageExtremes.oldest.ageDisplay})
                  </p>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Categoria: {getSubCategory(ageExtremes.oldest.athlete.birth_date)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Golden Month & Best Day of Week */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Calendar size={14} /> Mês Mais Fértil de Craques
              </span>
              <h4 className="text-xl font-black text-white uppercase">
                {topMonth ? topMonth.name : '-'}
              </h4>
              <p className="text-xs text-zinc-400">
                <strong className="text-white">{topMonth?.count || 0} atletas</strong> celebram aniversário neste mês!
              </p>
            </div>

            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Flame size={14} /> Dia da Semana do Gol
              </span>
              <h4 className="text-xl font-black text-white uppercase">
                {topWeekDay ? topWeekDay.name : '-'}
              </h4>
              <p className="text-xs text-zinc-400">
                <strong className="text-white">{topWeekDay?.count || 0} craques</strong> nasceram em uma {topWeekDay?.name.toLowerCase()}.
              </p>
            </div>

            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Users size={14} /> Média de Idade Geral
              </span>
              <h4 className="text-xl font-black text-white uppercase">
                {ageExtremes?.avgAge ? `${ageExtremes.avgAge} anos` : '-'}
              </h4>
              <p className="text-xs text-zinc-400">
                Idade média de todo o corpo de alunos da escolinha.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: NAMES & SURNAMES */}
      {activeTab === 'names' && (
        <div className="space-y-8">
          {/* Top First Names */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-2 bg-amber-400 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Nomes Próprios Mais Frequentes (Homônimos)
                </h3>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {firstNamesStats.length} nomes distintos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {firstNamesStats.slice(0, 16).map((item, idx) => (
                <div
                  key={item.name}
                  onClick={() => setSelectedItemDetail({
                    title: `Atletas chamados "${item.name}"`,
                    subtitle: `${item.count} atletas (${item.percentage}% do elenco)`,
                    athletes: item.athletes
                  })}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between",
                    idx === 0
                      ? "bg-amber-950/40 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-500/10"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0",
                      idx === 0 ? "bg-amber-400 text-black font-black" : "bg-zinc-900 text-zinc-400"
                    )}>
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white uppercase truncate group-hover:text-amber-400">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold">
                        {item.percentage}% do total
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-zinc-900 group-hover:bg-amber-400 group-hover:text-black border border-zinc-800 text-zinc-300 rounded-xl text-xs font-black transition-colors shrink-0">
                    {item.count} {item.count === 1 ? 'craque' : 'craques'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compound Names */}
          {compoundNamesStats.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-2 bg-sky-400 rounded-full" />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Nomes Compostos Mais Populares
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {compoundNamesStats.map((item, idx) => (
                  <div
                    key={item.name}
                    onClick={() => setSelectedItemDetail({
                      title: `Nome Composto: "${item.name}"`,
                      subtitle: `${item.count} atletas`,
                      athletes: item.athletes
                    })}
                    className="p-4 bg-zinc-950 border border-zinc-800 hover:border-sky-400 rounded-2xl transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <span className="text-sm font-black text-white uppercase truncate group-hover:text-sky-400">
                      {item.name}
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-900 group-hover:bg-sky-400 group-hover:text-black border border-zinc-800 text-zinc-300 rounded-xl text-xs font-black transition-colors">
                      {item.count} atletas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Surnames & Families */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-2 bg-emerald-400 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Sobrenomes & Famílias Mais Presentes
                </h3>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {surnamesStats.length} sobrenomes no elenco
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {surnamesStats.slice(0, 20).map((item, idx) => (
                <div
                  key={item.surname}
                  onClick={() => setSelectedItemDetail({
                    title: `Sobrenome "${item.surname}"`,
                    subtitle: `${item.count} atletas carregam este sobrenome`,
                    athletes: item.athletes
                  })}
                  className="p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-400 rounded-2xl transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-black text-white uppercase truncate group-hover:text-emerald-400 block">
                      Família {item.surname}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold">
                      {item.percentage}% do elenco
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-zinc-900 group-hover:bg-emerald-400 group-hover:text-black border border-zinc-800 text-zinc-300 rounded-xl text-xs font-black transition-colors shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BIRTHDAYS & TWINS */}
      {activeTab === 'birthdays' && (
        <div className="space-y-8">
          {/* Cosmic Twins (Same Day + Month + Year) */}
          {birthdayTwinsStats.cosmicTwins.length > 0 && (
            <div className="p-6 bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950 border border-purple-500/40 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Gêmeos Cósmicos (Mesmo Dia, Mês e Ano Exatos!)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Atletas que nasceram exatamente no mesmo dia da história:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {birthdayTwinsStats.cosmicTwins.map(group => (
                  <div 
                    key={group.exactDate}
                    onClick={() => setSelectedItemDetail({
                      title: `Gêmeos de ${group.exactDate}`,
                      subtitle: `Nasceram no mesmo dia, mês e ano`,
                      athletes: group.athletes
                    })}
                    className="p-4 bg-black/60 border border-purple-800/40 hover:border-purple-400 rounded-2xl transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-purple-300 uppercase flex items-center gap-1.5">
                        <Cake size={14} /> {group.exactDate}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-900/60 text-purple-200 text-[10px] font-black rounded-lg uppercase">
                        {group.count} atletas idênticos na data
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {group.athletes.map(a => (
                        <span key={a.id} className="text-xs font-bold text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl truncate">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Birthday Twins (Same Day & Month) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-2 bg-pink-400 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Atletas que Comemoram Aniversário no Mesmo Dia
                </h3>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {birthdayTwinsStats.twins.length} datas compartilhadas
              </span>
            </div>

            {birthdayTwinsStats.twins.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950 rounded-3xl border border-zinc-800">
                <p className="text-zinc-500 text-sm">Nenhum aniversário compartilhado encontrado com os atletas atuais.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {birthdayTwinsStats.twins.map(group => (
                  <div
                    key={group.dateKey}
                    onClick={() => setSelectedItemDetail({
                      title: `Aniversariantes de ${group.formatted}`,
                      subtitle: `${group.count} atletas dividem o bolo nesta data`,
                      athletes: group.athletes
                    })}
                    className="p-5 bg-zinc-950 border border-zinc-800 hover:border-pink-500 rounded-3xl transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cake size={16} className="text-pink-400" />
                        <span className="text-base font-black text-white uppercase group-hover:text-pink-400">
                          {group.formatted}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-pink-950 border border-pink-800/60 text-pink-300 text-xs font-black rounded-lg">
                        {group.count} craques
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.athletes.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs py-1 px-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                          <span className="font-bold text-zinc-200 truncate">{a.name}</span>
                          <span className="text-[10px] text-theme-primary font-black uppercase shrink-0">
                            {getSubCategory(a.birth_date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ZODIAC SIGNS */}
      {activeTab === 'zodiac' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-2 bg-amber-400 rounded-full" />
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Mapa Astrológico do Elenco Piruá
              </h3>
            </div>
            <span className="text-xs font-bold text-zinc-400">
              {activeAthletes.length} atletas analisados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zodiacStats.map(item => (
              <div
                key={item.name}
                onClick={() => setSelectedItemDetail({
                  title: `Signo ${item.name} ${item.symbol}`,
                  subtitle: `${item.count} atletas • ${item.trait}`,
                  athletes: item.athletes
                })}
                className="p-5 bg-zinc-950 border border-zinc-800 hover:border-amber-400 rounded-3xl transition-all cursor-pointer group space-y-3 relative overflow-hidden shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div>
                      <h4 className="text-base font-black text-white uppercase tracking-tight group-hover:text-amber-400 flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="text-xs text-amber-400 font-mono">{item.symbol}</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">
                        {item.startDay}/{item.startMonth} a {item.endDay}/{item.endMonth}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 group-hover:bg-amber-400 group-hover:text-black text-white text-xs font-black rounded-xl transition-colors shrink-0">
                    {item.count} {item.count === 1 ? 'atleta' : 'atletas'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${item.percentage}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
                    <span>{item.trait}</span>
                    <span>{item.percentage}%</span>
                  </div>
                </div>

                <div className="p-2.5 bg-black/50 border border-zinc-900 rounded-2xl text-[11px] text-zinc-400 italic">
                  ⚽ "{item.footballStyle}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DNA & TEMPORAL STATS */}
      {activeTab === 'dna' && (
        <div className="space-y-8">
          {/* Months of Birth Ranking */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-2 bg-amber-400 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Mês de Nascimento dos Atletas
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {birthTemporalStats.monthCounts.map((m, idx) => (
                <div
                  key={m.name}
                  onClick={() => setSelectedItemDetail({
                    title: `Nascidos em ${m.name}`,
                    subtitle: `${m.count} atletas nasceram em ${m.name}`,
                    athletes: m.athletes
                  })}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group text-center space-y-1",
                    m.count === topMonth?.count && m.count > 0
                      ? "bg-amber-950/40 border-amber-500/50 hover:border-amber-400"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <span className="text-[10px] font-black text-zinc-500 uppercase block">
                    Mês {idx + 1}
                  </span>
                  <h4 className="text-sm font-black text-white uppercase group-hover:text-amber-400">
                    {m.name}
                  </h4>
                  <span className="inline-block px-2 py-0.5 bg-zinc-900 text-amber-400 text-xs font-black rounded-lg">
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Days of the Week */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-2 bg-emerald-400 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Dia da Semana em que Nasceram
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {birthTemporalStats.weekCounts.map(w => (
                <div
                  key={w.name}
                  onClick={() => setSelectedItemDetail({
                    title: `Nascidos em um(a) ${w.name}`,
                    subtitle: `${w.count} atletas • ${w.nickname}`,
                    athletes: w.athletes
                  })}
                  className="p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-400 rounded-2xl transition-all cursor-pointer group text-center space-y-1.5"
                >
                  <h4 className="text-xs font-black text-white uppercase group-hover:text-emerald-400">
                    {w.name}
                  </h4>
                  <span className="inline-block px-3 py-1 bg-zinc-900 group-hover:bg-emerald-400 group-hover:text-black text-emerald-400 text-xs font-black rounded-xl transition-colors">
                    {w.count} craques
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Jersey Numbers / Camisas Mais Pedidas */}
          {jerseyNumberStats.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-2 bg-purple-400 rounded-full" />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Camisas & Números Mais Requisitados
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {jerseyNumberStats.slice(0, 15).map(j => (
                  <div
                    key={j.number}
                    onClick={() => setSelectedItemDetail({
                      title: `Camisa Número ${j.number}`,
                      subtitle: `${j.count} atletas cadastrados com esta numeração`,
                      athletes: j.athletes
                    })}
                    className="flex items-center gap-2.5 p-3 px-4 bg-zinc-950 border border-zinc-800 hover:border-purple-400 rounded-2xl cursor-pointer group transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black text-sm">
                      {j.number}
                    </div>
                    <div>
                      <span className="text-xs font-black text-white uppercase block">
                        Camisa {j.number}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold">
                        {j.count} {j.count === 1 ? 'atleta' : 'atletas'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: FAMILIES & ROOTS */}
      {activeTab === 'families' && (
        <div className="space-y-8">
          {/* Detected Siblings & Families */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-2 bg-emerald-400 rounded-full" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Irmãos de Chuteira & Famílias Conectadas
                </h3>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {familyConnections.length} conexões detectadas
              </span>
            </div>

            {familyConnections.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950 rounded-3xl border border-zinc-800">
                <p className="text-zinc-500 text-sm">Nenhuma família com contatos em comum detectada no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyConnections.map((fam, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedItemDetail({
                      title: fam.guardianName ? `Família de ${fam.guardianName}` : 'Irmãos Conectados',
                      subtitle: `${fam.count} atletas matriculados`,
                      athletes: fam.athletes
                    })}
                    className="p-5 bg-zinc-950 border border-zinc-800 hover:border-emerald-400 rounded-3xl transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                          <Heart size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-emerald-400 truncate max-w-[180px]">
                            {fam.guardianName}
                          </h4>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold">
                            <Phone size={10} /> {fam.phone}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-black rounded-xl shrink-0">
                        {fam.count} atletas
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {fam.athletes.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs py-1.5 px-3 bg-zinc-900/90 rounded-xl border border-zinc-800">
                          <span className="font-bold text-white truncate">{a.name}</span>
                          <span className="text-[10px] text-theme-primary font-black uppercase shrink-0">
                            {getSubCategory(a.birth_date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Neighborhoods and Cities */}
          {locationStats.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-2 bg-sky-400 rounded-full" />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Bairros com Maior Presença de Alunos
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {locationStats.slice(0, 12).map(l => (
                  <div
                    key={l.neighborhood}
                    onClick={() => setSelectedItemDetail({
                      title: `Bairro ${l.neighborhood}`,
                      subtitle: `${l.count} atletas residem neste bairro`,
                      athletes: l.athletes
                    })}
                    className="p-4 bg-zinc-950 border border-zinc-800 hover:border-sky-400 rounded-2xl transition-all cursor-pointer group text-center space-y-1"
                  >
                    <MapPin size={16} className="text-sky-400 mx-auto group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-black text-white uppercase truncate group-hover:text-sky-400">
                      {l.neighborhood}
                    </h4>
                    <span className="inline-block px-2 py-0.5 bg-zinc-900 text-sky-400 text-xs font-black rounded-lg">
                      {l.count} atletas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: INTERACTIVE MATCHER / BUSCADOR */}
      {activeTab === 'matcher' && (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/30 border border-amber-500/40 rounded-3xl shadow-xl space-y-5">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Search size={22} className="text-amber-400" />
                Localizador de Conexões & Homônimos
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Digite um primeiro nome, sobrenome ou escolha sua data de aniversário para descobrir todos os atletas que compartilham dados com você!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Nome ou Sobrenome
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={interactiveSearch}
                    onChange={e => setInteractiveSearch(e.target.value)}
                    placeholder="Ex: Davi, Silva, Gabriel, Santos..."
                    className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 focus:border-amber-400 rounded-2xl text-sm font-bold text-white uppercase placeholder:text-zinc-600 focus:outline-none transition-all"
                  />
                  {interactiveSearch && (
                    <button 
                      onClick={() => setInteractiveSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Data de Aniversário (Dia e Mês)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={interactiveBirthday}
                    onChange={e => setInteractiveBirthday(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-zinc-800 focus:border-amber-400 rounded-2xl text-sm font-bold text-white uppercase focus:outline-none transition-all"
                  />
                  {interactiveBirthday && (
                    <button 
                      onClick={() => setInteractiveBirthday('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Matcher Results */}
          {interactiveMatches && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* By First Name */}
              {interactiveMatches.matchingByName.length > 0 && (
                <div className="p-5 bg-zinc-950 border border-amber-500/30 rounded-3xl space-y-3">
                  <h4 className="text-base font-black text-amber-400 uppercase flex items-center justify-between">
                    <span>Atletas com o primeiro nome "{interactiveSearch}":</span>
                    <span className="text-xs px-2.5 py-0.5 bg-amber-400 text-black rounded-lg">
                      {interactiveMatches.matchingByName.length} encontrados
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {interactiveMatches.matchingByName.map(a => athleteCard(a))}
                  </div>
                </div>
              )}

              {/* By Surname */}
              {interactiveMatches.matchingBySurname.length > 0 && (
                <div className="p-5 bg-zinc-950 border border-emerald-500/30 rounded-3xl space-y-3">
                  <h4 className="text-base font-black text-emerald-400 uppercase flex items-center justify-between">
                    <span>Atletas com o sobrenome "{interactiveSearch}":</span>
                    <span className="text-xs px-2.5 py-0.5 bg-emerald-400 text-black rounded-lg">
                      {interactiveMatches.matchingBySurname.length} encontrados
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {interactiveMatches.matchingBySurname.map(a => athleteCard(a))}
                  </div>
                </div>
              )}

              {/* By Birthday */}
              {interactiveMatches.matchingByBirthday.length > 0 && (
                <div className="p-5 bg-zinc-950 border border-pink-500/30 rounded-3xl space-y-3">
                  <h4 className="text-base font-black text-pink-400 uppercase flex items-center justify-between">
                    <span>Gêmeos de Aniversário na mesma data:</span>
                    <span className="text-xs px-2.5 py-0.5 bg-pink-400 text-black rounded-lg">
                      {interactiveMatches.matchingByBirthday.length} encontrados
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {interactiveMatches.matchingByBirthday.map(a => athleteCard(a))}
                  </div>
                </div>
              )}

              {/* By Zodiac */}
              {interactiveMatches.matchingZodiac && (
                <div className="p-5 bg-zinc-950 border border-purple-500/30 rounded-3xl space-y-3">
                  <h4 className="text-base font-black text-purple-400 uppercase flex items-center justify-between">
                    <span>
                      {interactiveMatches.matchingZodiac.sign.emoji} Atletas do mesmo signo ({interactiveMatches.matchingZodiac.sign.name}):
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-purple-400 text-black rounded-lg">
                      {interactiveMatches.matchingZodiac.athletes.length} atletas
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {interactiveMatches.matchingZodiac.athletes.map(a => athleteCard(a))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL / BOTTOM SHEET: SELECTED ITEM ATHLETES LIST */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedItemDetail(null)}
              className="absolute top-6 right-6 p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-lg mb-2">
                <Sparkles size={12} /> Detalhe do Grupo
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                {selectedItemDetail.title}
              </h3>
              {selectedItemDetail.subtitle && (
                <p className="text-sm text-zinc-400 mt-0.5 font-bold">
                  {selectedItemDetail.subtitle}
                </p>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-2 scrollbar-thin">
              {selectedItemDetail.athletes.map(a => (
                <div 
                  key={a.id} 
                  className="flex items-center justify-between p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl hover:border-amber-400/50 transition-all gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {a.photo ? (
                      <img src={a.photo} alt={a.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white uppercase truncate">
                        {a.name}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Nascimento: <span className="text-zinc-200">{a.birth_date || 'Não inf.'}</span>
                        {a.position ? ` • ${a.position}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-[11px] font-black uppercase shrink-0">
                    {getSubCategory(a.birth_date)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-xs tracking-wider rounded-xl border border-zinc-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN STORY CARD TEMPLATE FOR INSTAGRAM EXPORT */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div 
          ref={storyCardRef} 
          className="w-[1080px] h-[1920px] bg-gradient-to-b from-black via-zinc-950 to-[#120a02] p-16 flex flex-col justify-between text-white font-sans relative overflow-hidden"
        >
          {/* Background effects */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[140px]" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center justify-between border-b-2 border-amber-500/30 pb-10">
            <div className="flex items-center gap-6">
              {settings?.schoolCrest ? (
                <img src={settings.schoolCrest} alt="Logo" className="w-24 h-24 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-amber-400 flex items-center justify-center text-black font-black text-4xl">P</div>
              )}
              <div>
                <h1 className="text-5xl font-black uppercase tracking-tight text-white">
                  Piruá Esporte Clube
                </h1>
                <p className="text-2xl font-black text-amber-400 uppercase tracking-widest mt-1">
                  Raio-X & Fatos Curiosos
                </p>
              </div>
            </div>

            <div className="px-6 py-3 bg-amber-400 text-black font-black text-2xl uppercase rounded-2xl">
              Edição 2026
            </div>
          </div>

          {/* Middle Facts Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-8 my-auto">
            {/* Fact 1: Top Name */}
            <div className="p-10 bg-zinc-950/90 border-2 border-amber-500/40 rounded-[3rem] space-y-4">
              <span className="text-2xl font-black uppercase tracking-widest text-amber-400 flex items-center gap-3">
                <Users size={32} /> Nome Mais Popular
              </span>
              <h2 className="text-6xl font-black uppercase text-white">
                {topName?.name || 'Davi'}
              </h2>
              <p className="text-2xl text-zinc-300 font-bold">
                Temos <strong className="text-amber-400">{topName?.count || 0} atletas</strong> com este nome no elenco!
              </p>
            </div>

            {/* Fact 2: Top Family */}
            <div className="p-10 bg-zinc-950/90 border-2 border-emerald-500/40 rounded-[3rem] space-y-4">
              <span className="text-2xl font-black uppercase tracking-widest text-emerald-400 flex items-center gap-3">
                <Heart size={32} /> Maior Família
              </span>
              <h2 className="text-6xl font-black uppercase text-white">
                {topSurname?.surname || 'Silva'}
              </h2>
              <p className="text-2xl text-zinc-300 font-bold">
                <strong className="text-emerald-400">{topSurname?.count || 0} craques</strong> carregam esta linhagem.
              </p>
            </div>

            {/* Fact 3: Top Zodiac */}
            <div className="p-10 bg-zinc-950/90 border-2 border-sky-500/40 rounded-[3rem] space-y-4">
              <span className="text-2xl font-black uppercase tracking-widest text-sky-400 flex items-center gap-3">
                <Sparkles size={32} /> Signo Predominante
              </span>
              <h2 className="text-6xl font-black uppercase text-white flex items-center gap-4">
                <span>{topSign?.emoji}</span>
                <span>{topSign?.name}</span>
              </h2>
              <p className="text-2xl text-zinc-300 font-bold">
                <strong className="text-sky-400">{topSign?.count || 0} atletas</strong> regidos por este signo!
              </p>
            </div>

            {/* Fact 4: Birthday Twins */}
            <div className="p-10 bg-zinc-950/90 border-2 border-pink-500/40 rounded-[3rem] space-y-4">
              <span className="text-2xl font-black uppercase tracking-widest text-pink-400 flex items-center gap-3">
                <Cake size={32} /> Gêmeos de Aniversário
              </span>
              <h2 className="text-6xl font-black uppercase text-white">
                {birthdayTwinsStats.twins.length} Datas
              </h2>
              <p className="text-2xl text-zinc-300 font-bold">
                Coincidências onde 2 ou mais atletas dividem a mesma data!
              </p>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="relative z-10 flex items-center justify-between border-t-2 border-zinc-800 pt-8">
            <div className="text-2xl font-black text-zinc-400 uppercase">
              {activeAthletes.length} Atletas Matriculados
            </div>
            <div className="text-2xl font-black text-amber-400 uppercase">
              @piruaec • Gestão Esportiva
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-helper for rendering athlete cards in matcher
function athleteCard(a: Athlete) {
  return (
    <div key={a.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h5 className="text-xs font-black text-white uppercase truncate">{a.name}</h5>
        <p className="text-[10px] text-zinc-400">{a.birth_date || 'Sem data'}</p>
      </div>
      <span className="px-2 py-0.5 bg-black text-theme-primary text-[10px] font-black uppercase rounded-md shrink-0">
        {getSubCategory(a.birth_date)}
      </span>
    </div>
  );
}

function youngestAvatar(athlete: Athlete) {
  if (athlete.photo) {
    return (
      <img 
        src={athlete.photo} 
        alt={athlete.name} 
        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shrink-0" 
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 flex items-center justify-center font-black text-xl shrink-0">
      {athlete.name.slice(0, 2).toUpperCase()}
    </div>
  );
}
