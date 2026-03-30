import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete, getSubCategory, categories } from '../types';
import { QrCode, Search, CheckCircle2, XCircle, AlertCircle, Camera, User } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { format } from 'date-fns';
import { cn } from '../utils';
import { toast } from 'sonner';

export default function Attendance() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: string, justification: string }>>({});
  const [filterSub, setFilterSub] = useState('Todos');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    const [athletesData, attendanceData] = await Promise.all([
      api.getAthletes(),
      api.getAttendance(date)
    ]);
    setAthletes(athletesData.filter(a => a.status === 'Ativo'));
    
    const attMap: Record<string, { status: string, justification: string }> = {};
    attendanceData.forEach(a => {
      attMap[a.athlete_id] = { status: a.status, justification: a.justification || '' };
    });
    setAttendance(attMap);
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning) {
      html5QrCode = new Html5Qrcode("reader");
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
          const now = Date.now();
          // Prevent scanning the same code multiple times within 3 seconds
          if (decodedText === lastScannedCode.current && (now - lastScanTime.current) < 3000) {
            return;
          }
          
          lastScannedCode.current = decodedText;
          lastScanTime.current = now;
          handleScan(decodedText);
          // Removed setIsScanning(false) to allow continuous scanning
        },
        (errorMessage) => {
          // Only log actual errors, not "no QR code found" warnings
          if (typeof errorMessage === 'string' && !errorMessage.includes("NotFoundException")) {
            console.warn("Aviso no scanner:", errorMessage);
          }
        }
      ).catch((err) => {
        console.error("Erro ao iniciar scanner:", err);
        if (err?.message?.includes("Permission denied")) {
          toast.error("Permissão de câmera negada. Por favor, autorize o acesso nas configurações do navegador.");
        } else if (err?.message?.includes("NotFoundException")) {
           // Ignore
        } else {
          toast.error("Não foi possível abrir a câmera. Verifique se ela está sendo usada por outro app.");
        }
        setIsScanning(false);
      });
    }

    return () => {
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
    // Expected format: PIRUA-ATHLETE-ID
    const match = data.match(/PIRUA-ATHLETE-([a-zA-Z0-9_-]+)/);
    if (match) {
      const athleteId = match[1];
      const athlete = athletes.find(a => a.id === athleteId);
      if (athlete) {
        playBeep();
        await markAttendance(athleteId, 'Presente');
        
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

        setScanResult(`Presença registrada: ${athlete.name}`);
        setTimeout(() => setScanResult(null), 3000);
      } else {
        setScanResult("Atleta não encontrado ou inativo.");
      }
    } else {
      setScanResult("QR Code inválido.");
    }
  };

  const markAttendance = async (athleteId: string, status: 'Presente' | 'Faltou', justification: string = '') => {
    try {
      await api.saveAttendance({ athlete_id: athleteId, date, status, justification });
      setAttendance(prev => ({ ...prev, [athleteId]: { status, justification } }));
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

  const filteredAthletes = athletes.filter(a => filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Chamada de Presença</h2>
          <p className="text-zinc-400 text-sm">Registre a presença dos atletas por QR Code ou manualmente</p>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
          <div id="reader" className="w-full max-w-md overflow-hidden rounded-xl"></div>
          <p className="mt-4 text-zinc-400 text-sm">Aponte a câmera para o QR Code da carteirinha</p>
        </div>
      )}

      {scanResult && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 animate-bounce",
          scanResult.includes('registrada') ? "bg-green-500/20 text-green-500 border border-green-500/50" : "bg-red-500/20 text-red-500 border border-red-500/50"
        )}>
          {scanResult.includes('registrada') ? <CheckCircle2 /> : <AlertCircle />}
          <span className="font-bold">{scanResult}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
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
                          {athlete.photo ? (
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
                      {athlete.photo ? (
                        <img src={athlete.photo} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{athlete.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{getSubCategory(athlete.birth_date)}</div>
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
    </div>
  );
}
