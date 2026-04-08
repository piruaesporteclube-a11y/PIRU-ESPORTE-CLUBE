import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete, getSubCategory, categories } from '../types';
import { QrCode, Search, CheckCircle2, XCircle, AlertCircle, Camera, User, Printer, FileText, Filter, FileDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { format } from 'date-fns';
import { cn, fixHtml2CanvasColors } from '../utils';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Attendance({ athletes: athletesProp, trainingId, initialDate }: { athletes?: Athlete[], trainingId?: string, initialDate?: string }) {
  const { settings } = useTheme();
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [attendance, setAttendance] = useState<Record<string, { status: string, justification: string, arrival_time?: string }>>({});
  const [filterSub, setFilterSub] = useState('Todos');
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [recentScans, setRecentScans] = useState<{ id: string, name: string, time: string, photo?: string }[]>([]);
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    if (athletesProp) {
      setAthletes(athletesProp);
    } else {
      loadData(true);
    }
  }, [athletesProp]);

  useEffect(() => {
    loadAttendance();
    if (localStorage.getItem('auto_scan') === 'true') {
      setIsScanning(true);
      localStorage.removeItem('auto_scan');
    }
  }, [date, trainingId]);

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
      const attendanceData = await api.getAttendance(date, undefined, trainingId);
      
      const attMap: Record<string, { status: string, justification: string, arrival_time?: string }> = {};
      attendanceData.forEach(a => {
        attMap[a.athlete_id] = { 
          status: a.status, 
          justification: a.justification || '',
          arrival_time: a.arrival_time
        };
      });
      setAttendance(attMap);
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
          console.warn("Erro ao iniciar com facingMode: environment, tentando fallback...", err);
          try {
            // Try any available camera
            await html5QrCode!.start({ facingMode: "user" }, config, onScanSuccess, onScanFailure);
          } catch (err2: any) {
            if (!isMounted) return;
            console.error("Erro ao iniciar scanner em todos os modos:", err2);
            if (err2?.message?.includes("Permission denied")) {
              toast.error("Permissão de câmera negada. Por favor, autorize o acesso nas configurações do navegador.");
            } else if (err2?.name === "NotFoundError" || err2?.message?.includes("Requested device not found")) {
              toast.error("Nenhuma câmera encontrada neste dispositivo.");
            } else {
              toast.error("Não foi possível abrir a câmera. Verifique se ela está sendo usada por outro app.");
            }
            setIsScanning(false);
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
        
        // Only save if not already present to avoid redundant writes
        if (attendance[athleteId]?.status !== 'Presente') {
          await markAttendance(athleteId, 'Presente');
        }
        
        // Check for events today
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

        setScanResult(`Leitura realizada com sucesso: ${athlete.name}`);
        setRecentScans(prev => [{ 
          id: athlete.id, 
          name: athlete.name, 
          time: format(new Date(), 'HH:mm'),
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

  const markAttendance = async (athleteId: string, status: 'Presente' | 'Faltou', justification: string = '', arrival_time?: string) => {
    try {
      // Use a stable ID for the day to prevent duplicate records
      const attendanceId = trainingId ? `${athleteId}_training_${trainingId}` : `${athleteId}_${date}`;
      
      const finalArrivalTime = status === 'Presente' ? (arrival_time || attendance[athleteId]?.arrival_time || format(new Date(), 'HH:mm')) : undefined;
      
      await api.saveAttendance({ 
        id: attendanceId, 
        athlete_id: athleteId, 
        training_id: trainingId, 
        date, 
        status, 
        justification,
        arrival_time: finalArrivalTime
      });
      setAttendance(prev => ({ ...prev, [athleteId]: { status, justification, arrival_time: finalArrivalTime } }));
    } catch (err: any) {
      toast.error(`Erro ao salvar presença: ${err.message}`);
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

  const activeAthletes = athletes.filter(a => a.status === 'Ativo');
  const filteredAthletes = activeAthletes.filter(a => {
    const matchesSub = filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                         (a.nickname && a.nickname.toLowerCase().includes(search.toLowerCase())) ||
                         a.doc.includes(search);
    return matchesSub && matchesSearch;
  });

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
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '1200px';
      container.style.height = '1600px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      
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

      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.padding = '40px';
      clone.style.width = '800px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      
      // Remove no-print elements from clone
      const noPrintElements = clone.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: true,
        width: 800,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
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
    present: filteredAthletes.filter(a => attendance[a.id]?.status === 'Presente').length,
    absent: filteredAthletes.filter(a => attendance[a.id]?.status === 'Faltou').length,
    notMarked: filteredAthletes.filter(a => !attendance[a.id]).length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Chamada de Presença</h2>
          <p className="text-zinc-400 text-sm">Registre a presença dos atletas por QR Code ou manualmente</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
          >
            <QrCode size={18} />
            Atualizar
          </button>
          <button 
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
          >
            <FileText size={18} />
            Relatório
          </button>
          <input 
            type="date" 
            className="px-4 py-2 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button 
            onClick={toggleScanning}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors shadow-lg shadow-theme-primary/20"
          >
            <Camera size={18} />
            {isScanning ? 'Fechar Scanner' : 'Escanear QR Code'}
          </button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar atleta por nome ou documento..." 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value)}
          >
            <option value="Todos">Todas as Categorias</option>
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
                const att = attendance[athlete.id];
                return (
                  <tr key={athlete.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                          {athlete.photo && athlete.photo.trim() !== "" ? (
                            <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <span className="font-medium text-white">{athlete.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-500">{getSubCategory(athlete.birth_date)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {att?.status === 'Presente' ? (
                        <span className="text-xs font-black text-theme-primary bg-theme-primary/10 px-2 py-1 rounded-lg">
                          {att.arrival_time || '--:--'}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">--:--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => markAttendance(athlete.id, 'Presente')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            att?.status === 'Presente' ? "bg-green-500 text-black font-bold" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                          )}
                        >
                          <CheckCircle2 size={20} />
                        </button>
                        <button 
                          onClick={() => markAttendance(athlete.id, 'Faltou')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            att?.status === 'Faltou' ? "bg-red-500 text-black font-bold" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                          )}
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {att?.status === 'Faltou' && (
                        <input 
                          type="text" 
                          placeholder="Justificar falta..."
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-theme-primary"
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-800">
          {filteredAthletes.map((athlete) => {
            const att = attendance[athlete.id];
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
                      <div className="font-bold text-white text-sm">{athlete.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{getSubCategory(athlete.birth_date)}</div>
                      {att?.status === 'Presente' && (
                        <div className="text-[10px] font-black text-theme-primary mt-1">
                          CHEGADA: {att.arrival_time || '--:--'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => markAttendance(athlete.id, 'Presente')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        att?.status === 'Presente' ? "bg-green-500 text-black font-bold" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      <CheckCircle2 size={20} />
                    </button>
                    <button 
                      onClick={() => markAttendance(athlete.id, 'Faltou')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        att?.status === 'Faltou' ? "bg-red-500 text-black font-bold" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>

                {att?.status === 'Faltou' && (
                  <div className="pt-1">
                    <input 
                      type="text" 
                      placeholder="Justificar falta..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-theme-primary"
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
                        <th className="border border-black p-2 text-left w-12">Nº</th>
                        <th className="border border-black p-2 text-left">Nome do Atleta</th>
                        <th className="border border-black p-2 text-center w-24">Horário</th>
                        <th className="border border-black p-2 text-center w-24">Status</th>
                        <th className="border border-black p-2 text-left">Justificativa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAthletes.map((athlete, index) => {
                        const att = attendance[athlete.id];
                        return (
                          <tr key={athlete.id} className={cn(
                            att?.status === 'Faltou' ? "bg-red-50/30" : ""
                          )}>
                            <td className="border border-black p-2 text-center">{index + 1}</td>
                            <td className="border border-black p-2 font-bold uppercase">{athlete.name}</td>
                            <td className="border border-black p-2 text-center font-mono">
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
