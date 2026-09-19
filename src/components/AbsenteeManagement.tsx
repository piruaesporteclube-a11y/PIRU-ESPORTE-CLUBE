import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import { Athlete, Training, Attendance, getSubCategory, matchesCategoryCriteria, categories, isTrainingEligibleForAthlete } from '../types';
import { 
  UserX, 
  Search, 
  Calendar, 
  Filter, 
  MessageCircle, 
  FileDown, 
  Printer, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  TrendingDown, 
  TrendingUp, 
  Share2, 
  Phone, 
  User, 
  Award, 
  Layers, 
  Send,
  Edit3,
  Check,
  X,
  FileSpreadsheet,
  Zap,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { format, parseISO, isToday, isBefore, isAfter, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, fixHtml2CanvasColors } from '../utils';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AbsenteeManagementProps {
  onNavigateToAttendance?: (trainingId?: string, date?: string) => void;
  onNavigateToAthlete?: (athleteId: string) => void;
}

export default function AbsenteeManagement({ onNavigateToAttendance, onNavigateToAthlete }: AbsenteeManagementProps) {
  const { settings } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  
  // Selection & Filters
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('latest');
  const [filterSub, setFilterSub] = useState<string>('Todos');
  const [filterModality, setFilterModality] = useState<string>('Todos');
  const [filterConsecutive, setFilterConsecutive] = useState<'all' | '2plus' | '3plus' | 'unjustified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'byTraining' | 'evolution' | 'ranking'>('byTraining');

  // Justification Modal
  const [justifyingRecord, setJustifyingRecord] = useState<{
    athlete: Athlete;
    attendanceRecord?: Attendance;
    training: Training;
    date: string;
  } | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [isSavingJustification, setIsSavingJustification] = useState(false);

  // Template for WhatsApp notification
  const [whatsappTemplate, setWhatsappTemplate] = useState(() => {
    return localStorage.getItem('pirua_absentee_tab_template') || 
      "Olá, {NOME_RESPONSAVEL}! Notamos a ausência do atleta {NOME_ATLETA} no treino do Piruá Esporte Clube do dia {DATA_TREINO} ({CATEGORIA}). Gostaríamos de saber se está tudo bem e se há alguma justificativa para mantermos a frequência atualizada. Agradecemos o retorno! ⚽⚡";
  });

  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const printableReportRef = useRef<HTMLDivElement>(null);

  // Load logo
  useEffect(() => {
    if (!settings?.schoolCrest) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setCrestDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (e) {
        console.warn('Could not cache crest as dataUrl', e);
      }
    };
    img.src = settings.schoolCrest;
  }, [settings?.schoolCrest]);

  // Load initial data
  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [fetchedAthletes, fetchedTrainings, fetchedAttendance] = await Promise.all([
        api.getAthletes(true),
        api.getTrainings(),
        api.getAttendance() // gets all attendance
      ]);

      setAthletes(fetchedAthletes || []);
      
      // Sort trainings chronologically (newest first)
      const sortedTrainings = (fetchedTrainings || []).sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.start_time || '').localeCompare(a.start_time || '');
      });
      setTrainings(sortedTrainings);
      setAllAttendance(fetchedAttendance || []);

      if (sortedTrainings.length > 0 && selectedTrainingId === 'latest') {
        setSelectedTrainingId(sortedTrainings[0].id);
      }
    } catch (err) {
      console.error("Error loading absentee data:", err);
      toast.error("Erro ao carregar dados de faltas e presenças.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Realtime subscription to attendance
    const unsub = api.subscribeToAttendance((updatedAtt) => {
      setAllAttendance(prev => {
        // Merge or replace
        const map = new Map<string, Attendance>();
        prev.forEach(item => map.set(item.id, item));
        updatedAtt.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      });
    });

    return () => unsub();
  }, []);

  // Map of attendance by athleteId -> Array of Attendance
  const attendanceByAthlete = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    allAttendance.forEach(att => {
      if (!map.has(att.athlete_id)) {
        map.set(att.athlete_id, []);
      }
      map.get(att.athlete_id)!.push(att);
    });
    return map;
  }, [allAttendance]);

  // Active training object
  const activeTraining = useMemo(() => {
    if (trainings.length === 0) return null;
    if (selectedTrainingId === 'latest') return trainings[0];
    return trainings.find(t => t.id === selectedTrainingId) || trainings[0];
  }, [trainings, selectedTrainingId]);

  // Helper to check athlete attendance status on a specific training
  const getAthleteStatusInTraining = (athlete: Athlete, training: Training) => {
    const athleteRecords = attendanceByAthlete.get(athlete.id) || [];
    
    // Match by training_id or date
    const record = athleteRecords.find(r => 
      (r.training_id && r.training_id === training.id) || 
      (r.date === training.date && (!r.training_id || r.training_id === training.id))
    );

    if (!record) {
      // If attendance was not marked at all for this athlete in this training
      return { status: 'Sem Registro', record: undefined, isAbsent: true, isJustified: false };
    }

    const isPresent = record.status === 'Presente';
    const isAbsent = record.status === 'Faltou';
    const isJustified = isAbsent && !!record.justification && record.justification.trim() !== '';

    return {
      status: isPresent ? 'Presente' : (isJustified ? 'Falta Justificada' : 'Falta'),
      record,
      isAbsent,
      isJustified,
      justification: record.justification
    };
  };

  // Calculate recent history streak of an athlete (last N trainings they were eligible for)
  const getAthleteHistoryStreak = (athlete: Athlete, limitCount = 5) => {
    const eligibleTrainings = trainings
      .filter(t => isTrainingEligibleForAthlete(athlete, t))
      .slice(0, limitCount);

    return eligibleTrainings.map(t => {
      const { status, record, isAbsent, isJustified } = getAthleteStatusInTraining(athlete, t);
      return {
        training: t,
        status,
        isAbsent,
        isJustified,
        justification: record?.justification
      };
    });
  };

  // Calculate consecutive absences for an athlete up to the selected training or latest
  const getConsecutiveAbsencesCount = (athlete: Athlete, fromTrainingIndex = 0) => {
    const eligibleTrainings = trainings.filter(t => isTrainingEligibleForAthlete(athlete, t));
    let count = 0;

    for (let i = fromTrainingIndex; i < eligibleTrainings.length; i++) {
      const t = eligibleTrainings[i];
      const { isAbsent, status } = getAthleteStatusInTraining(athlete, t);
      if (isAbsent || status === 'Sem Registro') {
        count++;
      } else {
        break; // Stop when they attended
      }
    }
    return count;
  };

  // Analysis for the Active Training
  const trainingAnalysis = useMemo(() => {
    if (!activeTraining) return null;

    // Athletes eligible for this training
    const eligibleAthletes = athletes.filter(a => {
      if (a.status !== 'Ativo') return false;
      return isTrainingEligibleForAthlete(a, activeTraining);
    });

    const presentList: Athlete[] = [];
    const absentList: {
      athlete: Athlete;
      record?: Attendance;
      isJustified: boolean;
      justification?: string;
      consecutiveCount: number;
      streak: { training: Training; status: string; isAbsent: boolean; isJustified: boolean }[];
    }[] = [];

    eligibleAthletes.forEach(athlete => {
      const { status, record, isAbsent, isJustified, justification } = getAthleteStatusInTraining(athlete, activeTraining);
      
      if (status === 'Presente') {
        presentList.push(athlete);
      } else {
        const activeIdx = trainings.findIndex(t => t.id === activeTraining.id);
        const consecutiveCount = getConsecutiveAbsencesCount(athlete, activeIdx >= 0 ? activeIdx : 0);
        const streak = getAthleteHistoryStreak(athlete, 5);

        absentList.push({
          athlete,
          record,
          isJustified,
          justification,
          consecutiveCount,
          streak
        });
      }
    });

    // Sort absent list (unjustified first, then by consecutive absences, then name)
    absentList.sort((a, b) => {
      if (a.isJustified !== b.isJustified) return a.isJustified ? 1 : -1;
      if (b.consecutiveCount !== a.consecutiveCount) return b.consecutiveCount - a.consecutiveCount;
      return a.athlete.name.localeCompare(b.athlete.name);
    });

    const totalEligible = eligibleAthletes.length;
    const totalPresent = presentList.length;
    const totalAbsent = absentList.length;
    const totalJustified = absentList.filter(a => a.isJustified).length;
    const totalUnjustified = totalAbsent - totalJustified;
    const attendanceRate = totalEligible > 0 ? Math.round((totalPresent / totalEligible) * 100) : 0;
    const absenceRate = totalEligible > 0 ? Math.round((totalAbsent / totalEligible) * 100) : 0;

    return {
      eligibleAthletes,
      presentList,
      absentList,
      totalEligible,
      totalPresent,
      totalAbsent,
      totalJustified,
      totalUnjustified,
      attendanceRate,
      absenceRate
    };
  }, [activeTraining, athletes, attendanceByAthlete, trainings]);

  // Filtered Absentees for the Active Training
  const filteredAbsentees = useMemo(() => {
    if (!trainingAnalysis) return [];
    
    return trainingAnalysis.absentList.filter(item => {
      const { athlete, isJustified, consecutiveCount } = item;
      
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = athlete.name.toLowerCase().includes(q);
        const matchesNick = athlete.nickname?.toLowerCase().includes(q);
        const matchesDoc = athlete.doc.includes(q);
        const matchesJersey = athlete.jersey_number?.includes(q);
        if (!matchesName && !matchesNick && !matchesDoc && !matchesJersey) {
          return false;
        }
      }

      // SUB Category
      if (filterSub !== 'Todos') {
        if (!matchesCategoryCriteria(athlete, filterSub)) {
          return false;
        }
      }

      // Modality
      if (filterModality !== 'Todos') {
        const athleteMods = (athlete.modality || '').toLowerCase();
        if (!athleteMods.includes(filterModality.toLowerCase())) {
          return false;
        }
      }

      // Consecutive / Justification filter
      if (filterConsecutive === '2plus' && consecutiveCount < 2) return false;
      if (filterConsecutive === '3plus' && consecutiveCount < 3) return false;
      if (filterConsecutive === 'unjustified' && isJustified) return false;

      return true;
    });
  }, [trainingAnalysis, searchQuery, filterSub, filterModality, filterConsecutive]);

  // Ranking of Absences across all trainings
  const rankingAnalysis = useMemo(() => {
    const activeAthletes = athletes.filter(a => a.status === 'Ativo');

    const ranking = activeAthletes.map(athlete => {
      const eligibleTrainings = trainings.filter(t => isTrainingEligibleForAthlete(athlete, t));
      let presentCount = 0;
      let absentCount = 0;
      let justifiedCount = 0;

      eligibleTrainings.forEach(t => {
        const { status, isAbsent, isJustified } = getAthleteStatusInTraining(athlete, t);
        if (status === 'Presente') presentCount++;
        else if (isAbsent || status === 'Sem Registro') {
          absentCount++;
          if (isJustified) justifiedCount++;
        }
      });

      const totalTrainings = eligibleTrainings.length;
      const attendancePercent = totalTrainings > 0 ? Math.round((presentCount / totalTrainings) * 100) : 0;
      const absencePercent = totalTrainings > 0 ? Math.round((absentCount / totalTrainings) * 100) : 0;
      const currentStreak = getConsecutiveAbsencesCount(athlete, 0);

      return {
        athlete,
        totalTrainings,
        presentCount,
        absentCount,
        justifiedCount,
        unjustifiedCount: absentCount - justifiedCount,
        attendancePercent,
        absencePercent,
        currentStreak
      };
    });

    // Filter and sort ranking
    return ranking
      .filter(item => {
        if (filterSub !== 'Todos' && !matchesCategoryCriteria(item.athlete, filterSub)) return false;
        if (filterModality !== 'Todos' && !(item.athlete.modality || '').toLowerCase().includes(filterModality.toLowerCase())) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return item.athlete.name.toLowerCase().includes(q) || (item.athlete.nickname || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (b.absentCount !== a.absentCount) return b.absentCount - a.absentCount;
        return b.currentStreak - a.currentStreak;
      });
  }, [athletes, trainings, attendanceByAthlete, filterSub, filterModality, searchQuery]);

  // Evolution Training a Training
  const evolutionList = useMemo(() => {
    return trainings.slice(0, 15).map(t => {
      const eligible = athletes.filter(a => a.status === 'Ativo' && isTrainingEligibleForAthlete(a, t));
      let present = 0;
      let absent = 0;
      let justified = 0;

      eligible.forEach(a => {
        const { status, isJustified } = getAthleteStatusInTraining(a, t);
        if (status === 'Presente') present++;
        else {
          absent++;
          if (isJustified) justified++;
        }
      });

      const total = eligible.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        training: t,
        total,
        present,
        absent,
        justified,
        unjustified: absent - justified,
        rate
      };
    });
  }, [trainings, athletes, attendanceByAthlete]);

  // Send WhatsApp message to single absentee
  const handleSendWhatsApp = (athlete: Athlete, training: Training, target: 'parent' | 'athlete' = 'parent') => {
    const phone = target === 'parent' ? athlete.guardian_phone : athlete.contact;
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanPhone) {
      toast.error(`Atleta ou responsável não possui telefone cadastrado!`);
      return;
    }

    const trainingDateStr = training.date ? format(parseISO(training.date), 'dd/MM/yyyy') : 'Data do treino';
    const subCat = training.category || getSubCategory(athlete.birth_date);

    let message = whatsappTemplate
      .replace(/{NOME_RESPONSAVEL}/g, athlete.guardian_name || 'Responsável')
      .replace(/{NOME_ATLETA}/g, athlete.name)
      .replace(/{DATA_TREINO}/g, trainingDateStr)
      .replace(/{CATEGORIA}/g, subCat)
      .replace(/{HORARIO_TREINO}/g, `${training.start_time || 'S/H'} às ${training.end_time || 'S/H'}`)
      .replace(/{LOCAL_TREINO}/g, training.location || 'Campo Oficial');

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(`Mensagem aberta para ${athlete.name}!`);
  };

  // Save Justification
  const handleSaveJustification = async () => {
    if (!justifyingRecord) return;
    setIsSavingJustification(true);

    try {
      const { athlete, attendanceRecord, training, date } = justifyingRecord;
      const targetId = attendanceRecord?.id || (training?.id ? `${athlete.id}_training_${training.id}` : `${athlete.id}_${date || training?.date}`);

      const recordToSave: Partial<Attendance> = {
        id: targetId,
        athlete_id: athlete.id,
        training_id: training?.id,
        date: date || training?.date,
        status: 'Faltou',
        justification: justificationText.trim()
      };

      await api.saveAttendance(recordToSave);
      
      // Update local state
      setAllAttendance(prev => {
        const filtered = prev.filter(r => r.id !== targetId && r.id !== attendanceRecord?.id);
        return [...filtered, { ...recordToSave, id: targetId } as Attendance];
      });

      toast.success("Justificativa registrada com sucesso!");
      setJustifyingRecord(null);
      setJustificationText('');
    } catch (err: any) {
      toast.error(`Erro ao salvar justificativa: ${err.message}`);
    } finally {
      setIsSavingJustification(false);
    }
  };

  // Export PDF Report of Training Absentees
  const handleExportPDF = async () => {
    if (!printableReportRef.current || !activeTraining) return;
    toast.loading("Gerando relatório em PDF dos faltosos...");

    try {
      const element = printableReportRef.current;
      element.classList.remove('hidden');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });

      element.classList.add('hidden');

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Faltosos_Treino_${activeTraining.date}_${activeTraining.category || 'Geral'}.pdf`;
      pdf.save(fileName);
      toast.dismiss();
      toast.success("Relatório de Faltosos gerado com sucesso!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.dismiss();
      toast.error("Erro ao gerar relatório em PDF.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-14 h-14 border-4 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm font-black uppercase tracking-widest animate-pulse">
          Carregando Guia dos Faltosos Treino a Treino...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-2 sm:px-4">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950/30 border border-red-900/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 shadow-lg shadow-red-500/10 shrink-0">
              <UserX size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  Guia dos Faltosos
                </h1>
                <span className="px-2.5 py-0.5 bg-red-500 text-black text-[10px] font-black rounded-full uppercase tracking-wider">
                  Treino a Treino
                </span>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Controle dinâmico de ausências baseado nas presenças já realizadas. Atualizado automaticamente treino após treino.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Recarregar presenças e treinos"
            >
              <RefreshCw size={15} className={cn(refreshing && "animate-spin text-theme-primary")} />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            {activeTraining && trainingAnalysis && (
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 cursor-pointer"
                title="Imprimir / Baixar Lista em PDF deste Treino"
              >
                <FileDown size={16} />
                <span>Baixar PDF</span>
              </button>
            )}

            {onNavigateToAttendance && activeTraining && (
              <button
                type="button"
                onClick={() => onNavigateToAttendance(activeTraining.id, activeTraining.date)}
                className="flex items-center gap-2 px-4 py-2.5 bg-theme-primary hover:brightness-110 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-theme-primary/20 hover:scale-105 active:scale-95 cursor-pointer"
                title="Ir para a Chamada deste Treino"
              >
                <Calendar size={16} />
                <span>Abrir Chamada</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="grid grid-cols-3 gap-2 mt-6 p-1.5 bg-black/60 rounded-2xl border border-zinc-800/80 max-w-lg">
          <button
            type="button"
            onClick={() => setViewMode('byTraining')}
            className={cn(
              "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
              viewMode === 'byTraining' 
                ? "bg-red-500 text-white shadow-md shadow-red-500/20" 
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Clock size={14} />
            <span>Por Treino</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('evolution')}
            className={cn(
              "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
              viewMode === 'evolution' 
                ? "bg-red-500 text-white shadow-md shadow-red-500/20" 
                : "text-zinc-400 hover:text-white"
            )}
          >
            <TrendingDown size={14} />
            <span>Evolução</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ranking')}
            className={cn(
              "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
              viewMode === 'ranking' 
                ? "bg-red-500 text-white shadow-md shadow-red-500/20" 
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Award size={14} />
            <span>Ranking</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: BY TRAINING (TREINO A TREINO)                                */}
      {/* ========================================================================= */}
      {viewMode === 'byTraining' && (
        <div className="space-y-6">
          
          {/* Training Selector Carousel / Dropdown */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="text-theme-primary" size={18} />
                <h2 className="text-sm font-black uppercase text-white tracking-wider">
                  Selecione o Treino para Auditar as Faltas
                </h2>
              </div>

              <span className="text-[11px] font-bold text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                {trainings.length} {trainings.length === 1 ? 'treino cadastrado' : 'treinos cadastrados'}
              </span>
            </div>

            {trainings.length === 0 ? (
              <div className="text-center py-8 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800">
                <AlertTriangle className="mx-auto text-amber-400 mb-2" size={28} />
                <p className="text-zinc-400 text-xs font-bold uppercase">Nenhum treino cadastrado no sistema ainda.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {trainings.map((t, idx) => {
                  const isSelected = activeTraining?.id === t.id;
                  const dateFormatted = t.date ? format(parseISO(t.date), 'dd/MM (EEE)', { locale: ptBR }) : 'S/D';

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTrainingId(t.id)}
                      className={cn(
                        "flex flex-col text-left px-4 py-3 rounded-2xl border transition-all shrink-0 min-w-[170px] cursor-pointer",
                        isSelected
                          ? "bg-red-500/15 border-red-500 text-white shadow-lg shadow-red-500/10 scale-[1.02]"
                          : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={cn("text-xs font-black uppercase", isSelected ? "text-red-400" : "text-zinc-300")}>
                          {dateFormatted}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 bg-theme-primary text-black font-black text-[9px] rounded-md uppercase">
                            Mais Recente
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-white truncate max-w-[150px]">
                        {t.category || 'Todas as Categorias'}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                        <span>{t.start_time || 'S/H'}</span>
                        <span className="truncate max-w-[80px]">{t.modality || 'Geral'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Training Stats & Summary Dashboard */}
          {activeTraining && trainingAnalysis && (
            <div className="space-y-4">
              {/* Training Banner */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-xs font-black uppercase">
                      Treino {activeTraining.date ? format(parseISO(activeTraining.date), 'dd/MM/yyyy') : 'Sem Data'}
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-black uppercase">
                      {activeTraining.category || 'Todas as Categorias'}
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-800 text-theme-primary rounded-xl text-xs font-black uppercase">
                      {activeTraining.modality || 'Futebol'}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-2 font-medium">
                    Horário: <strong className="text-white">{activeTraining.start_time || '00:00'} às {activeTraining.end_time || '00:00'}</strong> • Local: <strong className="text-white">{activeTraining.location || 'Campo Oficial'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-zinc-500 block">Assiduidade da Turma</span>
                    <span className="text-2xl font-black text-white">{trainingAnalysis.attendanceRate}%</span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-lg text-theme-primary">
                    {trainingAnalysis.totalPresent}/{trainingAnalysis.totalEligible}
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-zinc-500 block">Total Esperado</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-2xl font-black text-white">{trainingAnalysis.totalEligible}</span>
                    <User size={20} className="text-zinc-600" />
                  </div>
                  <span className="text-[10px] text-zinc-400">Atletas ativos na categoria</span>
                </div>

                <div className="bg-zinc-950 border border-emerald-900/30 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-emerald-400 block">Presentes</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-2xl font-black text-emerald-400">{trainingAnalysis.totalPresent}</span>
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-zinc-400">{trainingAnalysis.attendanceRate}% de presença</span>
                </div>

                <div className="bg-zinc-950 border border-red-900/40 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-red-400 block">Total Faltosos</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-2xl font-black text-red-400">{trainingAnalysis.totalAbsent}</span>
                    <XCircle size={20} className="text-red-500" />
                  </div>
                  <span className="text-[10px] text-zinc-400">{trainingAnalysis.absenceRate}% de ausência</span>
                </div>

                <div className="bg-zinc-950 border border-amber-900/40 rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-amber-400 block">Faltas Sem Justificativa</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-2xl font-black text-amber-400">{trainingAnalysis.totalUnjustified}</span>
                    <AlertTriangle size={20} className="text-amber-500" />
                  </div>
                  <span className="text-[10px] text-zinc-400">{trainingAnalysis.totalJustified} justificadas</span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar faltoso pelo nome, apelido ou camisa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={filterSub}
                  onChange={(e) => setFilterSub(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-2xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="Todos">Todas as Categorias</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Consecutive Absences Filter */}
              <div className="relative">
                <select
                  value={filterConsecutive}
                  onChange={(e: any) => setFilterConsecutive(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-2xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all">Todas as Faltas</option>
                  <option value="unjustified">🚨 Sem Justificativa</option>
                  <option value="2plus">⚠️ 2+ Faltas Seguidas</option>
                  <option value="3plus">⛔ 3+ Faltas (Alerta Evasão)</option>
                </select>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-zinc-900 text-xs">
              <span className="font-bold text-zinc-400">
                Mostrando <strong className="text-white">{filteredAbsentees.length}</strong> de <strong className="text-white">{trainingAnalysis?.totalAbsent || 0}</strong> faltosos
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterConsecutive(prev => prev === 'unjustified' ? 'all' : 'unjustified');
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase transition-all cursor-pointer",
                    filterConsecutive === 'unjustified'
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  )}
                >
                  Sem Justificativa ({trainingAnalysis?.totalUnjustified || 0})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterConsecutive(prev => prev === '2plus' ? 'all' : '2plus');
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase transition-all cursor-pointer",
                    filterConsecutive === '2plus'
                      ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  )}
                >
                  2+ Faltas Seguidas
                </button>
              </div>
            </div>
          </div>

          {/* List of Absentees for Active Training */}
          {filteredAbsentees.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                {trainingAnalysis?.totalAbsent === 0 ? '100% de Presença no Treino!' : 'Nenhum faltoso com os filtros aplicados'}
              </h3>
              <p className="text-zinc-500 text-xs max-w-md mx-auto font-medium">
                {trainingAnalysis?.totalAbsent === 0 
                  ? 'Todos os atletas esperados para este treino compareceram e tiveram sua presença confirmada.'
                  : 'Tente limpar a busca ou os filtros de categoria e faltas consecutivas.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAbsentees.map(({ athlete, isJustified, justification, consecutiveCount, streak, record }) => {
                const subCat = getSubCategory(athlete.birth_date);
                const hasPhone = athlete.guardian_phone || athlete.contact;

                return (
                  <div
                    key={athlete.id}
                    className={cn(
                      "bg-zinc-950 rounded-3xl p-4 sm:p-5 border transition-all shadow-lg flex flex-col justify-between gap-4",
                      consecutiveCount >= 3 
                        ? "border-red-600/70 bg-gradient-to-br from-zinc-950 via-zinc-950 to-red-950/20 shadow-red-950/20" 
                        : (isJustified ? "border-zinc-800 bg-zinc-950" : "border-zinc-800 hover:border-zinc-700")
                    )}
                  >
                    <div>
                      {/* Top Row: Photo + Name + Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {athlete.photo && athlete.photo.trim() !== '' ? (
                              <img src={athlete.photo} alt={athlete.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={20} className="text-zinc-500" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-black text-sm text-white uppercase tracking-tight truncate">
                              {athlete.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase mt-0.5 flex-wrap">
                              <span className="text-theme-primary font-black">{subCat}</span>
                              {athlete.jersey_number && <span>• #{athlete.jersey_number}</span>}
                              {athlete.position && <span className="opacity-70">• {athlete.position}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isJustified ? (
                            <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black rounded-xl uppercase flex items-center gap-1">
                              <HelpCircle size={12} />
                              Justificada
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black rounded-xl uppercase flex items-center gap-1">
                              <XCircle size={12} />
                              Sem Justificativa
                            </span>
                          )}

                          {consecutiveCount >= 2 && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight",
                              consecutiveCount >= 3 
                                ? "bg-red-600 text-white animate-pulse" 
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            )}>
                              {consecutiveCount} Faltas Seguidas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Justification Text Note if available */}
                      {isJustified && justification && (
                        <div className="mt-3 p-2.5 bg-zinc-900/90 border border-amber-500/20 rounded-2xl text-xs text-amber-200/90 font-medium">
                          <span className="text-[10px] font-black uppercase text-amber-400 block mb-0.5">Motivo Registrado:</span>
                          "{justification}"
                        </div>
                      )}

                      {/* Recent History Streak Dots (Last 5 Trainings) */}
                      <div className="mt-4 pt-3 border-t border-zinc-900">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase text-zinc-500">Histórico Recente (Últimos Treinos)</span>
                          <span className="text-[9px] text-zinc-600 font-mono">Mais antigo → Atual</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {streak.slice().reverse().map((item, idx) => {
                            const isPresent = item.status === 'Presente';
                            const dateLabel = item.training.date ? format(parseISO(item.training.date), 'dd/MM') : 'S/D';

                            return (
                              <div
                                key={idx}
                                title={`${dateLabel}: ${item.status}`}
                                className={cn(
                                  "flex-1 py-1.5 px-1 rounded-xl text-center text-[10px] font-black border transition-all",
                                  isPresent
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : (item.isJustified 
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                                        : "bg-red-500/15 border-red-500/30 text-red-400")
                                )}
                              >
                                <span>{isPresent ? '✓' : (item.isJustified ? 'J' : '✗')}</span>
                                <span className="block text-[8px] opacity-70 mt-0.5">{dateLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-zinc-400 font-medium truncate">
                        Resp: <strong className="text-zinc-200">{athlete.guardian_name || 'Não inf.'}</strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Justify Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeTraining) return;
                            setJustifyingRecord({
                              athlete,
                              attendanceRecord: record,
                              training: activeTraining,
                              date: activeTraining.date
                            });
                            setJustificationText(justification || '');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all cursor-pointer"
                          title="Adicionar ou editar justificativa da falta"
                        >
                          <Edit3 size={12} />
                          <span>{isJustified ? 'Editar Motivo' : 'Justificar'}</span>
                        </button>

                        {/* WhatsApp Button */}
                        {hasPhone && activeTraining && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(athlete, activeTraining, 'parent')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-tight transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                            title="Cobrar motivo da falta pelo WhatsApp"
                          >
                            <MessageCircle size={13} />
                            <span>Cobrar Zap</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: EVOLUÇÃO TREINO A TREINO                                     */}
      {/* ========================================================================= */}
      {viewMode === 'evolution' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Evolução das Faltas Treino a Treino
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Acompanhe a frequência e a taxa de ausência ao longo dos treinos realizados.
                </p>
              </div>
              <TrendingDown size={24} className="text-red-400" />
            </div>

            <div className="space-y-3 mt-4">
              {evolutionList.length === 0 ? (
                <p className="text-zinc-500 text-xs text-center py-8">Nenhum treino disponível para histórico.</p>
              ) : (
                evolutionList.map(({ training, total, present, absent, justified, unjustified, rate }) => {
                  const dateStr = training.date ? format(parseISO(training.date), 'dd/MM/yyyy (EEEE)', { locale: ptBR }) : 'Sem Data';

                  return (
                    <div 
                      key={training.id}
                      onClick={() => {
                        setSelectedTrainingId(training.id);
                        setViewMode('byTraining');
                      }}
                      className="p-4 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white uppercase">{dateStr}</span>
                            <span className="px-2 py-0.5 bg-zinc-800 text-theme-primary text-[10px] font-black rounded-md uppercase">
                              {training.category || 'Geral'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            {training.start_time || 'S/H'} às {training.end_time || 'S/H'} • {training.location || 'Campo Oficial'}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-400">{present} Presentes</span>
                            <span className="text-xs font-black text-red-400 ml-2">{absent} Faltosos</span>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              {unjustified} sem justificativa • {justified} justificadas
                            </div>
                          </div>

                          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-sm text-white group-hover:border-theme-primary/50 transition-all shrink-0">
                            {rate}%
                          </div>

                          <ChevronRight size={18} className="text-zinc-600 group-hover:text-white transition-all" />
                        </div>
                      </div>

                      {/* Progress Bar of Attendance */}
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-3 flex">
                        <div 
                          style={{ width: `${rate}%` }} 
                          className="h-full bg-emerald-500 rounded-full transition-all" 
                        />
                        <div 
                          style={{ width: `${100 - rate}%` }} 
                          className="h-full bg-red-500 rounded-full transition-all" 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: RANKING GERAL DE FALTAS DO ELENCO                            */}
      {/* ========================================================================= */}
      {viewMode === 'ranking' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Ranking Geral de Faltas do Elenco
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Atletas com maior índice de ausência acumulado em todos os treinos da sua categoria.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={filterSub}
                  onChange={(e) => setFilterSub(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="Todos">Todas as Categorias</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ranking Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-black uppercase text-[10px]">
                    <th className="py-3 px-3">Pos</th>
                    <th className="py-3 px-3">Atleta</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3 text-center">Treinos</th>
                    <th className="py-3 px-3 text-center text-emerald-400">Presenças</th>
                    <th className="py-3 px-3 text-center text-red-400">Faltas</th>
                    <th className="py-3 px-3 text-center text-amber-400">S/ Justificativa</th>
                    <th className="py-3 px-3 text-center">Faltas Seguidas</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {rankingAnalysis.slice(0, 30).map((item, idx) => {
                    const subCat = getSubCategory(item.athlete.birth_date);

                    return (
                      <tr key={item.athlete.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3 px-3 font-black text-zinc-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                              {item.athlete.photo ? (
                                <img src={item.athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User size={14} className="text-zinc-500" />
                              )}
                            </div>
                            <div>
                              <span className="font-black text-white uppercase block leading-tight">{item.athlete.name}</span>
                              <span className="text-[10px] text-zinc-500">{item.athlete.guardian_name || 'Sem resp.'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-theme-primary">{subCat}</td>
                        <td className="py-3 px-3 text-center font-bold text-zinc-300">{item.totalTrainings}</td>
                        <td className="py-3 px-3 text-center font-black text-emerald-400">{item.presentCount}</td>
                        <td className="py-3 px-3 text-center font-black text-red-400">{item.absentCount}</td>
                        <td className="py-3 px-3 text-center font-black text-amber-400">{item.unjustifiedCount}</td>
                        <td className="py-3 px-3 text-center">
                          {item.currentStreak >= 2 ? (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-black text-[10px] rounded-lg">
                              {item.currentStreak} seguidas
                            </span>
                          ) : (
                            <span className="text-zinc-600 font-bold">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {(item.athlete.guardian_phone || item.athlete.contact) && activeTraining && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(item.athlete, activeTraining, 'parent')}
                              className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-all"
                              title="Cobrar via WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* JUSTIFICATION MODAL                                                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {justifyingRecord && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">Justificar Falta</h3>
                    <p className="text-xs text-zinc-400">{justifyingRecord.athlete.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setJustifyingRecord(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-zinc-400 block mb-1.5">
                    Motivo da Ausência / Justificativa
                  </label>
                  <textarea
                    rows={4}
                    value={justificationText}
                    onChange={(e) => setJustificationText(e.target.value)}
                    placeholder="Ex: Consulta médica, febre, viagem escolar com autorização dos pais..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-2xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-all resize-none"
                  />
                </div>

                {/* Quick Predefined Reasons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Motivos Rápidos:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      'Atestado / Consulta Médica',
                      'Febre / Sintomas Gripais',
                      'Prova / Compromisso Escolar',
                      'Viagem com a Família',
                      'Lesão em Tratamento',
                      'Problema de Transporte'
                    ].map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setJustificationText(reason)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold border border-zinc-800 cursor-pointer"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setJustifyingRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveJustification}
                  disabled={isSavingJustification || !justificationText.trim()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingJustification ? 'Salvando...' : 'Salvar Justificativa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* HIDDEN PRINTABLE TEMPLATE (FOR HIGH QUALITY PDF GENERATION)                */}
      {/* ========================================================================= */}
      <div 
        ref={printableReportRef} 
        className="hidden bg-white text-black p-8 font-sans w-[800px] space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {crestDataUrl ? (
              <img src={crestDataUrl} alt="Escudo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 bg-black text-white font-black text-2xl flex items-center justify-center rounded-2xl">P</div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-black">Piruá Esporte Clube</h1>
              <h2 className="text-sm font-bold text-zinc-700 uppercase">Relatório Oficial de Faltosos no Treino</h2>
              <p className="text-[11px] text-zinc-500 font-mono">Documento emitido pelo Sistema de Frequência</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold block">Data do Treino:</span>
            <span className="font-black text-sm">{activeTraining?.date ? format(parseISO(activeTraining.date), 'dd/MM/yyyy') : 'S/D'}</span>
          </div>
        </div>

        {/* Training Meta Info */}
        <div className="grid grid-cols-4 gap-3 bg-zinc-100 p-4 rounded-xl text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Categoria</span>
            <span className="font-black text-black">{activeTraining?.category || 'Geral'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Modalidade</span>
            <span className="font-black text-black">{activeTraining?.modality || 'Futebol'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Horário</span>
            <span className="font-black text-black">{activeTraining?.start_time} às {activeTraining?.end_time}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total de Faltas</span>
            <span className="font-black text-red-600 text-sm">{filteredAbsentees.length} Atletas</span>
          </div>
        </div>

        {/* Absentees Table */}
        <div>
          <h3 className="text-xs font-black uppercase border-b border-black pb-1 mb-2">Lista de Alunos Ausentes</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-400 text-[10px] uppercase text-zinc-600">
                <th className="py-2">#</th>
                <th className="py-2">Nome do Atleta</th>
                <th className="py-2">SUB</th>
                <th className="py-2">Responsável</th>
                <th className="py-2">Telefone</th>
                <th className="py-2">Status da Falta</th>
                <th className="py-2">Motivo / Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredAbsentees.map((item, idx) => (
                <tr key={item.athlete.id}>
                  <td className="py-2 font-bold">{idx + 1}</td>
                  <td className="py-2 font-black uppercase">{item.athlete.name}</td>
                  <td className="py-2 font-bold">{getSubCategory(item.athlete.birth_date)}</td>
                  <td className="py-2">{item.athlete.guardian_name || 'N/A'}</td>
                  <td className="py-2 font-mono text-[11px]">{item.athlete.guardian_phone || item.athlete.contact || 'S/ Tel'}</td>
                  <td className="py-2 font-bold">
                    {item.isJustified ? 'Justificada' : 'Sem Justificativa'}
                  </td>
                  <td className="py-2 text-zinc-700 italic text-[11px]">
                    {item.justification || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
          <div className="border-t border-black pt-2">
            <span className="font-bold block">Assinatura do Treinador / Professor</span>
            <span className="text-[10px] text-zinc-500">Comissão Técnica Piruá E.C.</span>
          </div>
          <div className="border-t border-black pt-2">
            <span className="font-bold block">Diretoria / Coordenação Esportiva</span>
            <span className="text-[10px] text-zinc-500">Piruá Esporte Clube</span>
          </div>
        </div>
      </div>

    </div>
  );
}
