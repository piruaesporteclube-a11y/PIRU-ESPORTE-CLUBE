import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete, getSubCategory, categories, Training, Event, Attendance as AttendanceRecord } from '../types';
import { QrCode, Search, CheckCircle2, XCircle, AlertCircle, User, Printer, FileText, Filter, FileDown, ChevronLeft, ChevronRight, Calendar, Lock, RotateCcw, X, Clock, History, Trophy } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { format } from 'date-fns';
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
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [filterSub, setFilterSub] = useState(filterCategory);

  useEffect(() => {
    setFilterSub(filterCategory);
  }, [filterCategory]);
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
  const [hasChanges, setHasChanges] = useState(false);
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

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
      const todayString = format(now, 'yyyy-MM-dd');
      const currentTimeStr = format(now, 'HH:mm');

      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;

      if (activeTrainingId) {
        try {
          const found = await api.getTraining(activeTrainingId);
          if (found) {
            setTraining(found);
            
            // Calculate global lock
            if (found.date < todayString && !isAdmin) {
              setIsLocked(true);
            } else if (found.date === todayString && !isAdmin) {
              // If there are schedules, find the latest end time
              if (found.schedules && found.schedules.length > 0) {
                const latestEnd = found.schedules.reduce((latest, s) => s.end_time > latest ? s.end_time : latest, '00:00');
                setIsLocked(latestEnd < currentTimeStr);
              } else {
                setIsLocked((found.end_time || '00:00') < currentTimeStr);
              }
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
            if ((found.end_date < todayString && !isAdmin)) {
              setIsLocked(true);
            } else if (found.end_date === todayString && (found.end_time || '00:00') < currentTimeStr && !isAdmin) {
              setIsLocked(true);
            } else {
              setIsLocked(false);
            }
          }
        } catch (err) {
          console.error("Error fetching event for lock check:", err);
        }
      } else {
        // General attendance: lock if date is in the past
        if (date < todayString && !isAdmin) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [trainingId, eventId, date, selectedTrainingId]);

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
    if (isAdmin) return false;
    const now = new Date();
    const todayString = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    if (trainingId && training) {
      if (training.date < todayString) return true;
      if (training.date > todayString) return false;
      
      if (training.date === todayString) {
        if (training.schedules && training.schedules.length > 0) {
          const sub = getSubCategory(athlete.birth_date);
          const relevantSchedules = training.schedules.filter(s => 
            s.categories.includes('Todos') || s.categories.includes(sub)
          );
          
          if (relevantSchedules.length > 0) {
            return relevantSchedules.every(s => s.end_time < currentTimeStr);
          }
        }
        return training.end_time < currentTimeStr;
      }
    } else if (eventId && event) {
      if (event.end_date < todayString) return true;
      if (event.start_date > todayString) return false;
      if (event.end_date === todayString) {
        return event.end_time < currentTimeStr;
      }
    }

    if (date < todayString) return true;
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
      const promises = Object.entries(attendance).flatMap(([athleteId, records]) => {
        // Only save records that match the current scope of the component's editing
        // or just save all if we want to sync everything.
        // Usually safer to only save what's relevant to current view to avoid accidental overwrites of other trainings
        return records
          .filter(r => 
            (activeTrainingId && r.training_id === activeTrainingId) ||
            (eventId && r.event_id === eventId) ||
            (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
          )
          .map(r => api.saveAttendance(r));
      });

      await Promise.all(promises);
      setHasChanges(false);
      toast.success('Chamada salva com sucesso!', { id: loadingToast });
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

  const activeAthletes = athletes.filter(a => a.status === 'Ativo' && a.confirmation !== 'Pendente');
  const filteredAthletes = activeAthletes
    .filter(a => {
      const matchesSub = filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          (a.nickname && a.nickname.toLowerCase().includes(search.toLowerCase())) ||
                          a.doc.includes(search);
      
      // Filter by selected training category if not "geral" and not explicit trainingId prop
      if (selectedTrainingId !== 'geral') {
        const selTraining = availableTrainings.find(t => t.id === selectedTrainingId);
        if (selTraining) {
           // We might want to filter strictly by training's category or just show all but link it
           // For "chamada via treino", we usually only show eligible athletes
           const athleteSub = getSubCategory(a.birth_date);
           const isEligible = selTraining.category === 'Todos' || selTraining.category === athleteSub;
           if (!isEligible) return false;
        }
      }

      // Apply tab filter
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

      if (tabFilter === 'present' && att?.status !== 'Presente') return false;
      if (tabFilter === 'absent' && att?.status !== 'Faltou') return false;
      if (tabFilter === 'observation' && att) return false;

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
      
      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        return records.some(r => r.status === 'Presente');
      }

      const att = records.find(r => 
        (activeTrainingId && r.training_id === activeTrainingId) ||
        (eventId && r.event_id === eventId) ||
        (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
      );
      return att?.status === 'Presente';
    }).length,
    absent: filteredAthletes.filter(a => {
      const records = attendance[a.id] || [];
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;

      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        // Only count as absent if definitely marked as absent and NO present record exists
        return records.some(r => r.status === 'Faltou') && !records.some(r => r.status === 'Presente');
      }

      const att = records.find(r => 
        (activeTrainingId && r.training_id === activeTrainingId) ||
        (eventId && r.event_id === eventId) ||
        (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
      );
      return att?.status === 'Faltou';
    }).length,
    notMarked: filteredAthletes.filter(a => {
      const records = attendance[a.id] || [];
      const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
      
      if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
        return records.length === 0;
      }

      const att = records.find(r => 
        (activeTrainingId && r.training_id === activeTrainingId) ||
        (eventId && r.event_id === eventId) ||
        (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
      );
      return !att;
    }).length
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
              
              <button 
                onClick={markAllPresent}
                className="flex items-center gap-2 px-4 py-3 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
              >
                <CheckCircle2 size={16} />
                Presença Rápida
              </button>
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
                {availableTrainings.map(t => (
                  <option key={t.id} value={t.id}>
                    TREINO: {t.category} ({t.start_time})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-theme-primary/40">
                <Filter size={14} />
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <input 
              type="date" 
              disabled={!!trainingId || !!eventId}
              className={cn(
                "px-4 py-3 bg-black border border-theme-primary/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-black uppercase text-xs",
                (trainingId || eventId) && "opacity-50 cursor-not-allowed"
              )}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative md:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar atleta..." 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none"
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
              tabFilter === 'absent' ? "bg-red-500 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Ausentes ({stats.absent})
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
      </div>

      <div className="bg-black border border-theme-primary/20 rounded-2xl overflow-hidden shadow-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atleta</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Horário</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Presença</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredAthletes.map((athlete) => {
                const records = attendance[athlete.id] || [];
                const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
                
                let att;
                if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
                  att = records.find(r => !r.training_id && !r.event_id);
                } else {
                  att = records.find(r => 
                    (activeTrainingId && r.training_id === activeTrainingId) ||
                    (eventId && r.event_id === eventId) ||
                    (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
                  );
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
                            <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">Horário Previsto</span>
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
                            (att?.status === 'Presente' || (selectedTrainingId === 'geral' && isPresentInAnyTraining)) ? "bg-green-500 text-black font-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700",
                            isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <CheckCircle2 size={18} />
                          <span className="text-[10px] uppercase font-black">
                            {att?.status === 'Presente' ? 'Presente' : (selectedTrainingId === 'geral' && isPresentInAnyTraining) ? 'Pres. Treino' : 'Presente'}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-zinc-800">
          {filteredAthletes.map((athlete) => {
            const records = attendance[athlete.id] || [];
            const activeTrainingId = selectedTrainingId !== 'geral' ? selectedTrainingId : trainingId;
            
            let att;
            if (selectedTrainingId === 'geral' && !trainingId && !eventId) {
              att = records.find(r => !r.training_id && !r.event_id);
            } else {
              att = records.find(r => 
                (activeTrainingId && r.training_id === activeTrainingId) ||
                (eventId && r.event_id === eventId) ||
                (!activeTrainingId && !eventId && !r.training_id && !r.event_id)
              );
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
                        (att?.status === 'Presente' || (selectedTrainingId === 'geral' && isPresentInAnyTraining)) ? "bg-green-500 text-black font-black" : "bg-zinc-800 text-zinc-500",
                        isAthleteLocked(athlete) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <CheckCircle2 size={18} />
                      <span className="text-[10px] uppercase font-black">
                        {att?.status === 'Presente' ? 'Presente' : (selectedTrainingId === 'geral' && isPresentInAnyTraining) ? 'Pres. Treino' : 'Presente'}
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
                  <div className="pt-1">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredAthletes.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            Nenhum atleta encontrado para chamada.
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
    </div>
  );
}
