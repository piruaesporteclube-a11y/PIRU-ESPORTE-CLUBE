import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete, getSubCategory, categories, Training, Event, Attendance as AttendanceRecord } from '../types';
import { QrCode, Search, CheckCircle2, XCircle, AlertCircle, User, Printer, FileText, Filter, FileDown, ChevronLeft, ChevronRight, Calendar, Lock, RotateCcw, X, Clock, History, Trophy, MessageSquare, Send, Smartphone, Sparkles, Settings } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { format, subDays } from 'date-fns';
import { cn, fixHtml2CanvasColors } from '../utils';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import AttendanceHistory from './AttendanceHistory';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Attendance({ athletes: athletesProp, trainingId, eventId, initialDate, role = 'admin', filterCategory = 'Todos' }: { athletes?: Athlete[], trainingId?: string, eventId?: string, initialDate?: string, role?: string, filterCategory?: string }) {
  const isAdmin = role === 'admin' || role === 'professor';
  const { settings } = useTheme();
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [absenceTemplateParent, setAbsenceTemplateParent] = useState(() => {
    return localStorage.getItem('pirua_absence_template_parent') || 
      "Olá, {NOME_RESPONSAVEL}! Nós do Piruá Esporte Clube sentimos a falta de {NOME_ATLETA} no treino de hoje ({DATA_TREINO}). Como a falta não possui justificativa registrada em nossa chamada, pedimos por gentileza que nos mande por aqui para mantermos o boletim atualizado. Agradecemos a colaboração!";
  });

  const [absenceTemplateAthlete, setAbsenceTemplateAthlete] = useState(() => {
    return localStorage.getItem('pirua_absence_template_athlete') || 
      "Fala, {NOME_ATLETA}! Sentimos sua falta no treino hoje ({DATA_TREINO}) da categoria {CATEGORIA}. Lembra de justificar com o treinador do Piruá para não perder frequência e garantir sua vaga de titular. Bora! ⚽⚡";
  });

  const [reactivationTemplateParent, setReactivationTemplateParent] = useState(() => {
    return localStorage.getItem('pirua_reactivation_template_parent') || 
      "Olá, {NOME_RESPONSAVEL}! Percebemos que o(a) {NOME_ATLETA} está ausente dos treinos do Piruá Esporte Clube há {DIAS_AUSENTE} dias (última presença em {ULTIMA_PRESENCA}). Gostaríamos de confirmar se está tudo bem e se há alguma dificuldade ou justificativa para as ausências. A frequência regular é fundamental para manter a vaga e a evolução esportiva. Contamos com vocês! ⚽⚡";
  });

  const [reactivationTemplateAthlete, setReactivationTemplateAthlete] = useState(() => {
    return localStorage.getItem('pirua_reactivation_template_athlete') || 
      "Fala, {NOME_ATLETA}! Tudo bem? Sentimos sua falta nos treinos cara! Já faz {DIAS_AUSENTE} dias que você não aparece (desde {ULTIMA_PRESENCA}). A gente quer você correndo com o time! Tem alguma justificativa com o professor? Lembra que a frequência é o que garante sua vaga de titular e evolução. Dá um retorno pro clube e bora voltar! ⚽⚡";
  });

  const [absenceTarget, setAbsenceTarget] = useState<'parent' | 'athlete' | 'both'>(() => {
    return (localStorage.getItem('pirua_absence_target') as any) || 'parent';
  });

  const [autoSendNextDay, setAutoSendNextDay] = useState(() => {
    return localStorage.getItem('pirua_auto_send_next_day') === 'true';
  });

  const [showAbsenceConfig, setShowAbsenceConfig] = useState(false);
  const [absenceSubTab, setAbsenceSubTab] = useState<'today' | 'longTerm'>('today');
  const [longTermAbsents, setLongTermAbsents] = useState<{ athlete: Athlete, lastPresentDate: string | null, daysAbsent: number }[]>([]);
  const [loadingLongTerm, setLoadingLongTerm] = useState(false);

  // Batch Sending Queue States
  const [batchQueue, setBatchQueue] = useState<{ athlete: Athlete, target: 'parent' | 'athlete', phone: string, message: string }[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [isBatchSending, setIsBatchSending] = useState<boolean>(false);

  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [filterSub, setFilterSub] = useState(filterCategory);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tabFilter, setTabFilter] = useState<'all' | 'present' | 'absent' | 'observation'>('all');
  const [recentScans, setRecentScans] = useState<{ id: string, name: string, time: string, photo?: string }[]>([]);
  const [training, setTraining] = useState<Training | null>(null);
  const [availableTrainings, setAvailableTrainings] = useState<Training[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | 'geral'>(trainingId || 'geral');
  const [event, setEvent] = useState<Event | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [forceUnlocked, setForceUnlocked] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfigPreviewTarget, setShowConfigPreviewTarget] = useState<'parent' | 'athlete'>('parent');
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  const formatAbsenceMessage = (athlete: Athlete, template: string, daysAbsent?: number, lastPresentDate?: string | null) => {
    const parsedDate = new Date(date + 'T12:00:00');
    const today = isNaN(parsedDate.getTime()) ? date : format(parsedDate, 'dd/MM/yyyy');
    
    let activeCategory = 'Todos';
    if (selectedTrainingId !== 'geral') {
      const selTraining = availableTrainings.find(t => t.id === selectedTrainingId);
      if (selTraining) activeCategory = selTraining.category || 'Todos';
    } else {
      activeCategory = getSubCategory(athlete.birth_date);
    }
    
    const formattedLastDate = lastPresentDate ? format(new Date(lastPresentDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Sem registro';

    return template
      .replace(/{NOME_ATLETA}/g, athlete.name || '')
      .replace(/{NOME_RESPONSAVEL}/g, athlete.guardian_name || 'Responsável')
      .replace(/{DATA_TREINO}/g, today)
      .replace(/{CATEGORIA}/g, activeCategory)
      .replace(/{DIAS_AUSENTE}/g, daysAbsent && daysAbsent < 999 ? String(daysAbsent) : 'mais de 15')
      .replace(/{ULTIMA_PRESENCA}/g, formattedLastDate)
      .replace(/{HORARIO_TREINO}/g, training ? `${training.start_time || 'S/H'} às ${training.end_time || 'S/H'}` : 'Horário de Treino');
  };

  const fetchLongTermAbsents = async () => {
    setLoadingLongTerm(true);
    try {
      const todayObj = new Date();
      const fortyFiveDaysAgo = new Date(todayObj.getTime() - 45 * 24 * 60 * 60 * 1000);
      const startDateStr = format(fortyFiveDaysAgo, 'yyyy-MM-dd');
      const endDateStr = format(todayObj, 'yyyy-MM-dd');
      
      const historical = await api.getAttendance(undefined, undefined, undefined, undefined, startDateStr, endDateStr);
      
      const recordMap: Record<string, AttendanceRecord[]> = {};
      historical.forEach(rec => {
        if (!recordMap[rec.athlete_id]) {
          recordMap[rec.athlete_id] = [];
        }
        recordMap[rec.athlete_id].push(rec);
      });
      
      const tempAbsents: { athlete: Athlete, lastPresentDate: string | null, daysAbsent: number }[] = [];
      const fifteenDaysAgoLimit = new Date(todayObj.getTime() - 15 * 24 * 60 * 60 * 1000);
      const fifteenDaysLimitStr = format(fifteenDaysAgoLimit, 'yyyy-MM-dd');

      const currentAthletes = athletesProp || athletes || [];
      currentAthletes.forEach(ath => {
        if (showOnlyActive && ath.status !== 'Ativo') {
          return;
        }

        const recs = recordMap[ath.id] || [];
        
        // Check if they were present in the last 15 days
        const presentInLast15 = recs.some(r => r.status === 'Presente' && r.date >= fifteenDaysLimitStr);
        
        if (!presentInLast15) {
          const presenceRecs = recs
            .filter(r => r.status === 'Presente')
            .sort((a, b) => b.date.localeCompare(a.date));
             
          const lastPresenceDate = presenceRecs.length > 0 ? presenceRecs[0].date : null;
          
          let days = 999;
          if (lastPresenceDate) {
            const lastDateObj = new Date(lastPresenceDate + 'T12:00:00');
            const diffTime = Math.abs(todayObj.getTime() - lastDateObj.getTime());
            days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }
          
          tempAbsents.push({
            athlete: ath,
            lastPresentDate: lastPresenceDate,
            daysAbsent: days
          });
        }
      });
      
      tempAbsents.sort((a, b) => b.daysAbsent - a.daysAbsent);
      setLongTermAbsents(tempAbsents);
    } catch (err) {
      console.error("Error loading long term absents:", err);
    } finally {
      setLoadingLongTerm(false);
    }
  };

  const handleSendIndividualAbsenceAlert = (athlete: Athlete, target: 'parent' | 'athlete') => {
    const isParent = target === 'parent';
    const phone = isParent ? athlete.guardian_phone : athlete.contact;
    
    const isLongTerm = tabFilter === 'absent' && absenceSubTab === 'longTerm';
    const template = isLongTerm
      ? (isParent ? reactivationTemplateParent : reactivationTemplateAthlete)
      : (isParent ? absenceTemplateParent : absenceTemplateAthlete);
      
    const nameLabel = isParent ? `Responsável (${athlete.guardian_name})` : `Atleta (${athlete.name})`;
    
    if (!phone || phone.replace(/\D/g, '').trim() === '') {
      toast.error(`Não foi possível enviar: ${nameLabel} não possui telefone cadastrado!`);
      return;
    }
    
    let days: number | undefined;
    let lastDate: string | undefined;
    if (isLongTerm) {
      const found = longTermAbsents.find(item => item.athlete.id === athlete.id);
      if (found) {
        days = found.daysAbsent;
        lastDate = found.lastPresentDate || undefined;
      }
    }
    
    const textMsg = formatAbsenceMessage(athlete, template, days, lastDate);
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
    
    window.open(url, '_blank');
    
    // Mark as notified in state and firestore
    const records = attendance[athlete.id] || [];
    const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
    const att = records.find(r => 
      (activeTrainingId && r.training_id === activeTrainingId) ||
      (eventId && r.event_id === eventId) ||
      (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
    );

    if (att) {
      const updatedAtt: AttendanceRecord = {
        ...att,
        parent_notified: isParent ? true : (att.parent_notified || false),
        athlete_notified: !isParent ? true : (att.athlete_notified || false)
      };

      const updatedRecords = records.map(r => r.id === att.id ? updatedAtt : r);
      setAttendance(prev => ({
        ...prev,
        [athlete.id]: updatedRecords
      }));

      api.saveAttendance(updatedAtt).catch(err => {
        console.error("Erro ao salvar notificação no banco de dados", err);
      });
    } else {
      let attendanceId = `${athlete.id}_${date}`;
      if (activeTrainingId) attendanceId = `${athlete.id}_training_${activeTrainingId}`;
      if (eventId) attendanceId = `${athlete.id}_event_${eventId}`;

      const newRecord: AttendanceRecord = {
        id: attendanceId,
        athlete_id: athlete.id,
        training_id: activeTrainingId,
        event_id: eventId,
        date,
        status: 'Faltou',
        parent_notified: isParent,
        athlete_notified: !isParent,
        arrival_time: format(new Date(), 'HH:mm')
      };

      setAttendance(prev => ({
        ...prev,
        [athlete.id]: [...records, newRecord]
      }));

      api.saveAttendance(newRecord).catch(err => {
        console.error("Erro ao salvar nova notificação no banco de dados", err);
      });
    }
    
    toast.success(`Alerta gerado para ${nameLabel}! Direcionando para o WhatsApp e salvo no sistema.`);
  };

  const saveAbsenceConfig = () => {
    localStorage.setItem('pirua_absence_template_parent', absenceTemplateParent);
    localStorage.setItem('pirua_absence_template_athlete', absenceTemplateAthlete);
    localStorage.setItem('pirua_absence_target', absenceTarget);
    localStorage.setItem('pirua_auto_send_next_day', String(autoSendNextDay));
    toast.success("Configurações das Notificações de Falta atualizadas com sucesso!");
    setShowAbsenceConfig(false);
  };

  useEffect(() => {
    if (athletes.length > 0 && tabFilter === 'absent' && absenceSubTab === 'longTerm') {
      fetchLongTermAbsents();
    }
  }, [athletes, tabFilter, absenceSubTab, showOnlyActive]);

  useEffect(() => {
    setFilterSub(filterCategory);
  }, [filterCategory]);

  useEffect(() => {
    const fetchDayTrainings = async () => {
      try {
        const allTrainings = await api.getTrainings();
        const dayTrainings = allTrainings.filter(t => t.date === date);
        setAvailableTrainings(dayTrainings);
        
        if (trainingId) {
          setSelectedTrainingId(trainingId);
        } else if (dayTrainings.length > 0 && selectedTrainingId === 'geral') {
          // If there's training today and we are in "geral", maybe we should prompt?
          // For now, let's just keep 'geral' unless specifically selected.
        }
      } catch (err) {
        console.error("Error fetching day trainings:", err);
      }
    };
    fetchDayTrainings();
  }, [date, trainingId]);

  useEffect(() => {
    const checkLock = async () => {
      const now = new Date();
      const limit = new Date(now);
      limit.setDate(now.getDate() - 2);
      const limitString = format(limit, 'yyyy-MM-dd');

      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;

      if (activeTrainingId) {
        try {
          const found = await api.getTraining(activeTrainingId);
          if (found) {
            setTraining(found);
            
            // Calculate global lock (lock if older than 2 days ago, allowing today, yesterday and day before)
            if (found.date < limitString && !isAdmin && !forceUnlocked) {
              setIsLocked(true);
            } else {
              setIsLocked(false);
            }
          }
        } catch (err) {
          console.error("Error fetching training for lock check:", err);
        }
      } else if (eventId) {
        try {
          const found = await api.getEvent(eventId);
          if (found) {
            setEvent(found);
            if (found.end_date < limitString && !isAdmin && !forceUnlocked) {
              setIsLocked(true);
            } else {
              setIsLocked(false);
            }
          }
        } catch (err) {
          console.error("Error fetching event for lock check:", err);
        }
      } else {
        // General attendance: lock if date is older than 2 days ago
        if (date < limitString && !isAdmin && !forceUnlocked) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [trainingId, eventId, date, selectedTrainingId, role, isAdmin, forceUnlocked]);

  useEffect(() => {
    const fetchEventAthletes = async () => {
      if (eventId) {
        try {
          const { athletes: lineup } = await api.getLineup(eventId);
          // Only show athletes in lineup for events if requested or if we want to limit
          // For now, let's keep all athletes available but maybe highlight lineup ones?
          // Actually, common requirement is only to mark attendance for those in lineup.
          if (lineup.length > 0) {
            setAthletes(lineup);
          }
        } catch (err) {
          console.error("Error fetching event lineup:", err);
        }
      }
    };
    if (eventId) fetchEventAthletes();
  }, [eventId]);

  useEffect(() => {
    if (athletesProp) {
      setAthletes(athletesProp);
    } else {
      loadData(true);
    }
  }, [athletesProp]);

  useEffect(() => {
    const unsubscribe = api.subscribeToAttendance((attendanceData) => {
      const attMap: Record<string, AttendanceRecord[]> = {};
      attendanceData.forEach(a => {
        if (!attMap[a.athlete_id]) attMap[a.athlete_id] = [];
        attMap[a.athlete_id].push(a);
      });
      setAttendance(attMap);
      setHasChanges(false);
    }, date, selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId, eventId);

    return () => unsubscribe();
  }, [date, trainingId, eventId, selectedTrainingId]);

  useEffect(() => {
    if (localStorage.getItem('auto_scan') === 'true') {
      setIsScanning(true);
      localStorage.removeItem('auto_scan');
    }
  }, [date, trainingId, eventId, selectedTrainingId]);

  useEffect(() => {
    if (selectedTrainingId !== 'geral') {
      const selTraining = availableTrainings.find(t => t.id === selectedTrainingId);
      if (selTraining && selTraining.category !== 'Todos') {
        setFilterSub(selTraining.category);
      }
    }
  }, [selectedTrainingId, availableTrainings]);

  useEffect(() => {
    const convertToDataUrl = (url: string, callback: (dataUrl: string | null) => void) => {
      if (!url) {
        callback(null);
        return;
      }
      if (url.startsWith('data:')) {
        callback(url);
        return;
      }

      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            callback(dataUrl);
          } else {
            callback(url);
          }
        } catch (e) {
          console.warn('Failed to convert image to data URL', e);
          callback(url);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image with CORS:', url);
        callback(url);
      };
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(settings?.schoolCrest || '', setCrestDataUrl);
  }, [settings?.schoolCrest]);

  const loadData = async (silent = false) => {
    // If we already have athletes from props, don't fetch unless it's a manual refresh
    if (athletesProp && athletesProp.length > 0 && silent) {
      setAthletes(athletesProp);
      return;
    }

    try {
      const data = await api.getAthletes();
      setAthletes(data);
      if (!silent) toast.success("Lista de atletas atualizada!");
    } catch (err) {
      console.error("Erro ao carregar atletas:", err);
    }
  };

  const loadAttendance = async (silent = false) => {
    try {
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
      const attendanceData = await api.getAttendance(date, undefined, activeTrainingId, eventId);
      
      const attMap: Record<string, AttendanceRecord[]> = {};
      attendanceData.forEach(a => {
        if (!attMap[a.athlete_id]) attMap[a.athlete_id] = [];
        attMap[a.athlete_id].push(a);
      });
      setAttendance(attMap);
      setHasChanges(false);
      if (!silent) toast.success("Presenças carregadas!");
    } catch (err) {
      console.error("Erro ao carregar presenças:", err);
      if (!silent) toast.error("Erro ao atualizar presenças.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning) {
      html5QrCode = new Html5Qrcode("reader");
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      const onScanSuccess = (decodedText: string) => {
        if (!isMounted) return;
        const now = Date.now();
        // Prevent scanning the same code multiple times within 3 seconds
        if (decodedText === lastScannedCode.current && (now - lastScanTime.current) < 3000) {
          return;
        }
        
        lastScannedCode.current = decodedText;
        lastScanTime.current = now;
        handleScan(decodedText);
      };

      const onScanFailure = (errorMessage: any) => {
        if (!isMounted) return;
        // Only log actual errors, not "no QR code found" warnings
        if (typeof errorMessage === 'string' && !errorMessage.includes("NotFoundException")) {
          console.warn("Aviso no scanner:", errorMessage);
        }
      };

      const startWithFallback = async () => {
        try {
          if (!isMounted) return;
          // Try back camera first
          await html5QrCode!.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
        } catch (err: any) {
          if (!isMounted) return;
          console.warn("Erro ao iniciar com facingMode: environment, tentando facingMode: user...", err);
          try {
            // Try front camera second
            await html5QrCode!.start({ facingMode: "user" }, config, onScanSuccess, onScanFailure);
          } catch (err2: any) {
            if (!isMounted) return;
            console.warn("Erro ao iniciar com facingMode: user, tentando sem restrições...", err2);
            try {
              // Try any available camera (empty constraints)
              await html5QrCode!.start({} as any, config, onScanSuccess, onScanFailure);
            } catch (err3: any) {
              if (!isMounted) return;
              console.error("Erro ao iniciar scanner em todos os modos:", err3);
              if (err3?.message?.includes("Permission denied")) {
                toast.error("Permissão de câmera negada. Por favor, autorize o acesso nas configurações do navegador.");
              } else if (err3?.name === "NotFoundError" || err3?.message?.includes("Requested device not found")) {
                toast.error("Nenhuma câmera encontrada neste dispositivo.");
              } else {
                toast.error("Não foi possível abrir a câmera. Verifique se ela está sendo usada por outro app.");
              }
              setIsScanning(false);
            }
          }
        }
      };

      startWithFallback();
    }

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(err => {
          console.error("Erro ao parar scanner:", err);
        });
      }
    };
  }, [isScanning]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  };

  const handleScan = async (data: string) => {
    if (isLocked) {
      setScanResult("Chamada finalizada. Não é permitido registrar novas presenças.");
      return;
    }
    console.log("QR Scanned:", data);
    // Expected format: PIRUA-ATHLETE-ID
    // Using a more permissive regex to capture any ID format
    const match = data.match(/PIRUA-ATHLETE-(.+)/);
    
    if (match) {
      const athleteId = match[1].trim();
      console.log("Extracted Athlete ID:", athleteId);
      
      if (athletes.length === 0) {
        setScanResult("Lista de atletas vazia. Recarregando...");
        await loadData(true);
      }

      const athlete = athletes.find(a => a.id === athleteId);
      
      if (!athlete) {
        console.log("Athlete not found in local list. IDs available:", athletes.map(a => a.id));
      }

      if (athlete) {
        if (athlete.status !== 'Ativo') {
          setScanResult(`Atleta ${athlete.name} está INATIVO.`);
          return;
        }

        playBeep();
        
        const scanTime = format(new Date(), 'HH:mm');
        
        // Update local state first
        const records = attendance[athleteId] || [];
        const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
        const currentAtt = records.find(r => 
          (activeTrainingId && r.training_id === activeTrainingId) ||
          (eventId && r.event_id === eventId) ||
          (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
        );

        if (currentAtt?.status !== 'Presente') {
          await markAttendance(athleteId, 'Presente', '', scanTime);
        }
        
        // Check for events today and confirm automatically
        try {
          const events = await api.getEvents();
          const today = format(new Date(), 'yyyy-MM-dd');
          const todayEvents = events.filter(e => e.start_date === today);
          
          for (const event of todayEvents) {
            const { athletes: lineup } = await api.getLineup(event.id);
            if (lineup.some(a => a.id === athleteId)) {
              await api.confirmLineup(event.id, athleteId, 'athlete', 'Confirmado');
            }
          }
        } catch (err) {
          console.error("Erro ao registrar presença em evento:", err);
        }

        setScanResult(`Presença de ${athlete.name} registrada às ${scanTime}!`);
        setRecentScans(prev => [{ 
          id: athlete.id, 
          name: athlete.name, 
          time: scanTime,
          photo: athlete.photo 
        }, ...prev].slice(0, 5));
        setTimeout(() => setScanResult(null), 3000);
      } else {
        setScanResult("Atleta não encontrado ou inativo.");
      }
    } else {
      setScanResult("QR Code inválido.");
    }
  };

  const isAthleteLocked = (athlete: Athlete) => {
    if (isAdmin || forceUnlocked) return false;
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(now.getDate() - 2);
    const limitString = format(limit, 'yyyy-MM-dd');

    if (trainingId && training) {
      if (training.date < limitString) return true;
      if (training.date >= limitString) return false;
    } else if (eventId && event) {
      if (event.end_date < limitString) return true;
      if (event.end_date >= limitString) return false;
    }

    if (date < limitString) return true;
    return false;
  };

  const getAthleteSchedules = (athlete: Athlete) => {
    if (!training || !training.schedules || training.schedules.length === 0) return null;
    const sub = getSubCategory(athlete.birth_date);
    return training.schedules.filter(s => s.categories.includes('Todos') || s.categories.includes(sub));
  };

  const markAllPresent = async () => {
    if (isLocked) return;
    if (!confirm(`Deseja marcar todos os ${filteredAthletes.length} atletas filtrados como PRESENTES Localmente? (Será necessário clicar em "Salvar Chamada" para efetivar no sistema)`)) return;
    
    const now = format(new Date(), 'HH:mm');
    const newAttendance = { ...attendance };
    const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;

    filteredAthletes.forEach(athlete => {
      let attendanceId = `${athlete.id}_${date}`;
      if (activeTrainingId) attendanceId = `${athlete.id}_training_${activeTrainingId}`;
      if (eventId) attendanceId = `${athlete.id}_event_${eventId}`;

      const records = newAttendance[athlete.id] || [];
      const existingIdx = records.findIndex(r => r.id === attendanceId);

      const newRecord: AttendanceRecord = {
        id: attendanceId,
        athlete_id: athlete.id,
        training_id: activeTrainingId,
        event_id: eventId,
        date,
        status: 'Presente',
        justification: '',
        arrival_time: now
      };

      if (existingIdx >= 0) {
        records[existingIdx] = newRecord;
      } else {
        records.push(newRecord);
      }

      // AUTO-SYNC: If marking training as present, also ensure general is marked present
      if (activeTrainingId && !records.some(r => !r.training_id && !r.event_id && r.status === 'Presente')) {
        const generalId = `${athlete.id}_${date}`;
        const existingGeneralIdx = records.findIndex(r => r.id === generalId);
        const generalRecord: AttendanceRecord = {
          id: generalId,
          athlete_id: athlete.id,
          date,
          status: 'Presente',
          justification: 'Sincronizado via Treino',
          arrival_time: now
        };
        if (existingGeneralIdx >= 0) {
          records[existingGeneralIdx] = generalRecord;
        } else {
          records.push(generalRecord);
        }
      }

      // AUTO-SYNC: If marking general as present, also sync to matching day trainings
      if (!activeTrainingId && !eventId && availableTrainings.length > 0) {
        const athleteSub = getSubCategory(athlete.birth_date);
        const matchingTrainings = availableTrainings.filter(t => {
          const categoryMatches = (t.category === 'Todos' || t.category === athleteSub);
          if (!categoryMatches) return false;
          if (t.modality) {
            const trainingMod = t.modality.trim().toLowerCase();
            const athleteMods = (athlete.modality || '').split(',').map(m => m.trim().toLowerCase());
            return athleteMods.some(m => m === trainingMod || trainingMod.includes(m) || m.includes(trainingMod));
          }
          return true;
        });
        
        matchingTrainings.forEach(t => {
          const trainingAttId = `${athlete.id}_training_${t.id}`;
          if (!records.some(r => r.id === trainingAttId && r.status === 'Presente')) {
            const existingTrainingIdx = records.findIndex(r => r.id === trainingAttId);
            const trainingRecord: AttendanceRecord = {
              id: trainingAttId,
              athlete_id: athlete.id,
              training_id: t.id,
              date,
              status: 'Presente',
              justification: 'Sincronizado via Geral',
              arrival_time: now
            };
            if (existingTrainingIdx >= 0) {
              records[existingTrainingIdx] = trainingRecord;
            } else {
              records.push(trainingRecord);
            }
          }
        });
      }

      newAttendance[athlete.id] = [...records];
    });
    setAttendance(newAttendance);
    setHasChanges(true);
    toast.success('Todas as presenças foram marcadas localmente! Não esqueça de salvar.');
  };

  const markAttendance = async (athleteId: string, status: 'Presente' | 'Faltou', justification: string = '', arrival_time?: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete && isAthleteLocked(athlete)) {
      toast.error("Esta chamada para este atleta já foi finalizada.");
      return;
    }
    
    const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
    let attendanceId = `${athleteId}_${date}`;
    if (activeTrainingId) attendanceId = `${athleteId}_training_${activeTrainingId}`;
    if (eventId) attendanceId = `${athleteId}_event_${eventId}`;

    const now = format(new Date(), 'HH:mm');
    const records = attendance[athleteId] || [];
    const existingIdx = records.findIndex(r => r.id === attendanceId);
    
    const finalArrivalTime = arrival_time || (existingIdx >= 0 ? records[existingIdx].arrival_time : now);

    const newRecord: AttendanceRecord = {
      id: attendanceId,
      athlete_id: athleteId,
      training_id: activeTrainingId,
      event_id: eventId,
      date,
      status,
      justification,
      arrival_time: finalArrivalTime
    };

    const newRecords = [...records];
    if (existingIdx >= 0) {
      newRecords[existingIdx] = newRecord;
    } else {
      newRecords.push(newRecord);
    }

    // AUTO-SYNC: If marking training as present, also sync to general
    if (activeTrainingId && status === 'Presente' && !newRecords.some(r => !r.training_id && !r.event_id && r.status === 'Presente')) {
      const generalId = `${athleteId}_${date}`;
      const existingGeneralIdx = newRecords.findIndex(r => r.id === generalId);
      const generalRecord: AttendanceRecord = {
        id: generalId,
        athlete_id: athleteId,
        date,
        status: 'Presente',
        justification: 'Sincronizado via Treino',
        arrival_time: finalArrivalTime
      };
      if (existingGeneralIdx >= 0) {
        newRecords[existingGeneralIdx] = generalRecord;
      } else {
        newRecords.push(generalRecord);
      }
    }

    // AUTO-SYNC: If marking general as present, sync to trainings
    if (!activeTrainingId && !eventId && status === 'Presente' && availableTrainings.length > 0 && athlete) {
      const athleteSub = getSubCategory(athlete.birth_date);
      const matchingTrainings = availableTrainings.filter(t => {
        // First check modality
        if (t.modality) {
          const trainingMod = t.modality.trim().toLowerCase();
          const athleteMods = (athlete.modality || '').split(',').map(m => m.trim().toLowerCase());
          const matchesModality = athleteMods.some(m => m === trainingMod || trainingMod.includes(m) || m.includes(trainingMod));
          if (!matchesModality) return false;
        }

        // Check main category
        if (t.category === 'Todos' || t.category === athleteSub) return true;
        
        // Check categories in schedules if main category is empty or "Todos"
        if (t.schedules && t.schedules.length > 0) {
          return t.schedules.some(s => s.categories.includes('Todos') || s.categories.includes(athleteSub));
        }
        
        return false;
      });
      
      matchingTrainings.forEach(t => {
        const trainingAttId = `${athleteId}_training_${t.id}`;
        if (!newRecords.some(r => r.id === trainingAttId && r.status === 'Presente')) {
          const existingTrainingIdx = newRecords.findIndex(r => r.id === trainingAttId);
          const trainingRecord: AttendanceRecord = {
            id: trainingAttId,
            athlete_id: athleteId,
            training_id: t.id,
            date,
            status: 'Presente',
            justification: 'Sincronizado via Geral',
            arrival_time: finalArrivalTime
          };
          if (existingTrainingIdx >= 0) {
            newRecords[existingTrainingIdx] = trainingRecord;
          } else {
            newRecords.push(trainingRecord);
          }
        }
      });
    }

    setAttendance(prev => ({ 
      ...prev, 
      [athleteId]: newRecords 
    }));
    setHasChanges(true);
  };

  const clearAttendance = async (athleteId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete && isAthleteLocked(athlete)) {
      toast.error("Esta chamada para este atleta já foi finalizada.");
      return;
    }

    const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
    let attendanceId = `${athleteId}_${date}`;
    if (activeTrainingId) attendanceId = `${athleteId}_training_${activeTrainingId}`;
    if (eventId) attendanceId = `${athleteId}_event_${eventId}`;

    try {
      // If we are "saving manually", we should probably only clear local state
      // but the user wants to "desmarcar", so we should remove it from the DB too if it's there
      await api.deleteAttendance(attendanceId);
      
      setAttendance(prev => {
        const newState = { ...prev };
        delete newState[athleteId];
        return newState;
      });
      setHasChanges(true);
      toast.success("Presença removida");
    } catch (err: any) {
      toast.error(`Erro ao remover presença: ${err.message}`);
    }
  };

  const saveCurrentAttendance = async () => {
    const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
    const loadingToast = toast.loading('Salvando chamada...');
    try {
      // Salva TODOS os registros presentes no estado local para esta data
      // Isso garante que presenças sincronizadas (Geral <=> Treinos) sejam persistidas
      const promises = Object.values(attendance).flatMap(records => {
        return records
          .filter(r => r.date === date)
          .map(r => api.saveAttendance(r));
      });

      if (promises.length === 0) {
        toast.info("Nenhuma presença para salvar.", { id: loadingToast });
        return;
      }

      await Promise.all(promises);
      setHasChanges(false);
      toast.success('Chamada salva com sucesso para todos os âmbitos do dia!', { id: loadingToast });
    } catch (err: any) {
      toast.error(`Erro ao salvar chamada: ${err.message}`, { id: loadingToast });
    }
  };

  const toggleScanning = () => {
    if (isScanning) {
      setIsScanning(false);
    } else {
      lastScannedCode.current = null;
      lastScanTime.current = 0;
      setIsScanning(true);
    }
  };

  const activeAthletes = athletes.filter(a => {
    if (!showOnlyActive) return true;
    return a.status === 'Ativo' && a.confirmation !== 'Pendente';
  });
  const filteredAthletes = activeAthletes
    .filter(a => {
      const isSearching = search.trim().length > 0;
      
      const matchesSub = isSearching || filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          (a.nickname && a.nickname.toLowerCase().includes(search.toLowerCase())) ||
                          a.doc.includes(search);
      
      // Filter by selected training category if not "geral" and not explicit trainingId prop
      // Relax this if we are searching for someone specific
      if (selectedTrainingId !== 'geral' && !isSearching) {
        const selTraining = availableTrainings.find(t => t.id === selectedTrainingId);
        if (selTraining) {
           const athleteSub = getSubCategory(a.birth_date);
           const isEligible = selTraining.category === 'Todos' || selTraining.category === athleteSub;
           if (!isEligible) return false;

           if (selTraining.modality) {
             const trainingMod = selTraining.modality.trim().toLowerCase();
             const athleteMods = (a.modality || '').split(',').map(m => m.trim().toLowerCase());
             const matchesModality = athleteMods.some(m => m === trainingMod || trainingMod.includes(m) || m.includes(trainingMod));
             if (!matchesModality) return false;
           }
        }
      }

      // Apply tab filter - also relax if searching to allow finding them quickly
      const records = attendance[a.id] || [];
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
      
      // For "geral" view, consider it present if marked present in ANY training OR general
      let att;
      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        att = records.find(r => r.status === 'Presente') || records[0];
      } else {
        att = records.find(r => 
          (activeTrainingId && r.training_id === activeTrainingId) ||
          (eventId && r.event_id === eventId) ||
          (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
        );
      }

      if (!isSearching) {
        if (tabFilter === 'present' && att?.status !== 'Presente') return false;
        if (tabFilter === 'absent' && att?.status !== 'Faltou') return false;
        if (tabFilter === 'observation' && att) return false;
      }

      return matchesSub && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF do relatório...');
    
    let container: HTMLDivElement | null = null;
    try {
      // Ensure images are loaded before capturing
      const images = reportRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000); // 3s timeout for each image
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));

      // Create a temporary container for capture
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1200px';
      container.style.height = '2000px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      
      // Reset styles for capture to ensure proportionality
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.padding = '40px';
      clone.style.width = '800px';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      clone.style.display = 'block';
      clone.style.boxSizing = 'border-box';
      
      // Force explicit font sizes and dimensions in the clone
      const originalElements = reportRef.current.querySelectorAll('*');
      const cloneElements = clone.querySelectorAll('*');
      for (let i = 0; i < originalElements.length; i++) {
        const orig = originalElements[i] as HTMLElement;
        const cln = cloneElements[i] as HTMLElement;
        const style = window.getComputedStyle(orig);
        
        // Essential layout and typography styles
        const propsToCopy = [
          'fontSize', 'lineHeight', 'fontFamily', 'fontWeight', 'letterSpacing', 
          'textTransform', 'color', 'padding', 'margin', 'width', 'height', 
          'display', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign',
          'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'boxSizing',
          'objectFit', 'position', 'top', 'left', 'right', 'bottom', 'opacity',
          'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
          'backgroundRepeat', 'gap', 'columnGap', 'rowGap'
        ];
        
        propsToCopy.forEach(prop => {
          (cln.style as any)[prop] = (style as any)[prop];
        });
      }

      // Replace images in clone with data URLs if available
      const clonedImages = clone.querySelectorAll('img');
      clonedImages.forEach(img => {
        const src = img.getAttribute('src');
        if (src === settings?.schoolCrest && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      // Remove no-print elements from clone
      const noPrintElements = clone.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      if (finalHeight > (pdfHeight - margin * 2)) {
        finalHeight = pdfHeight - margin * 2;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }

      const x = (pdfWidth - finalWidth) / 2;

      pdf.addImage(imgData, 'PNG', x, margin, finalWidth, finalHeight);
      pdf.save(`relatorio_presenca_${date}.pdf`);
      
      toast.success('PDF gerado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente usar a opção de imprimir.', { id: loadingToast });
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      setIsGeneratingPDF(false);
    }
  };

  const stats = {
    total: filteredAthletes.length,
    present: filteredAthletes.filter(a => {
      const records = attendance[a.id] || [];
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
      
      const generalAtt = records.find(r => !r.training_id && !r.event_id);
      const specificAtt = records.find(r => 
        (activeTrainingId && r.training_id === activeTrainingId) ||
        (eventId && r.event_id === eventId)
      );

      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        return records.some(r => r.status === 'Presente');
      }

      // Crossed info: Present if marked in specific training OR marked in general
      return (specificAtt?.status === 'Presente') || (generalAtt?.status === 'Presente');
    }).length,
    absent: filteredAthletes.filter(a => {
      const records = attendance[a.id] || [];
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;

      const generalAtt = records.find(r => !r.training_id && !r.event_id);
      const specificAtt = records.find(r => 
        (activeTrainingId && r.training_id === activeTrainingId) ||
        (eventId && r.event_id === eventId)
      );

      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        return records.some(r => r.status === 'Faltou') && !records.some(r => r.status === 'Presente');
      }

      // Crossed info: Absent ONLY if marked absent specifically and NOT marked present in general
      if (generalAtt?.status === 'Presente') return false;
      return specificAtt?.status === 'Faltou' || (generalAtt?.status === 'Faltou' && !specificAtt);
    }).length,
    notMarked: filteredAthletes.filter(a => {
      const records = attendance[a.id] || [];
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
      
      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        return records.length === 0;
      }

      const generalAtt = records.find(r => !r.training_id && !r.event_id);
      const specificAtt = records.find(r => 
        (activeTrainingId && r.training_id === activeTrainingId) ||
        (eventId && r.event_id === eventId)
      );
      return !specificAtt && !generalAtt;
    }).length
  };

  // Dynamic dates based on actual current local time (2026-06-06)
  const todayVal = format(new Date(), 'yyyy-MM-dd');
  const d1 = new Date();
  d1.setDate(d1.getDate() - 1);
  const yesterdayVal = format(d1, 'yyyy-MM-dd');
  const d2 = new Date();
  d2.setDate(d2.getDate() - 2);
  const anteontemVal = format(d2, 'yyyy-MM-dd');

  const getDynamicBtnLabel = (offset: number, prefix: string) => {
    try {
      const d = offset === 0 ? new Date() : (offset === 1 ? d1 : d2);
      const weekdayStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const cleanWeekday = weekdayStr.replace('.', '').toUpperCase();
      return `${prefix} (${cleanWeekday} - ${format(d, 'dd/MM')})`;
    } catch (e) {
      return prefix;
    }
  };

  return (
    <div className="space-y-6">
      {showHistory ? (
        <AttendanceHistory 
          athletes={athletes} 
          trainingId={trainingId} 
          eventId={eventId} 
        />
      ) : (
        <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleScanning}
            disabled={isLocked}
            className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl hover:bg-theme-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
            title="Abrir Scanner"
          >
            <QrCode size={28} className="group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-theme-primary rounded-full animate-pulse border-2 border-black" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {isLocked ? 'Consulta de Chamada' : 'Chamada de Presença'}
              {isLocked && (
                <span className="flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-500 text-[10px] uppercase font-black rounded-xl border border-red-500/20 shadow-lg shadow-red-500/5">
                  <Lock size={12} />
                  Finalizada (Somente Leitura)
                </span>
              )}
            </h2>
            <p className="text-zinc-400 text-sm">
              {isLocked 
                ? 'Este treino foi encerrado. A lista está disponível para visualização e impressão.' 
                : 'Registre a presença dos atletas por QR Code ou manualmente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleScanning}
            disabled={isLocked}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-black rounded-2xl transition-all uppercase tracking-tighter shadow-lg shadow-theme-primary/20",
              isLocked 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                : (isScanning ? "bg-red-500 text-white shadow-red-500/20" : "bg-theme-primary text-black hover:scale-105 active:scale-95")
            )}
          >
            {isScanning ? <X size={20} /> : <QrCode size={20} />}
            {isScanning ? 'Fechar Scanner' : 'Escanear QR Code'}
          </button>

          <button 
            onClick={() => loadData()}
            title="Recarregar dados"
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
            onClick={() => setIsReportOpen(true)}
            title="Ver Relatório"
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-colors"
          >
            <FileText size={20} />
          </button>

          <button 
            onClick={() => setShowHistory(!showHistory)}
            title={showHistory ? "Voltar para Chamada" : "Ver Histórico"}
            className={cn(
              "p-3 rounded-2xl transition-colors",
              showHistory ? "bg-theme-primary text-black" : "bg-zinc-800 hover:bg-zinc-700 text-white"
            )}
          >
            {showHistory ? <ChevronLeft size={20} /> : <History size={20} />}
          </button>

          {!isLocked && (
            <div className="flex flex-wrap items-center gap-3">
              {(isAdmin || role === 'professor') && hasChanges && (
                <button 
                  onClick={saveCurrentAttendance}
                  className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-2xl transition-all uppercase tracking-tighter shadow-lg shadow-theme-primary/40 animate-pulse border-2 border-black"
                >
                  <FileDown size={20} />
                  Salvar Chamada
                </button>
              )}
              
              {(selectedTrainingId === 'geral' && !trainingId && !eventId) && (
                <button 
                  onClick={markAllPresent}
                  className="flex items-center gap-2 px-4 py-3 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
                >
                  <CheckCircle2 size={16} />
                  Presença Rápida
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-zinc-500" />
            <div className="relative group">
              <select
                className="px-4 py-3 bg-black border border-theme-primary/20 rounded-2xl text-zinc-400 group-hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-black uppercase text-xs appearance-none pr-10 min-w-[200px] transition-colors"
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                disabled={!!trainingId}
              >
                {!trainingId && <option value="geral">CHAMADA GERAL</option>}
                {availableTrainings.map(t => {
                  const displayCategory = t.category || (t.schedules && t.schedules.length > 0 ? t.schedules[0].categories.join('/') : 'S/ Categoria');
                  const displayTime = t.start_time || (t.schedules && t.schedules.length > 0 ? t.schedules[0].start_time : '--:--');
                  return (
                    <option key={t.id} value={t.id}>
                      TREINO: {displayCategory} ({displayTime})
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-theme-primary/40">
                <Filter size={14} />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 md:mt-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setDate(anteontemVal)}
                className={cn(
                  "px-3 py-2 text-[10px] uppercase font-black tracking-tight rounded-xl transition-all cursor-pointer border shrink-0",
                  date === anteontemVal 
                    ? "bg-theme-primary text-black border-theme-primary font-black shadow-lg shadow-theme-primary/15" 
                    : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800 hover:text-white"
                )}
                title={`Atuar na presença de Anteontem (${format(d2, 'dd/MM')})`}
              >
                📅 {getDynamicBtnLabel(2, 'Anteontem')}
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayVal)}
                className={cn(
                  "px-3 py-2 text-[10px] uppercase font-black tracking-tight rounded-xl transition-all cursor-pointer border shrink-0",
                  date === yesterdayVal 
                    ? "bg-theme-primary text-black border-theme-primary font-black shadow-lg shadow-theme-primary/15" 
                    : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800 hover:text-white"
                )}
                title={`Atuar na presença de Ontem (${format(d1, 'dd/MM')})`}
              >
                📅 {getDynamicBtnLabel(1, 'Ontem')}
              </button>
              <button
                type="button"
                onClick={() => setDate(todayVal)}
                className={cn(
                  "px-3 py-2 text-[10px] uppercase font-black tracking-tight rounded-xl transition-all cursor-pointer border shrink-0",
                  date === todayVal 
                    ? "bg-theme-primary text-black border-theme-primary font-black shadow-lg shadow-theme-primary/15" 
                    : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800 hover:text-white"
                )}
                title={`Atuar na presença de Hoje (${format(new Date(), 'dd/MM')})`}
              >
                📅 {getDynamicBtnLabel(0, 'Hoje')}
              </button>
            </div>
            
            <input 
              type="date" 
              disabled={!!trainingId || !!eventId}
              className={cn(
                "px-3 py-2 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-black uppercase text-xs cursor-pointer",
                (trainingId || eventId) && "opacity-50 cursor-not-allowed"
              )}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLocked && !forceUnlocked && (
        <div id="retroactive-notice-locked" className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 text-amber-500 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-500 uppercase tracking-wider">Chamada Histórica (Apenas Visualização)</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Esta chamada está finalizada devido à data limite. Clique ao lado para liberar edições retroativas e corrigir presenças antigas.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForceUnlocked(true);
              toast.success("Modo de edição habilitado! Você já pode efetuar e salvar correções.");
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/15"
          >
            <Lock size={14} />
            Liberar Edição para Correção
          </button>
        </div>
      )}

      {forceUnlocked && (
        <div id="retroactive-notice-unlocked" className="p-5 bg-green-500/10 border border-green-500/20 rounded-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/15 text-green-500 rounded-xl animate-pulse">
              <CheckCircle2 size={20} className="text-green-500" />
            </div>
            <div>
              <h4 className="text-sm font-black text-green-500 uppercase tracking-wider">Modo de Correção Ativo</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Você liberou a edição de chamadas antigas. Altere as presenças abaixo e depois clique no botão de "Salvar Chamada" para efetivar.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForceUnlocked(false);
              toast.info("A chamada voltou ao estado fechado de histórico.");
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
          >
            <Lock size={14} className="text-zinc-500" />
            Reativar Bloqueio
          </button>
        </div>
      )}

      {isScanning && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center">
            <div id="reader" className="w-full max-w-md overflow-hidden rounded-2xl border-4 border-theme-primary/20 shadow-2xl"></div>
            <div className="mt-6 flex items-center gap-3 text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></div>
              <p className="text-sm font-bold uppercase tracking-widest">Scanner Ativo - Aponte para a Carteirinha</p>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-theme-primary" />
              Escaneados Recentemente
            </h3>
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {recentScans.length > 0 ? (
                  recentScans.map((scan, idx) => (
                    <motion.div 
                      key={`${scan.id}-${scan.time}-${idx}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 bg-black/40 rounded-2xl border border-white/5"
                    >
                      <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 border border-theme-primary/20">
                        {scan.photo && scan.photo.trim() !== "" ? (
                          <img src={scan.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <User size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate uppercase">{scan.name}</p>
                        <p className="text-[10px] text-theme-primary font-black">{scan.time}</p>
                      </div>
                      <div className="p-1.5 bg-green-500/10 text-green-500 rounded-lg">
                        <CheckCircle2 size={14} />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center text-zinc-600">
                    <QrCode size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs uppercase font-bold tracking-widest">Aguardando Leitura...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {scanResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={cn(
              "p-6 rounded-3xl flex items-center justify-center gap-4 shadow-2xl border-2 mb-8",
              scanResult.includes('registrada') 
                ? "bg-green-500/10 text-green-500 border-green-500/30" 
                : "bg-red-500/10 text-red-500 border-red-500/30"
            )}
          >
            <div className={cn(
              "p-3 rounded-2xl",
              scanResult.includes('registrada') ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              {scanResult.includes('registrada') ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">{scanResult}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BANNER DE DIRECIONAMENTO DO TELE-ALERTA DE FALTAS */}
      <div className="bg-zinc-950 border border-red-500/30 rounded-2xl p-4.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl shrink-0">
            <Sparkles size={18} className="animate-pulse text-red-400" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-red-400 uppercase tracking-tight flex items-center gap-2">
              📢 ALERTA AUTOMÁTICO DE FALTAS ATIVO!
            </h4>
            <p className="text-[10.5px] text-zinc-300 font-semibold uppercase leading-normal">
              Existem <span className="text-white font-black">{stats.absent} atletas ausentes</span> sem justificativa registrada. O modelo do texto que é enviado para os Pais ou Alunos e os botões de disparo de WhatsApp ficam na aba vermelha <strong className="text-red-400 uppercase font-black">"FALTAS / AUSENTES"</strong> abaixo!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTabFilter('absent')}
          className="shrink-0 px-4 py-2 bg-red-500 hover:bg-red-400 text-black font-black text-[10px] uppercase rounded-xl tracking-wider transition-all hover:scale-103 active:scale-97 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-red-500/10"
        >
          <Send size={11} />
          <span>Ver e Enviar Alertas ➔</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative md:col-span-2 lg:col-span-1 border-2 border-theme-primary/30 rounded-xl overflow-hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Digite o nome do atleta para buscar..." 
            className="w-full pl-10 pr-4 py-3 bg-black text-white focus:outline-none placeholder:text-zinc-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex bg-black p-1 rounded-xl border border-zinc-800 lg:col-span-2 h-[50px]">
          <button 
            onClick={() => setTabFilter('all')}
            className={cn(
              "flex-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
              tabFilter === 'all' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Todos ({stats.total})
          </button>
          <button 
            onClick={() => setTabFilter('present')}
            className={cn(
              "flex-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
              tabFilter === 'present' ? "bg-green-500 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Presentes ({stats.present})
          </button>
          <button 
            onClick={() => setTabFilter('absent')}
            className={cn(
              "flex-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
              tabFilter === 'absent' ? "bg-red-500 text-white animate-pulse" : "border border-red-500/10 text-red-500 hover:text-red-400"
            )}
          >
            🚫 FALTAS / AUSENTES ({stats.absent})
          </button>
          <button 
            onClick={() => setTabFilter('observation')}
            className={cn(
              "flex-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2",
              tabFilter === 'observation' ? "bg-amber-500 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Observação ({stats.notMarked})
          </button>
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none appearance-none"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value)}
          >
            <option value="Todos">Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyActive(!showOnlyActive)}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all flex items-center justify-center gap-2 h-[50px] cursor-pointer",
            showOnlyActive 
              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700" 
              : "bg-theme-primary/10 border-theme-primary text-theme-primary hover:bg-theme-primary/20"
          )}
        >
          {showOnlyActive ? "Apenas Ativos" : "Todos os Atletas"}
        </button>
      </div>

      {tabFilter === 'absent' && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-3 border-b border-zinc-805">
            {/* Sub-Tabs Toggles */}
            <div className="flex bg-black p-1 rounded-xl border border-zinc-850 w-full sm:max-w-md shrink-0">
              <button 
                type="button"
                onClick={() => setAbsenceSubTab('today')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all cursor-pointer text-center",
                  absenceSubTab === 'today' 
                    ? "bg-red-500 text-black font-black shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Faltas do Dia ({stats.absent})
              </button>
              <button 
                type="button"
                onClick={() => {
                  setAbsenceSubTab('longTerm');
                  fetchLongTermAbsents();
                }}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
                  absenceSubTab === 'longTerm' 
                    ? "bg-amber-500 text-black font-black shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                ⚠️ Sumidos (+15 Dias) ({longTermAbsents.length})
              </button>
            </div>

            <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-center select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>✓ Salvo em Tempo Real</span>
            </div>
          </div>

          <div 
            className="space-y-4 pt-1 pb-2 border-b border-zinc-800/60"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {absenceSubTab === 'today' ? (
                <>
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-black text-green-400 tracking-wider uppercase block">
                      📝 MENSAGEM DOS PAIS (EDITÁVEL):
                    </span>
                    <textarea
                      rows={4}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-theme-primary leading-relaxed font-sans"
                      value={absenceTemplateParent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAbsenceTemplateParent(val);
                        localStorage.setItem('pirua_absence_template_parent', val);
                      }}
                      placeholder="Olá, {NOME_RESPONSAVEL}..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-black text-theme-primary tracking-wider uppercase block">
                      📝 MENSAGEM DO ALUNO (EDITÁVEL):
                    </span>
                    <textarea
                      rows={4}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-theme-primary leading-relaxed font-sans"
                      value={absenceTemplateAthlete}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAbsenceTemplateAthlete(val);
                        localStorage.setItem('pirua_absence_template_athlete', val);
                      }}
                      placeholder="Fala, {NOME_ATLETA}..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-black text-amber-400 tracking-wider uppercase block">
                      📝 MENSAGEM REATIVADORA DOS PAIS (+15 Dias):
                    </span>
                    <textarea
                      rows={4}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-theme-primary leading-relaxed font-sans"
                      value={reactivationTemplateParent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReactivationTemplateParent(val);
                        localStorage.setItem('pirua_reactivation_template_parent', val);
                      }}
                      placeholder="Olá, {NOME_RESPONSAVEL}..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-black text-theme-primary tracking-wider uppercase block">
                      📝 MENSAGEM REATIVADORA ALUNO (+15 Dias):
                    </span>
                    <textarea
                      rows={4}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-theme-primary leading-relaxed font-sans"
                      value={reactivationTemplateAthlete}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReactivationTemplateAthlete(val);
                        localStorage.setItem('pirua_reactivation_template_athlete', val);
                      }}
                      placeholder="Fala, {NOME_ATLETA}..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase font-bold text-zinc-400">
                <span className="text-zinc-500 font-black">Tags Dinâmicas Disponíveis:</span>
                <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{NOME_ATLETA}`}</span>
                <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{NOME_RESPONSAVEL}`}</span>
                <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{CATEGORIA}`}</span>
                {absenceSubTab === 'today' ? (
                  <>
                    <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{DATA_TREINO}`}</span>
                    <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{HORARIO_TREINO}`}</span>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{DIAS_AUSENTE}`}</span>
                    <span className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">{`{ULTIMA_PRESENCA}`}</span>
                  </>
                )}
              </div>
            </div>

            {absenceSubTab === 'today' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 text-left">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="auto_send_next"
                    className="rounded text-theme-primary focus:ring-theme-primary/50 w-4 h-4 bg-black border border-zinc-800 cursor-pointer"
                    checked={autoSendNextDay}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAutoSendNextDay(val);
                      localStorage.setItem('pirua_auto_send_next_day', String(val));
                      toast.success(val ? "Agendamento automático pós-treino ATIVADO!" : "Agendamento automático pós-treino DESATIVADO!");
                    }}
                  />
                  <div className="flex flex-col leading-tight cursor-pointer" onClick={() => {
                    const val = !autoSendNextDay;
                    setAutoSendNextDay(val);
                    localStorage.setItem('pirua_auto_send_next_day', String(val));
                    toast.success(val ? "Agendamento automático pós-treino ATIVADO!" : "Agendamento automático pós-treino DESATIVADO!");
                  }}>
                    <label htmlFor="auto_send_next" className="text-[10px] font-black text-white uppercase cursor-pointer">
                      Agendar Envio pós-Treino
                    </label>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">Dispara no dia seguinte às 09:00</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2 text-left">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-bold text-left">Destinatário Preferencial por Padrão:</span>
                  <div className="flex gap-2">
                    {(['parent', 'athlete', 'both'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setAbsenceTarget(t);
                          localStorage.setItem('pirua_absence_target', t);
                          toast.success(`Destinatário preferencial alterado para: ${t === 'parent' ? 'Apenas Pais' : t === 'athlete' ? 'Apenas Aluno' : 'Ambos'}`);
                        }}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-tight cursor-pointer",
                          absenceTarget === t 
                            ? "bg-theme-primary text-black font-black" 
                            : "bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        {t === 'parent' ? 'Apenas os Pais' : t === 'athlete' ? 'Apenas Aluno' : 'Ambos'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
            <div className="md:col-span-7 bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", (absenceSubTab === 'today' && autoSendNextDay) ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  {absenceSubTab === 'today'
                    ? (autoSendNextDay ? 'Coprodutor de Presença Ativo 📡' : 'Disparo em Lote Semiautomático')
                    : 'Disparos Individuais de Resgate ⚡'}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-300 font-semibold uppercase">
                {absenceSubTab === 'today' 
                  ? (autoSendNextDay 
                    ? `AUTOMAÇÃO ATIVA: O robô de presença do Piruá está ativo! Quando esta chamada for encerrada, o sistema aguará até o dia seguinte às 09:00 e preparará automaticamente os alertas para todos os ${stats.absent} atletas ausentes que faltarem sem justificativa.` 
                    : "DICA: Ative o Agendamento pós-Treino acima para que o robô virtual prepare automaticamente todos os avisos de falta no dia seguinte, ou utilize os botões rápidos de disparo em lote ao lado.")
                  : "PRO-TIP: Use este painel para enviar mensagens amigáveis e reativadoras do WhatsApp individualmente para atletas sumidos há mais de duas semanas. O carinho e a atenção pessoal aumentam o engajamento e evitam evasões!"}
              </p>
              
              {(absenceSubTab === 'today' && autoSendNextDay) && (
                <div className="p-2.5 bg-green-500/10 border border-green-500/15 rounded-lg text-green-400 text-[9px] font-bold uppercase leading-normal">
                  🚀 AGENDADO: Disparo automático programado para amanhã às 09:00 para os alunos sem justificativa.
                </div>
              )}
            </div>

            <div className="md:col-span-5 bg-zinc-950/40 p-4 border border-zinc-850 rounded-xl flex flex-col justify-between gap-3">
              {absenceSubTab === 'today' ? (
                <>
                  <div>
                    <span className="text-[9px] font-black text-zinc-500 tracking-wider uppercase block">
                      Ações Rápidas de Faltas
                    </span>
                    <span className="text-base font-black text-white block mt-0.5 border-b border-zinc-800 pb-1.5 mb-1.5">
                      {stats.absent} Ausente(s) Sem Justificativa
                    </span>
                  </div>

                  {stats.absent > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const unexcusedAthletes = filteredAthletes.filter(a => {
                          const records = attendance[a.id] || [];
                          const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                          const att = records.find(r => 
                            (activeTrainingId && r.training_id === activeTrainingId) ||
                            (eventId && r.event_id === eventId) ||
                            (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                          );
                          return att?.status === 'Faltou' && !att?.justification;
                        });

                        if (unexcusedAthletes.length === 0) {
                          toast.info("Todos os ausentes já possuem justificativa de falta cadastrada!");
                          return;
                        }

                        // Build batch queue tasks
                        const queue: { athlete: Athlete, target: 'parent' | 'athlete', phone: string, message: string }[] = [];
                        
                        unexcusedAthletes.forEach(athlete => {
                          const records = attendance[athlete.id] || [];
                          const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                          const att = records.find(r => 
                            (activeTrainingId && r.training_id === activeTrainingId) ||
                            (eventId && r.event_id === eventId) ||
                            (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                          );

                          const targets: ('parent' | 'athlete')[] = [];
                          if (absenceTarget === 'both') {
                            targets.push('parent', 'athlete');
                          } else {
                            targets.push(absenceTarget);
                          }

                          targets.forEach(t => {
                            const isParent = t === 'parent';
                            const alreadySent = isParent ? att?.parent_notified : att?.athlete_notified;
                            if (!alreadySent) {
                              const phone = isParent ? athlete.guardian_phone : athlete.contact;
                              if (phone && phone.replace(/\D/g, '').trim() !== '') {
                                const message = formatAbsenceMessage(athlete, isParent ? absenceTemplateParent : absenceTemplateAthlete);
                                queue.push({
                                  athlete,
                                  target: t,
                                  phone,
                                  message
                                });
                              }
                            }
                          });
                        });

                        if (queue.length === 0) {
                          toast.info("Todos os alertas em lote selecionados já foram marcados como enviados!");
                          return;
                        }

                        setBatchQueue(queue);
                        setCurrentQueueIndex(0);
                        setIsBatchSending(true);
                        toast.success(`Fila de disparos em lote iniciada: ${queue.length} mensagens pendentes.`);
                      }}
                      className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-black font-black text-[10px] uppercase rounded-xl tracking-wider hover:scale-102 active:scale-98 transition-all shadow-lg shadow-red-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send size={12} />
                      Disparar Alertas Coletivos Agora
                    </button>
                  ) : (
                    <div className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-center font-bold text-[9px] uppercase rounded-xl select-none">
                      Sem Ausências para Notificar Hoje 🎉
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[9px] font-black text-zinc-500 tracking-wider uppercase block">
                      Ações de Resgate Social
                    </span>
                    <span className="text-base font-black text-amber-500 block mt-0.5 border-b border-zinc-800 pb-1.5 mb-1.5">
                      {longTermAbsents.length} Alunos Sumidos há +15 Dias
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold text-center py-2 border border-zinc-800/40 bg-zinc-900/30 rounded-xl">
                    ⚡ Use botões individuais abaixo na tabela para enviar WhatsApp!
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PAINEL DE VISUALIZAÇÃO EM TEMPO REAL DA MENSAGEM */}
          {(() => {
            const isTodayTab = absenceSubTab === 'today';
            
            const previewAthlete = isTodayTab 
              ? (filteredAthletes.find(a => {
                  const records = attendance[a.id] || [];
                  const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                  const att = records.find(r => 
                    (activeTrainingId && r.training_id === activeTrainingId) ||
                    (eventId && r.event_id === eventId) ||
                    (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                  );
                  return att?.status === 'Faltou';
                }) || (filteredAthletes.length > 0 ? filteredAthletes[0] : null) || { 
                  name: 'Davi Lucca do Piruá', 
                  guardian_name: 'Neymar da Silva', 
                  contact: '37991243101', 
                  guardian_phone: '37991243101', 
                  birth_date: '2012-05-15' 
                } as Athlete)
              : (longTermAbsents.length > 0 ? longTermAbsents[0].athlete : {
                  name: 'Davi Lucca do Piruá', 
                  guardian_name: 'Neymar da Silva', 
                  contact: '37991243101', 
                  guardian_phone: '37991243101', 
                  birth_date: '2012-05-15' 
                } as Athlete);

            const daysAbsent = !isTodayTab && longTermAbsents.length > 0 ? longTermAbsents[0].daysAbsent : 18;
            const lastPresentDate = !isTodayTab && longTermAbsents.length > 0 ? longTermAbsents[0].lastPresentDate : '2026-05-12';
            
            const currentTemplate = isTodayTab 
              ? (showConfigPreviewTarget === 'parent' ? absenceTemplateParent : absenceTemplateAthlete)
              : (showConfigPreviewTarget === 'parent' ? reactivationTemplateParent : reactivationTemplateAthlete);

            const previewTextFormatted = formatAbsenceMessage(
              previewAthlete, 
              currentTemplate,
              isTodayTab ? undefined : daysAbsent,
              isTodayTab ? undefined : lastPresentDate
            );

            return (
              <div className="border-t border-zinc-800/80 pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3 bg-theme-primary/5 p-2 rounded-xl border border-theme-primary/10">
                  <MessageSquare size={14} className="text-theme-primary shrink-0" />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider block">
                    👁️ {isTodayTab ? 'VISUALIZAÇÃO DA MENSAGEM DO DIA SEGUINTE:' : 'VISUALIZAÇÃO DO MODELO DE RESGATE:'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfigPreviewTarget('parent')}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-left font-black text-[10px] uppercase transition-all border flex items-center justify-between cursor-pointer",
                        showConfigPreviewTarget === 'parent'
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <span>💬 Mensagem para os Pais</span>
                      {showConfigPreviewTarget === 'parent' && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfigPreviewTarget('athlete')}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-left font-black text-[10px] uppercase transition-all border flex items-center justify-between cursor-pointer",
                        showConfigPreviewTarget === 'athlete'
                          ? "bg-theme-primary/10 border-theme-primary/30 text-theme-primary"
                          : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <span>💬 Mensagem para os Aluno(as)</span>
                      {showConfigPreviewTarget === 'athlete' && <span className="w-1.5 h-1.5 bg-theme-primary rounded-full animate-ping" />}
                    </button>
                    
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 space-y-1.5 text-[9px] uppercase font-bold text-zinc-500 text-left">
                      <span className="text-zinc-400 block font-black">Amostra do Atleta:</span>
                      <div>
                        <span className="text-zinc-500">Atleta Exemplo: </span>
                        <span className="text-white font-mono block text-[9.5px] leading-relaxed break-all font-black">{previewAthlete.name}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Responsável: </span>
                        <span className="text-white font-mono block text-[9.5px] leading-relaxed break-all font-black">{previewAthlete.guardian_name || 'Não cadastrado'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 bg-zinc-950 border border-zinc-850 rounded-xl p-4 flex flex-col justify-between relative min-h-[140px] text-left">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          CONTEÚDO DA MENSAGEM FINAL INSTANTÂNEA:
                        </span>
                        <span className="text-[8px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-bold uppercase">
                          WhatsApp Ativo
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-zinc-200 leading-relaxed font-sans font-semibold whitespace-pre-line text-left bg-black p-3.5 rounded-xl border border-zinc-900 select-all">
                        {previewTextFormatted}
                      </p>
                    </div>

                    <div className="border-t border-zinc-850 pt-2.5 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[8px] uppercase text-zinc-550 leading-normal">
                        💡 Este texto será pré-preenchido e colado diretamente no WhatsApp ao clicar em "Pais" ou "Aluno".
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(previewTextFormatted);
                          toast.success("Mensagem modelo copiada para área de transferência!");
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[9px] uppercase hover:text-white font-black transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                      >
                        Copiar Modelo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="bg-black border border-theme-primary/20 rounded-2xl overflow-hidden shadow-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          {(tabFilter === 'absent' && absenceSubTab === 'longTerm') ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 border-b border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atleta Sumido</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria / Sub</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Última Presença</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Tempo de Ausência</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ações de Resgate Social</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loadingLongTerm ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-550 font-bold uppercase text-[10px] tracking-widest">
                      <span className="inline-block animate-spin mr-2">⏳</span> Buscando histórico de presenças do Piruá...
                    </td>
                  </tr>
                ) : longTermAbsents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      🎉 Muito bem! Nenhum atleta sumido há mais de 15 dias encontrado! Retenção impecável no Piruá!
                    </td>
                  </tr>
                ) : (
                  longTermAbsents.map(({ athlete, daysAbsent, lastPresentDate }) => (
                    <tr key={athlete.id} className="hover:bg-amber-500/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 shrink-0">
                            {athlete.photo && athlete.photo.trim() !== "" ? (
                              <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={16} />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block text-sm leading-tight">
                              {athlete.name}
                              {athlete.nickname && <span className="ml-1 text-zinc-500 font-normal text-xs">({athlete.nickname})</span>}
                            </span>
                            <span className="text-[9.5px] font-black text-theme-primary uppercase">{athlete.guardian_name || 'Sem Responsável Cadastrado'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-400 font-medium">{getSubCategory(athlete.birth_date)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-zinc-300 font-mono">
                          {lastPresentDate ? new Date(lastPresentDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Nunca Registrou Presença'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-red-400 font-black text-xs font-mono">
                          ⚠️ {daysAbsent} dias sumidos
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {athlete.guardian_phone && athlete.guardian_phone.trim() !== '' ? (
                            <button
                              type="button"
                              onClick={() => handleSendIndividualAbsenceAlert(athlete, 'parent')}
                              title={`WhatsApp para Responsável (${athlete.guardian_name})`}
                              className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl transition-all flex items-center gap-1 uppercase font-black text-[9px] tracking-tight shrink-0 cursor-pointer"
                            >
                              <MessageSquare size={12} />
                              <span>Responsáveis</span>
                            </button>
                          ) : (
                            <span className="text-[8px] text-zinc-650 uppercase font-black italic">Sem Tel. Pais</span>
                          )}
                          
                          {athlete.contact && athlete.contact.trim() !== '' ? (
                            <button
                              type="button"
                              onClick={() => handleSendIndividualAbsenceAlert(athlete, 'athlete')}
                              title="WhatsApp direto para o Aluno"
                              className="px-3 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/20 rounded-xl transition-all flex items-center gap-1 uppercase font-black text-[9px] tracking-tight shrink-0 cursor-pointer"
                            >
                              <Smartphone size={12} />
                              <span>Aluno</span>
                            </button>
                          ) : (
                            <span className="text-[8px] text-zinc-650 uppercase font-black italic">Sem Tel. Aluno</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 border-b border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atleta</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Horário</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Presença</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Justificativa</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tele-Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredAthletes.map((athlete) => {
                  const records = attendance[athlete.id] || [];
                  const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                  
                  const generalAtt = records.find(r => !r.training_id && !r.event_id);
                  const specificAtt = records.find(r => 
                    (activeTrainingId && r.training_id === activeTrainingId) ||
                    (eventId && r.event_id === eventId)
                  );

                  let att = specificAtt;
                  let isSyncedFromGeneral = false;

                  if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
                    att = generalAtt;
                  } else if (activeTrainingId || eventId) {
                    // Crossing info: if specifically marked, use it. 
                    // Otherwise, if generally marked present, show it as synced.
                    if (!specificAtt || specificAtt.status !== 'Presente') {
                      if (generalAtt?.status === 'Presente') {
                        att = generalAtt;
                        isSyncedFromGeneral = true;
                      }
                    }
                  }
                  
                  const isPresentInAnyTraining = records.some(r => r.training_id && r.status === 'Presente');
                  const otherTrainingRecords = records.filter(r => r.training_id && r.training_id !== activeTrainingId);

                  return (
                    <tr key={athlete.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                              {athlete.photo && athlete.photo.trim() !== "" ? (
                                <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User size={16} />
                              )}
                            </div>
                            <span className="font-medium text-white">
                              {athlete.name}
                              {athlete.nickname && (
                                <span className="ml-1 text-zinc-500 text-xs font-normal">
                                  ({athlete.nickname})
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {(selectedTrainingId === 'geral' && !trainingId) && (
                            <div className="flex items-center gap-1">
                              {otherTrainingRecords.length > 0 && (
                                <div className="flex -space-x-1">
                                  {otherTrainingRecords.map((r, i) => (
                                    <div 
                                      key={i} 
                                      className="w-4 h-4 rounded-full bg-theme-primary/20 border border-theme-primary/40 flex items-center justify-center"
                                      title={`Presente no treino: ${availableTrainings.find(t => t.id === r.training_id)?.category || 'Treino'}`}
                                    >
                                      <Trophy size={8} className="text-theme-primary" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-zinc-500">{getSubCategory(athlete.birth_date)}</span>
                          {getAthleteSchedules(athlete)?.map((s, i) => s.notes && (
                            <div key={i} className="flex items-center gap-1 opacity-60">
                              <FileText size={8} className="text-theme-primary" />
                              <span className="text-[8px] text-zinc-500 italic max-w-[120px] truncate" title={s.notes}>{s.notes}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {att ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Registro</span>
                              <div className={cn(
                                "flex items-center gap-1.5 border px-3 py-1.5 rounded-xl",
                                att.status === 'Presente' ? "bg-theme-primary/10 border-theme-primary/20 text-theme-primary" : "bg-red-500/10 border-red-500/20 text-red-500"
                              )}>
                                <Clock size={12} />
                                <span className="text-xs font-black">
                                  {att.arrival_time || '--:--'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center opacity-30">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Registro</span>
                              <span className="text-xs font-black text-zinc-700">--:--</span>
                            </div>
                          )}
                          {getAthleteSchedules(athlete) && (
                            <div className="flex flex-col gap-0.5 mt-2">
                              <span className="text-[8px] text-zinc-650 font-black uppercase tracking-tighter">Horário Previsto</span>
                              {getAthleteSchedules(athlete)?.map((s, i) => (
                                <span key={i} className="text-[8px] text-zinc-500 font-bold uppercase leading-none bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                  {s.start_time}-{s.end_time}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => att?.status === 'Presente' ? clearAttendance(athlete.id) : markAttendance(athlete.id, 'Presente')}
                            disabled={isAthleteLocked(athlete)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all",
                              (att?.status === 'Presente' || isSyncedFromGeneral || (selectedTrainingId === 'geral' && isPresentInAnyTraining)) ? "bg-green-500 text-black font-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700",
                              isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <CheckCircle2 size={18} />
                            <span className="text-[10px] uppercase font-black">
                              {isSyncedFromGeneral ? 'Presença Geral' : att?.status === 'Presente' ? 'Presente' : (selectedTrainingId === 'geral' && isPresentInAnyTraining) ? 'Pres. Treino' : 'Presente'}
                            </span>
                          </button>
                          <button 
                            onClick={() => att?.status === 'Faltou' ? clearAttendance(athlete.id) : markAttendance(athlete.id, 'Faltou')}
                            disabled={isAthleteLocked(athlete)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all",
                              att?.status === 'Faltou' ? "bg-red-500 text-black font-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700",
                              isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <XCircle size={18} />
                            <span className="text-[10px] uppercase font-black">Faltou</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {att?.status === 'Faltou' && (
                          <input 
                            type="text" 
                            disabled={isAthleteLocked(athlete)}
                            placeholder="Justificar falta..."
                            className={cn(
                              "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-theme-primary",
                              isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                            )}
                            value={att.justification || ''}
                            onChange={(e) => markAttendance(athlete.id, 'Faltou', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {att?.status === 'Faltou' && (
                          <div className="flex items-center gap-1.5 justify-start text-left">
                            {athlete.guardian_phone && athlete.guardian_phone.trim() !== '' ? (
                              <button
                                type="button"
                                onClick={() => handleSendIndividualAbsenceAlert(athlete, 'parent')}
                                title={`Notificar Responsável (${athlete.guardian_name}) via WhatsApp`}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 uppercase font-black text-[9px] tracking-tight shrink-0 cursor-pointer animate-fade-in",
                                  att?.parent_notified
                                    ? "bg-green-500 text-black border border-green-500 hover:opacity-95"
                                    : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
                                )}
                              >
                                {att?.parent_notified ? <CheckCircle2 size={12} className="stroke-[3.5]" /> : <MessageSquare size={12} />}
                                <span>Responsáveis{att?.parent_notified ? ' ✓' : ''}</span>
                              </button>
                            ) : (
                              <span className="text-[8px] text-zinc-650 uppercase font-bold italic">Sem Tel. Pais</span>
                            )}
                            
                            {athlete.contact && athlete.contact.trim() !== '' ? (
                              <button
                                type="button"
                                onClick={() => handleSendIndividualAbsenceAlert(athlete, 'athlete')}
                                title="Notificar Atleta diretamente via WhatsApp"
                                className={cn(
                                  "px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 uppercase font-black text-[9px] tracking-tight shrink-0 cursor-pointer animate-fade-in",
                                  att?.athlete_notified
                                    ? "bg-theme-primary text-black border border-theme-primary hover:opacity-95"
                                    : "bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/20"
                                )}
                              >
                                {att?.athlete_notified ? <CheckCircle2 size={12} className="stroke-[3.5]" /> : <Smartphone size={12} />}
                                <span>Aluno{att?.athlete_notified ? ' ✓' : ''}</span>
                              </button>
                            ) : (
                              <span className="text-[8px] text-zinc-650 uppercase font-bold italic">Sem Tel. Aluno</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="md:hidden divide-y divide-zinc-800">
          {(tabFilter === 'absent' && absenceSubTab === 'longTerm') ? (
            loadingLongTerm ? (
              <div className="py-12 text-center text-zinc-550 font-bold uppercase text-[10px] tracking-widest leading-none">
                <span className="inline-block animate-spin mr-2">⏳</span> Buscando histórico de presenças do Piruá...
              </div>
            ) : longTermAbsents.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                🎉 Muito bem! Nenhum atleta sumido há mais de 15 dias encontrado!
              </div>
            ) : (
              longTermAbsents.map(({ athlete, daysAbsent, lastPresentDate }) => (
                <div key={athlete.id} className="p-4 space-y-3 bg-amber-500/2 hover:bg-amber-500/5 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 shrink-0">
                        {athlete.photo && athlete.photo.trim() !== "" ? (
                          <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-white text-sm block">
                          {athlete.name}
                          {athlete.nickname && <span className="text-zinc-500 text-[10px] font-normal">({athlete.nickname})</span>}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase">{getSubCategory(athlete.birth_date)}</span>
                      </div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl text-red-500 font-black text-[10px] font-mono shrink-0">
                      ⚠️ {daysAbsent} dias
                    </div>
                  </div>

                  <div className="py-1 px-2 border border-zinc-850 bg-black/40 rounded-xl flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 font-bold uppercase">Última Presença:</span>
                    <span className="text-zinc-200 font-mono font-black">
                      {lastPresentDate ? new Date(lastPresentDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Nunca Registrou'}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-xl space-y-1.5">
                    <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-wider block text-left">
                      Disparar Mensagem Reativadora:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {athlete.guardian_phone && athlete.guardian_phone.trim() !== '' ? (
                        <button
                          type="button"
                          onClick={() => handleSendIndividualAbsenceAlert(athlete, 'parent')}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-404 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span>Pais</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-[8px] text-zinc-600 font-bold uppercase italic select-none">
                          Sem Pais
                        </div>
                      )}

                      {athlete.contact && athlete.contact.trim() !== '' ? (
                        <button
                          type="button"
                          onClick={() => handleSendIndividualAbsenceAlert(athlete, 'athlete')}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-primary/20 text-theme-primary rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                        >
                          <Smartphone size={12} />
                          <span>Aluno</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-[8px] text-zinc-600 font-bold uppercase italic select-none">
                          Sem Aluno
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredAthletes.map((athlete) => {
              const records = attendance[athlete.id] || [];
              const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
              
              const generalAtt = records.find(r => !r.training_id && !r.event_id);
              const specificAtt = records.find(r => 
                (activeTrainingId && r.training_id === activeTrainingId) ||
                (eventId && r.event_id === eventId)
              );

              let att = specificAtt;
              let isSyncedFromGeneral = false;

              if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
                att = generalAtt;
              } else if (activeTrainingId || eventId) {
                if (!specificAtt || specificAtt.status !== 'Presente') {
                  if (generalAtt?.status === 'Presente') {
                    att = generalAtt;
                    isSyncedFromGeneral = true;
                  }
                }
              }
              
              const isPresentInAnyTraining = records.some(r => r.training_id && r.status === 'Presente');
              const otherTrainingRecords = records.filter(r => r.training_id && r.training_id !== activeTrainingId);

              return (
                <div key={athlete.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                        {athlete.photo && athlete.photo.trim() !== "" ? (
                          <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {athlete.name}
                          {athlete.nickname && (
                            <span className="text-zinc-500 text-[10px] font-normal">
                              ({athlete.nickname})
                            </span>
                          )}
                          {(selectedTrainingId === 'geral' && !trainingId) && otherTrainingRecords.length > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-theme-primary/10 rounded-full border border-theme-primary/20">
                               <Trophy size={8} className="text-theme-primary" />
                               <span className="text-[8px] font-black text-theme-primary">{otherTrainingRecords.length}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase">{getSubCategory(athlete.birth_date)}</div>
                        {getAthleteSchedules(athlete) && (
                          <div className="space-y-1 mt-2">
                            <div className="flex flex-wrap gap-1">
                              {getAthleteSchedules(athlete)?.map((s, i) => (
                                <span key={i} className="text-[8px] bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded border border-zinc-700 font-bold uppercase">
                                  {s.start_time}-{s.end_time}
                                </span>
                              ))}
                            </div>
                            {getAthleteSchedules(athlete)?.map((s, i) => s.notes && (
                              <div key={i} className="bg-theme-primary/5 p-2 rounded-lg border border-theme-primary/10">
                                <p className="text-[9px] text-zinc-400 leading-tight italic">
                                  <span className="font-black text-theme-primary not-italic mr-1 uppercase text-[7px]">Atividade:</span>
                                  {s.notes}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {att && (
                          <div className={cn(
                            "flex items-center gap-2 mt-2 border p-2 rounded-xl w-fit",
                            att.status === 'Presente' ? "bg-theme-primary/5 border-theme-primary/10 text-theme-primary" : "bg-red-500/5 border-red-500/10 text-red-500"
                          )}>
                            <Clock size={12} />
                            <span className="text-[10px] font-black uppercase"> 
                              Registro às {att.arrival_time || '--:--'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => att?.status === 'Presente' ? clearAttendance(athlete.id) : markAttendance(athlete.id, 'Presente')}
                        disabled={isAthleteLocked(athlete)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all",
                          (att?.status === 'Presente' || isSyncedFromGeneral || (selectedTrainingId === 'geral' && isPresentInAnyTraining)) ? "bg-green-500 text-black font-black" : "bg-zinc-800 text-zinc-500",
                          isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <CheckCircle2 size={18} />
                        <span className="text-[10px] uppercase font-black">
                          {isSyncedFromGeneral ? 'Presença Geral' : att?.status === 'Presente' ? 'Presente' : (selectedTrainingId === 'geral' && isPresentInAnyTraining) ? 'Pres. Treino' : 'Presente'}
                        </span>
                      </button>
                      <button 
                        onClick={() => att?.status === 'Faltou' ? clearAttendance(athlete.id) : markAttendance(athlete.id, 'Faltou')}
                        disabled={isAthleteLocked(athlete)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all",
                          att?.status === 'Faltou' ? "bg-red-500 text-black font-black" : "bg-zinc-800 text-zinc-500",
                          isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <XCircle size={18} />
                        <span className="text-[10px] uppercase font-black">Faltou</span>
                      </button>
                    </div>
                  </div>

                  {att?.status === 'Faltou' && (
                    <div className="pt-1 space-y-2.5">
                      <input 
                        type="text" 
                        disabled={isAthleteLocked(athlete)}
                        placeholder="Justificar falta..."
                        className={cn(
                          "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-theme-primary",
                          isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                        )}
                        value={att.justification || ''}
                        onChange={(e) => markAttendance(athlete.id, 'Faltou', e.target.value)}
                      />
                      
                      <div className="bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-xl space-y-1.5">
                        <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-wider block text-left">
                          Tele-Alerta de Falta (WhatsApp):
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {athlete.guardian_phone && athlete.guardian_phone.trim() !== '' ? (
                            <button
                              type="button"
                              onClick={() => handleSendIndividualAbsenceAlert(athlete, 'parent')}
                              className={cn(
                                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer",
                                att?.parent_notified
                                  ? "bg-green-500 text-black border border-green-500"
                                  : "bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400"
                              )}
                            >
                              {att?.parent_notified ? <CheckCircle2 size={12} className="stroke-[3.5]" /> : <MessageSquare size={12} />}
                              <span>Pais{att?.parent_notified ? ' ✓' : ''}</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-[8px] text-zinc-650 font-bold uppercase italic select-none">
                              Sem Tel. Pais
                            </div>
                          )}

                          {athlete.contact && athlete.contact.trim() !== '' ? (
                            <button
                              type="button"
                              onClick={() => handleSendIndividualAbsenceAlert(athlete, 'athlete')}
                              className={cn(
                                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer",
                                att?.athlete_notified
                                  ? "bg-theme-primary text-black border border-theme-primary"
                                  : "bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-primary/20 text-theme-primary"
                              )}
                            >
                              {att?.athlete_notified ? <CheckCircle2 size={12} className="stroke-[3.5]" /> : <Smartphone size={12} />}
                              <span>Aluno{att?.athlete_notified ? ' ✓' : ''}</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-[8px] text-zinc-650 font-bold uppercase italic select-none">
                              Sem Tel. Aluno
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {filteredAthletes.length === 0 && (
          <div className="px-6 py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-4">
            <p className="text-sm font-semibold max-w-md">
              Nenhum atleta ativo e confirmado foi encontrado para esta chamada.
            </p>
            {showOnlyActive && athletes.length > 0 && (
              <div className="max-w-md p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-4 shadow-xl">
                 <p className="text-xs text-zinc-400 leading-relaxed uppercase tracking-wide font-medium">
                   Existem {athletes.length} atleta(s) cadastrados no total, mas estão atualmente desativados ou com matrícula pendente por padrão.
                 </p>
                 <button
                   type="button"
                   onClick={() => setShowOnlyActive(false)}
                   className="w-full py-3 bg-theme-primary text-black rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-theme-primary/10"
                 >
                   Visualizar todos os cadastrados nesta lista
                 </button>
              </div>
            )}
            {athletes.length === 0 && (
              <p className="text-xs text-zinc-600 uppercase tracking-widest">
                Importe ou cadastre atletas no menu "Atletas" para começar.
              </p>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-black w-full max-w-4xl rounded-3xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 no-print">
              <div>
                <h2 className="text-xl font-bold uppercase">Relatório de Chamada</h2>
                <p className="text-xs text-zinc-500">Data: {format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')} | Categoria: {filterSub}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black rounded-xl hover:opacity-90 transition-all font-bold disabled:opacity-50"
                >
                  <FileDown size={18} />
                  {isGeneratingPDF ? 'Gerando...' : 'Gerar PDF'}
                </button>
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:opacity-90 transition-all font-bold"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button 
                  onClick={() => setIsReportOpen(false)} 
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-xl transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible" ref={reportRef}>
              <div className="space-y-6 print:space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                  <div className="flex items-center gap-4">
                    {settings?.schoolCrest && settings.schoolCrest.trim() !== "" ? (
                      <img src={settings.schoolCrest} alt="Crest" className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />
                    ) : null}
                    <div>
                      <h1 className="text-2xl font-black uppercase tracking-tighter">Piruá Esporte Clube</h1>
                      <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">Relatório Oficial de Frequência</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Data de Referência</p>
                    <p className="text-xl font-black">{format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 no-print">
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Atletas</p>
                    <p className="text-xl font-black">{stats.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase">Presenças</p>
                    <p className="text-xl font-black text-green-700">{stats.present}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase">Faltas</p>
                    <p className="text-xl font-black text-red-700">{stats.absent}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Não Marcados</p>
                    <p className="text-xl font-black">{stats.notMarked}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase mb-2 border-b border-black pb-1">Lista de Presença - {filterSub}</h3>
                  <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                      <tr className="bg-zinc-100">
                        <th className="border border-black p-2 text-left w-10">Nº</th>
                        <th className="border border-black p-2 text-left">Nome do Atleta</th>
                        <th className="border border-black p-2 text-center w-16">Sexo</th>
                        <th className="border border-black p-2 text-left w-32">Modalidade</th>
                        <th className="border border-black p-2 text-center w-16">Horário</th>
                        <th className="border border-black p-2 text-center w-20">Status</th>
                        <th className="border border-black p-2 text-left">Justificativa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAthletes.map((athlete, index) => {
                        const records = attendance[athlete.id] || [];
                        const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                        const att = records.find(r => 
                          (activeTrainingId && r.training_id === activeTrainingId) ||
                          (eventId && r.event_id === eventId) ||
                          (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                        );
                        return (
                          <tr key={athlete.id} className={cn(
                            att?.status === 'Faltou' ? "bg-red-50/30" : ""
                          )}>
                            <td className="border border-black p-2 text-center">{index + 1}</td>
                            <td className="border border-black p-2 font-bold uppercase">{athlete.name}</td>
                            <td className="border border-black p-2 text-center uppercase text-[10px]">{athlete.gender?.charAt(0) || '-'}</td>
                            <td className="border border-black p-2 uppercase text-[9px] leading-tight">{athlete.modality || '-'}</td>
                            <td className="border border-black p-2 text-center font-mono text-[10px]">
                              {att?.status === 'Presente' ? (att.arrival_time || '--:--') : '--:--'}
                            </td>
                            <td className={cn(
                              "border border-black p-2 text-center font-black",
                              att?.status === 'Presente' ? "text-green-700" : att?.status === 'Faltou' ? "text-red-700" : "text-zinc-400"
                            )}>
                              {att?.status || '---'}
                            </td>
                            <td className="border border-black p-2 italic text-zinc-600">
                              {att?.justification || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-12 pt-8">
                  <div className="text-center">
                    <div className="border-t border-black pt-2 font-bold uppercase text-[10px]">Assinatura do Professor Responsável</div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-black pt-2 font-bold uppercase text-[10px]">Data e Horário da Emissão</div>
                    <p className="text-[10px] mt-1">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
       )}

      {/* WIZARD DE DISPARO DE MENSAGENS EM LOTE */}
      {isBatchSending && batchQueue.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl shadow-red-500/5 animate-scale-up text-left">
            
            {/* Header */}
            <div className="bg-zinc-900/80 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Disparo Automático de Falta em Lote
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mt-0.5">
                    Processador de Alertas do Piruá
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsBatchSending(false);
                  setBatchQueue([]);
                }}
                className="p-1.5 bg-zinc-805 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-zinc-900 border-b border-zinc-850 px-6 py-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400 mb-1.5">
                <span>Progresso da Fila</span>
                <span className="font-mono text-white text-xs">
                  {currentQueueIndex + 1} de {batchQueue.length} ({Math.round(((currentQueueIndex) / batchQueue.length) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-red-500 h-full transition-all duration-300" 
                  style={{ width: `${((currentQueueIndex) / batchQueue.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Body Info */}
            {(() => {
              const currentTask = batchQueue[currentQueueIndex];
              if (!currentTask) return null;
              const { athlete, target, phone, message } = currentTask;
              const isParent = target === 'parent';
              
              return (
                <div className="p-6 space-y-4">
                  {/* Athlete Card */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 shrink-0 border border-zinc-800">
                      {athlete.photo && athlete.photo.trim() !== "" ? (
                        <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white leading-tight uppercase">
                        {athlete.name}
                        {athlete.nickname && <span className="ml-1 text-zinc-500 text-xs font-normal">({athlete.nickname})</span>}
                      </h4>
                      <p className="text-[10px] font-black text-theme-primary uppercase mt-0.5 tracking-wide">
                        {isParent ? `Enviar para Responsável: ${athlete.guardian_name || 'Pais'}` : 'Enviar para o Aluno'}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-400 font-mono mt-1">
                        📞 Telefone: {phone}
                      </p>
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-bold">
                      Falta - Pré-visualização da Mensagem:
                    </span>
                    <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-850 text-xs text-zinc-300 font-medium font-sans whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {message}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Skip
                        if (currentQueueIndex + 1 < batchQueue.length) {
                          setCurrentQueueIndex(prev => prev + 1);
                        } else {
                          toast.success("Fila de disparos concluída!");
                          setIsBatchSending(false);
                          setBatchQueue([]);
                        }
                      }}
                      className="py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-black text-[10px] uppercase rounded-xl tracking-wider transition-all cursor-pointer text-center"
                    >
                      Pular Atleta
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        // Mark as sent without opening WhatsApp
                        const records = attendance[athlete.id] || [];
                        const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                        const att = records.find(r => 
                          (activeTrainingId && r.training_id === activeTrainingId) ||
                          (eventId && r.event_id === eventId) ||
                          (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                        );

                        if (att) {
                          const updatedAtt: AttendanceRecord = {
                            ...att,
                            parent_notified: isParent ? true : (att.parent_notified || false),
                            athlete_notified: !isParent ? true : (att.athlete_notified || false)
                          };
                          
                          const updatedRecords = records.map(r => r.id === att.id ? updatedAtt : r);
                          setAttendance(prev => ({ ...prev, [athlete.id]: updatedRecords }));
                          await api.saveAttendance(updatedAtt);
                        } else {
                          let attendanceId = `${athlete.id}_${date}`;
                          if (activeTrainingId) attendanceId = `${athlete.id}_training_${activeTrainingId}`;
                          if (eventId) attendanceId = `${athlete.id}_event_${eventId}`;

                          const newRecord: AttendanceRecord = {
                            id: attendanceId,
                            athlete_id: athlete.id,
                            training_id: activeTrainingId,
                            event_id: eventId,
                            date,
                            status: 'Faltou',
                            parent_notified: isParent,
                            athlete_notified: !isParent,
                            arrival_time: format(new Date(), 'HH:mm')
                          };

                          setAttendance(prev => ({ ...prev, [athlete.id]: [...records, newRecord] }));
                          await api.saveAttendance(newRecord);
                        }

                        toast.success("Marcado como enviado!");

                        if (currentQueueIndex + 1 < batchQueue.length) {
                          setCurrentQueueIndex(prev => prev + 1);
                        } else {
                          toast.success("Fila de disparos concluída!");
                          setIsBatchSending(false);
                          setBatchQueue([]);
                        }
                      }}
                      className="py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-black text-[10px] uppercase rounded-xl tracking-wider transition-all cursor-pointer text-center border border-zinc-750"
                    >
                      ✓ Confirmar sem Enviar
                    </button>
                  </div>

                  {/* Main Send and Next Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      const cleanPhone = phone.replace(/\D/g, '');
                      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');

                      // Mark as sent in state & database
                      const records = attendance[athlete.id] || [];
                      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                      const att = records.find(r => 
                        (activeTrainingId && r.training_id === activeTrainingId) ||
                        (eventId && r.event_id === eventId) ||
                        (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                      );

                      if (att) {
                        const updatedAtt: AttendanceRecord = {
                          ...att,
                          parent_notified: isParent ? true : (att.parent_notified || false),
                          athlete_notified: !isParent ? true : (att.athlete_notified || false)
                        };
                        
                        const updatedRecords = records.map(r => r.id === att.id ? updatedAtt : r);
                        setAttendance(prev => ({ ...prev, [athlete.id]: updatedRecords }));
                        await api.saveAttendance(updatedAtt).catch(err => {
                          console.error("Erro ao salvar no banco", err);
                        });
                      } else {
                        let attendanceId = `${athlete.id}_${date}`;
                        if (activeTrainingId) attendanceId = `${athlete.id}_training_${activeTrainingId}`;
                        if (eventId) attendanceId = `${athlete.id}_event_${eventId}`;

                        const newRecord: AttendanceRecord = {
                          id: attendanceId,
                          athlete_id: athlete.id,
                          training_id: activeTrainingId,
                          event_id: eventId,
                          date,
                          status: 'Faltou',
                          parent_notified: isParent,
                          athlete_notified: !isParent,
                          arrival_time: format(new Date(), 'HH:mm')
                        };

                        setAttendance(prev => ({ ...prev, [athlete.id]: [...records, newRecord] }));
                        await api.saveAttendance(newRecord).catch(err => {
                          console.error("Erro ao salvar no banco", err);
                        });
                      }

                      toast.success(`Alerta enviado para ${athlete.name}!`);

                      if (currentQueueIndex + 1 < batchQueue.length) {
                        setCurrentQueueIndex(prev => prev + 1);
                      } else {
                        toast.success("Fila de disparos concluída!");
                        setIsBatchSending(false);
                        setBatchQueue([]);
                      }
                    }}
                    className="w-full py-3.5 bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase rounded-xl tracking-widest hover:scale-102 active:scale-98 transition-all shadow-lg shadow-green-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={14} />
                    Enviar WhatsApp e Próximo Aluno
                  </button>
                </div>
              );
            })()}

          </div>
        </div>
      )}
    </div>
  );
}
