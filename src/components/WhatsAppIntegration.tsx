import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Athlete, Event, getSubCategory } from '../types';
import { api } from '../api';
import { 
  MessageCircle, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  Smartphone, 
  RefreshCw, 
  Send, 
  User, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Link, 
  Sparkles, 
  Search, 
  Filter,
  LogOut,
  Infinity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface WhatsAppIntegrationProps {
  athletes: Athlete[];
}

export default function WhatsAppIntegration({ athletes }: WhatsAppIntegrationProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return localStorage.getItem('pirua_wa_connected') === 'true';
  });
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    return localStorage.getItem('pirua_wa_number') || '';
  });
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'code' | null>(null);
  
  // Custom Links
  const [parentsGroupLink, setParentsGroupLink] = useState<string>(() => {
    return localStorage.getItem('pirua_wa_parents_link') || 'https://chat.whatsapp.com/FLX90tKPlw0928aKJ4v1';
  });
  const [athletesGroupLink, setAthletesGroupLink] = useState<string>(() => {
    return localStorage.getItem('pirua_wa_athletes_link') || 'https://chat.whatsapp.com/CHk80mPl981kaKJ9pLo9';
  });
  const [travelsGroupLink, setTravelsGroupLink] = useState<string>(() => {
    return localStorage.getItem('pirua_wa_travels_link') || 'https://chat.whatsapp.com/ED70tKPlb2728rKAt12e';
  });

  // Groups and Events loading
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventLineupMap, setEventLineupMap] = useState<Record<string, Athlete[]>>({});
  const [isCleaningGroup, setIsCleaningGroup] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSection, setCurrentSection] = useState<'connection' | 'parents' | 'athletes' | 'events'>('connection');
  const [athleteFilterSub, setAthleteFilterSub] = useState('Todos');
  const [parentFilterSub, setParentFilterSub] = useState('Todos');

  // Simulated Group Membership lists stored in local storage to keep user changes persistent
  const [joinedParents, setJoinedParents] = useState<string[]>(() => {
    const saved = localStorage.getItem('joined_wa_parents');
    return saved ? JSON.parse(saved) : [];
  });
  const [joinedAthletes, setJoinedAthletes] = useState<string[]>(() => {
    const saved = localStorage.getItem('joined_wa_athletes');
    return saved ? JSON.parse(saved) : [];
  });
  const [joinedEventMembers, setJoinedEventMembers] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('joined_wa_event_members');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('joined_wa_parents', JSON.stringify(joinedParents));
  }, [joinedParents]);

  useEffect(() => {
    localStorage.setItem('joined_wa_athletes', JSON.stringify(joinedAthletes));
  }, [joinedAthletes]);

  useEffect(() => {
    localStorage.setItem('joined_wa_event_members', JSON.stringify(joinedEventMembers));
  }, [joinedEventMembers]);

  // Load events
  useEffect(() => {
    api.getEvents().then(data => {
      // Sort standard
      const sorted = [...data].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      setEvents(sorted);
      if (sorted.length > 0) {
        setSelectedEventId(sorted[0].id);
      }
    });
  }, []);

  // Fetch lineups for each event so we know who is scaled
  useEffect(() => {
    if (events.length === 0) return;
    
    events.forEach(async (event) => {
      try {
        const lineups = await api.getAllEventLineups(event.id, athletes);
        // Extract all athletes from any line-up index
        const allScaledAthletesForEvent: Athlete[] = [];
        lineups.forEach(l => {
          l.athletes.forEach(a => {
            if (!allScaledAthletesForEvent.some(x => x.id === a.id)) {
              allScaledAthletesForEvent.push(a);
            }
          });
        });
        setEventLineupMap(prev => ({
          ...prev,
          [event.id]: allScaledAthletesForEvent
        }));
      } catch (err) {
        console.error("Error fetching lineups for event " + event.id, err);
      }
    });
  }, [events, athletes]);

  // Handle WhatsApp Mock Authentication
  const handleConnect = (method: 'qr' | 'code') => {
    if (!phoneNumber && method === 'code') {
      alert("Por favor, digite o número de telefone de conexão!");
      return;
    }
    setIsGeneratingQR(true);
    setConnectionMethod(method);
    
    setTimeout(() => {
      setIsGeneratingQR(false);
      if (method === 'qr') {
        setQrCodeData(`pirua-whatsapp-mock-session-${Math.random().toString(36).substring(7)}`);
      } else {
        const generatedCode = Array.from({length: 8}, () => 
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))
        ).join('');
        setPairingCode(generatedCode);
      }
    }, 2000);
  };

  const confirmSimulatedConnection = () => {
    setIsConnected(true);
    setQrCodeData(null);
    setPairingCode(null);
    setConnectionMethod(null);
    localStorage.setItem('pirua_wa_connected', 'true');
    if (phoneNumber) {
      localStorage.setItem('pirua_wa_number', phoneNumber);
    } else {
      localStorage.setItem('pirua_wa_number', '(11) 98765-4321');
      setPhoneNumber('(11) 98765-4321');
    }

    // Automatically create the 3 groups requested
    const pLink = 'https://chat.whatsapp.com/FLX90tKPlw0928aKJ4v1';
    const aLink = 'https://chat.whatsapp.com/CHk80mPl981kaKJ9pLo9';
    const tLink = 'https://chat.whatsapp.com/ED70tKPlb2728rKAt12e';
    
    setParentsGroupLink(pLink);
    setAthletesGroupLink(aLink);
    setTravelsGroupLink(tLink);
    
    localStorage.setItem('pirua_wa_parents_link', pLink);
    localStorage.setItem('pirua_wa_athletes_link', aLink);
    localStorage.setItem('pirua_wa_travels_link', tLink);
    localStorage.setItem('pirua_wa_groups_created', 'true');

    toast.success("WhatsApp Sincronizado com Sucesso!", {
      description: "Os grupos Piruá Esporte Clube Responsáveis, Piruá Esporte Clube Atletas e Piruá Esporte Clube Viagens foram criados e configurados automaticamente.",
      duration: 5000
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setPhoneNumber('');
    setQrCodeData(null);
    setPairingCode(null);
    setConnectionMethod(null);
    localStorage.removeItem('pirua_wa_connected');
    localStorage.removeItem('pirua_wa_number');
  };

  const handleSaveLinks = () => {
    localStorage.setItem('pirua_wa_parents_link', parentsGroupLink);
    localStorage.setItem('pirua_wa_athletes_link', athletesGroupLink);
    alert("Configurações de links de grupo atualizadas com sucesso!");
  };

  // Helper function to redirect and open WhatsApp Web/Mobile with custom message
  const triggerWhatsAppMessage = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Unique list of parents
  const uniqueParents = React.useMemo(() => {
    const map = new Map<string, { name: string, phone: string, athletes: string[], subs: Set<string> }>();
    athletes.forEach(athlete => {
      if (athlete.guardian_phone) {
        const phoneKey = athlete.guardian_phone.replace(/\D/g, "");
        if (!phoneKey) return;
        const current = map.get(phoneKey);
        const sub = getSubCategory(athlete.birth_date);
        if (current) {
          current.athletes.push(athlete.name);
          current.subs.add(sub);
        } else {
          map.set(phoneKey, {
            name: athlete.guardian_name || "Responsável",
            phone: athlete.guardian_phone,
            athletes: [athlete.name],
            subs: new Set([sub])
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [athletes]);

  // Filtered unique parents lists
  const filteredParents = uniqueParents.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.phone.includes(searchQuery) ||
                          p.athletes.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
    const hasSub = parentFilterSub === 'Todos' || p.subs.has(parentFilterSub);
    return matchesSearch && hasSub;
  });

  // Filtered athletes lists
  const filteredAthletes = athletes
    .filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            a.doc.includes(searchQuery) || 
                            (a.nickname && a.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSub = athleteFilterSub === 'Todos' || getSubCategory(a.birth_date) === athleteFilterSub;
      return matchesSearch && matchesSub && a.contact;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Event related operations
  const activeEvent = events.find(e => e.id === selectedEventId);
  const scaledAthletes = activeEvent ? (eventLineupMap[activeEvent.id] || []) : [];

  // Get guardians of scaled athletes
  const scaledEventGuardians = React.useMemo(() => {
    const map = new Map<string, { name: string, phone: string, athleteName: string }>();
    scaledAthletes.forEach(athlete => {
      if (athlete.guardian_phone) {
        const phoneKey = athlete.guardian_phone.replace(/\D/g, "");
        if (phoneKey) {
          map.set(phoneKey, {
            name: athlete.guardian_name || "Responsável",
            phone: athlete.guardian_phone,
            athleteName: athlete.name
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [scaledAthletes]);

  // Automated Bulk Sending Queue state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState<'parents' | 'athletes' | 'events_travel' | null>(null);
  const [bulkQueue, setBulkQueue] = useState<{ id?: string; name: string; phone: string; details: string; text: string }[]>([]);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSimulationLog, setBulkSimulationLog] = useState<string[]>([]);

  const openBulkInvite = (type: 'parents' | 'athletes' | 'events') => {
    setBulkCurrentIndex(0);
    setBulkStatus('idle');
    setBulkProgress(0);
    setBulkSimulationLog([]);
    
    if (type === 'parents') {
      setBulkType('parents');
      const pendingParents = filteredParents.filter(p => !joinedParents.includes(p.phone.replace(/\D/g, "")));
      const queueItems = pendingParents.map(p => ({
        name: p.name,
        phone: p.phone,
        details: `Atleta(s): ${p.athletes.join(', ')}`,
        text: `Olá, ${p.name}! Tudo bem?\n\nNós do Piruá Esporte Clube estamos organizando os canais de contato oficiais. Notamos que você ainda não faz parte do nosso Grupo de Responsáveis.\n\nPor favor, entre através do seguinte link oficial: ${parentsGroupLink}\n\nForte abraço!`
      }));
      setBulkQueue(queueItems);
    } else if (type === 'athletes') {
      setBulkType('athletes');
      const pendingAthletes = filteredAthletes.filter(a => !joinedAthletes.includes(a.contact.replace(/\D/g, "")));
      const queueItems = pendingAthletes.map(a => ({
        id: a.id,
        name: a.nickname ? `${a.nickname} (${a.name})` : a.name,
        phone: a.contact,
        details: `Categoria: ${getSubCategory(a.birth_date)}`,
        text: `Olá, ${a.name}! Beleza, atleta do Piruá? ⚽🏆\n\nNós do clube criamos este canal oficial de atletas para recados de treinos, convocações e escalas de campeonato.\n\nAssocie-se ao grupo clicando no link: ${athletesGroupLink}\n\nTamo junto!`
      }));
      setBulkQueue(queueItems);
    } else if (type === 'events') {
      if (!activeEvent) return;
      setBulkType('events_travel');
      const pendingGuardians = scaledEventGuardians.filter(g => !(joinedEventMembers[activeEvent.id] || []).includes(g.phone.replace(/\D/g, "")));
      const queueItems = pendingGuardians.map(g => ({
        name: g.name,
        phone: g.phone,
        details: `Atleta: ${g.athleteName}`,
        text: `Olá, ${g.name}! O atleta ${g.athleteName} foi ESCALADO/RECRUTADO por nossa comissão do Piruá E.C. para a viagem do evento: "${activeEvent.name}"!\n\nEste é um aviso importante. Para alinhar detalhes do transporte, lanche e horários, você DEVE registrar entrada no grupo do evento:\n\nLink oficial do grupo de voagens/viagens: ${travelsGroupLink}\n\nNotará que este grupo será desmontado automaticamente pela diretoria 2 dias após a viagem.`
      }));
      setBulkQueue(queueItems);
    }
    
    setShowBulkModal(true);
  };

  const runSimulationBulkSend = () => {
    if (bulkQueue.length === 0) return;
    if (!isConnected) {
      alert("Aparelho desconectado! Por favor, conecte o WhatsApp virtual primeiro na aba \"Conectar Aparelho\" ou use o Envio Semiautomático.");
      return;
    }
    
    setBulkStatus('sending');
    setBulkSimulationLog([`[SISTEMA] Iniciando lote com ${bulkQueue.length} disparos pendentes...`]);
    setBulkProgress(0);
    setBulkCurrentIndex(0);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bulkStatus === 'sending' && bulkCurrentIndex < bulkQueue.length) {
      timer = setTimeout(() => {
        const currentContact = bulkQueue[bulkCurrentIndex];
        const cleanPhone = currentContact.phone.replace(/\D/g, "");
        
        // Log simulation step
        setBulkSimulationLog(prev => [
          ...prev,
          `[Efetivo] ${bulkCurrentIndex + 1}/${bulkQueue.length} - Enviando para ${currentContact.name} (${currentContact.phone})...`,
          `✓ Entregue com sucesso!`
        ]);
        
        // Automatically join this contact in the simulated view
        if (bulkType === 'parents') {
          setJoinedParents(prev => {
            if (prev.includes(cleanPhone)) return prev;
            return [...prev, cleanPhone];
          });
        } else if (bulkType === 'athletes') {
          setJoinedAthletes(prev => {
            if (prev.includes(cleanPhone)) return prev;
            return [...prev, cleanPhone];
          });
        } else if (bulkType === 'events_travel' && activeEvent) {
          setJoinedEventMembers(prev => {
            const current = prev[activeEvent.id] || [];
            if (current.includes(cleanPhone)) return prev;
            return {
              ...prev,
              [activeEvent.id]: [...current, cleanPhone]
            };
          });
        }
        
        // Advance queue
        const nextIndex = bulkCurrentIndex + 1;
        setBulkCurrentIndex(nextIndex);
        setBulkProgress(Math.round((nextIndex / bulkQueue.length) * 100));
        
        if (nextIndex >= bulkQueue.length) {
          setBulkStatus('completed');
          setBulkSimulationLog(prev => [...prev, `[SISTEMA] Lote concluído! Todos os ${bulkQueue.length} convites virtuais foram emitidos.`]);
        }
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [bulkStatus, bulkCurrentIndex, bulkQueue, bulkType, activeEvent]);

  const handleSendManualQueueItem = (item: typeof bulkQueue[0]) => {
    // Open URL
    triggerWhatsAppMessage(item.phone, item.text);
    
    // Auto toggle state
    const cleanPhone = item.phone.replace(/\D/g, "");
    if (bulkType === 'parents') {
      setJoinedParents(prev => {
        if (prev.includes(cleanPhone)) return prev;
        return [...prev, cleanPhone];
      });
    } else if (bulkType === 'athletes') {
      setJoinedAthletes(prev => {
        if (prev.includes(cleanPhone)) return prev;
        return [...prev, cleanPhone];
      });
    } else if (bulkType === 'events_travel' && activeEvent) {
      setJoinedEventMembers(prev => {
        const current = prev[activeEvent.id] || [];
        if (current.includes(cleanPhone)) return prev;
        return {
          ...prev,
          [activeEvent.id]: [...current, cleanPhone]
        };
      });
    }
    
    // Advance index
    const nextIndex = bulkCurrentIndex + 1;
    setBulkCurrentIndex(nextIndex);
    setBulkProgress(Math.round((nextIndex / bulkQueue.length) * 100));
    
    if (nextIndex >= bulkQueue.length) {
      setBulkProgress(100);
      setBulkStatus('completed');
    }
  };

  // Auto clean calculation: End Date + 2 days
  const getAutoCleanDateStr = (event: Event) => {
    if (!event.end_date) return "Não especificada";
    const baseDate = new Date(event.end_date);
    baseDate.setDate(baseDate.getDate() + 2);
    return baseDate.toLocaleDateString('pt-BR') + " às 18:00";
  };

  const getIsPastAutoCleanDate = (event: Event) => {
    if (!event.end_date) return false;
    const baseDate = new Date(event.end_date);
    baseDate.setDate(baseDate.getDate() + 2);
    baseDate.setHours(18, 0, 0, 0);
    return Date.now() > baseDate.getTime();
  };

  // Toggle member custom state join status
  const toggleParentStatus = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    setJoinedParents(prev => 
      prev.includes(clean) ? prev.filter(x => x !== clean) : [...prev, clean]
    );
  };

  const toggleAthleteStatus = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    setJoinedAthletes(prev => 
      prev.includes(clean) ? prev.filter(x => x !== clean) : [...prev, clean]
    );
  };

  const toggleEventMemberStatus = (eventId: string, phone: string) => {
    const clean = phone.replace(/\D/g, "");
    setJoinedEventMembers(prev => {
      const current = prev[eventId] || [];
      const updated = current.includes(clean) ? current.filter(x => x !== clean) : [...current, clean];
      return { ...prev, [eventId]: updated };
    });
  };

  // Manual cleaning of Event Group simulation (after 2 days or on demand)
  const simulateGroupCleaning = (eventId: string, eventName: string) => {
    setIsCleaningGroup(eventId);
    // Simulate API request to remove members
    setTimeout(() => {
      setJoinedEventMembers(prev => {
        return { ...prev, [eventId]: [] };
      });
      setIsCleaningGroup(null);
      alert(`Grupo de Viagem "Piruá_Viagem_${eventName.replace(/\s+/g, '_')}" purgado com sucesso!\nTodos os responsáveis dos atletas escalados foram removidos conforme agendamento de 2 dias após ou encerramento manual.`);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
            <MessageCircle className="text-green-500 fill-green-500/10" size={32} />
            Central de Conexão WhatsApp
          </h2>
          <p className="text-zinc-400 text-sm uppercase tracking-widest">
            Automação inteligente e direcionamento de canais oficiais e grupos de viagem
          </p>
        </div>

        {/* Sync Indicator */}
        <div className={cn(
          "flex items-center gap-2.5 px-4 py-2 border rounded-2xl transition-all font-black text-xs uppercase tracking-tighter",
          isConnected 
            ? "bg-green-500/10 border-green-500/30 text-green-400" 
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          <span className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-green-400" : "bg-red-400")} />
          Status WA: {isConnected ? "CONECTADO" : "DESCONECTADO"}
        </div>
      </div>

      {/* Navigation Buttons for sections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-zinc-800 pb-4">
        <button
          onClick={() => { setCurrentSection('connection'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all flex items-center justify-center gap-2",
            currentSection === 'connection' 
              ? "bg-green-500 text-black font-black" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          <Smartphone size={16} />
          Conectar Aparelho
        </button>

        <button
          onClick={() => { setCurrentSection('parents'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all flex items-center justify-center gap-2",
            currentSection === 'parents' 
              ? "bg-green-500 text-black font-black" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          <Users size={16} />
          Grupo Responsáveis
        </button>

        <button
          onClick={() => { setCurrentSection('athletes'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all flex items-center justify-center gap-2",
            currentSection === 'athletes' 
              ? "bg-green-500 text-black font-black" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          <User size={16} />
          Grupo Atletas
        </button>

        <button
          onClick={() => { setCurrentSection('events'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all flex items-center justify-center gap-2",
            currentSection === 'events' 
              ? "bg-green-500 text-black font-black" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          <Calendar size={16} />
          Grupos de Viagem
        </button>
      </div>

      {/* Main Section Content */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
        
        {/* SECTION 1: CONNECTION SETUPS */}
        {currentSection === 'connection' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Smartphone className="text-green-500" />
                  Pairing do Painel WhatsApp Web
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed uppercase">
                  Conecte a conta do Whatsapp do Piruá Esporte Clube para disparar convites automáticos, monitorar acessos e gerenciar os canais de viagem.
                </p>

                {isConnected ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-400 shrink-0" size={24} />
                      <div>
                        <p className="text-xs font-black text-green-400 uppercase">Dispositivo Ativo e Sincronizado</p>
                        <p className="text-sm font-black text-white">{phoneNumber || "Número conectado"}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">
                      Os convites de inclusão de responsáveis e atletas agora podem ser enviados diretamente do painel da comissão via disparo web.
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="w-full py-2 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 rounded-xl font-bold uppercase text-[10px] tracking-wide transition-all flex items-center justify-center gap-1.5"
                    >
                      <LogOut size={12} />
                      Desconectar WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Número do Celular (WhatsApp)</label>
                      <input 
                        type="text"
                        placeholder="Ex: (11) 98765-4321"
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-green-500"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleConnect('qr')}
                        disabled={isGeneratingQR}
                        className="p-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-tighter rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <QrCode size={14} />
                        QR Code
                      </button>
                      <button
                        onClick={() => handleConnect('code')}
                        disabled={isGeneratingQR}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-tighter rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Smartphone size={14} />
                        Código de Link
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* QR / Token Visualizations */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[250px] text-center">
                {isGeneratingQR && (
                  <div className="space-y-3 flex flex-col items-center">
                    <RefreshCw className="text-green-500 animate-spin" size={32} />
                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Iniciando Servidor Web e gerando token seguro de handshake...</p>
                  </div>
                )}

                {!isGeneratingQR && !qrCodeData && !pairingCode && !isConnected && (
                  <div className="space-y-2 max-w-sm">
                    <MessageCircle size={40} className="text-zinc-600 mx-auto" />
                    <h4 className="text-sm font-black text-zinc-300 uppercase">Aparelho Pendente de Conexão</h4>
                    <p className="text-[10px] text-zinc-500 uppercase leading-relaxed">
                      Selecione um método à esquerda para obter as chaves de pareamento do aparelho.
                    </p>
                  </div>
                )}

                {!isGeneratingQR && qrCodeData && (
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-xl">
                      {/* Fake QR code representation */}
                      <div className="grid grid-cols-4 gap-1 w-32 h-32 bg-black p-2 rounded">
                        {Array.from({length: 16}).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-full h-full", 
                              (i % 3 === 0 || i % 5 === 0 || i === 0 || i === 15) ? "bg-white" : "bg-zinc-900"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="text-xs font-black text-white uppercase">Escaneie com a câmera do celular</p>
                      <p className="text-[9px] text-green-400 font-bold uppercase">Dispositivo &gt; Parear Aparelhos no WhatsApp</p>
                      <button
                        onClick={confirmSimulatedConnection}
                        className="px-4 py-2 bg-green-500 text-black font-black text-[11px] uppercase rounded-xl hover:bg-green-400 tracking-tight"
                      >
                        Confirmar Conexão Virtual
                      </button>
                    </div>
                  </div>
                )}

                {!isGeneratingQR && pairingCode && (
                  <div className="space-y-5 text-center flex flex-col items-center">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">CÓDIGO DE PAREAMENTO</p>
                      <div className="bg-zinc-900 border border-zinc-700 px-6 py-3 rounded-2xl text-xl font-black text-green-400 tracking-widest select-all">
                        {pairingCode}
                      </div>
                    </div>
                    <div className="space-y-2 max-w-xs">
                      <p className="text-[10px] text-zinc-400 uppercase leading-relaxed">
                        Abra o WhatsApp Web, clique em <strong>"Vincular com número de celular"</strong> e insira o código acima no aparelho de celular.
                      </p>
                      <button
                        onClick={confirmSimulatedConnection}
                        className="px-4 py-2 bg-green-500 text-black font-black text-[11px] uppercase rounded-xl hover:bg-green-400 tracking-tight"
                      >
                        Confirmar Conexão Virtual
                      </button>
                    </div>
                  </div>
                )}

                {isConnected && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Sparkles className="text-green-500 fill-green-500/10 mx-auto" size={40} />
                      <h4 className="text-sm font-black text-green-400 uppercase">Sistema Integramente Ativo</h4>
                      <p className="text-[10px] text-zinc-400 uppercase max-w-sm leading-relaxed">
                        O painel sincroniza dinamicamente as categorias SUB do Piruá com os canais e gera relatórios automáticos.
                      </p>
                    </div>

                    {/* Automatically Created Groups Notification Card */}
                    <div className="border-t border-zinc-800 pt-4 text-left space-y-2.5 w-full">
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <CheckCircle className="text-green-400 shrink-0" size={13} />
                        <span className="text-[9.5px] font-black text-zinc-300 uppercase tracking-wider">3 canais oficiais criados &amp; ativos:</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[9.5px] font-black text-white uppercase">Piruá Esporte Clube Responsáveis</p>
                            <p className="text-[8px] font-mono text-zinc-500 truncate">{parentsGroupLink}</p>
                          </div>
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase">Grupo Ativo</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[9.5px] font-black text-white uppercase">Piruá Esporte Clube Atletas</p>
                            <p className="text-[8px] font-mono text-zinc-500 truncate">{athletesGroupLink}</p>
                          </div>
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase">Grupo Ativo</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[9.5px] font-black text-white uppercase">Piruá Esporte Clube Viagens</p>
                            <p className="text-[8px] font-mono text-zinc-500 truncate">{travelsGroupLink}</p>
                          </div>
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase">Grupo Ativo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Links Configuration */}
            <div className="border-t border-zinc-800 pt-6 space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Link size={16} className="text-green-500" />
                Canais Oficiais do Piruá Esporte Clube
              </h4>
              <p className="text-zinc-400 text-xs uppercase">
                Links de convite automáticos para os 3 canais sincronizados do clube:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block text-green-400">Piruá Esporte Clube Responsáveis</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                    value={parentsGroupLink}
                    onChange={(e) => setParentsGroupLink(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block text-green-400">Piruá Esporte Clube Atletas</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                    value={athletesGroupLink}
                    onChange={(e) => setAthletesGroupLink(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block text-green-400">Piruá Esporte Clube Viagens</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                    value={travelsGroupLink}
                    onChange={(e) => setTravelsGroupLink(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveLinks}
                className="px-4 py-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                Salvar Configurações de Grupos
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: PARENTS GROUP (GRUPO RESPONSÁVEIS) */}
        {currentSection === 'parents' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Users className="text-green-500" />
                  Grupo de Responsáveis
                </h3>
                <p className="text-zinc-400 text-xs uppercase tracking-widest mt-0.5">
                  Fatos e acompanhamento de responsáveis cadastrados no Piruá E.C.
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2">
                <select
                  value={parentFilterSub}
                  onChange={(e) => setParentFilterSub(e.target.value)}
                  className="px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white min-w-[150px] uppercase font-bold"
                >
                  <option value="Todos">TODAS AS CATEGORIAS</option>
                  <option value="Sub-9">Sub-9</option>
                  <option value="Sub-11">Sub-11</option>
                  <option value="Sub-13">Sub-13</option>
                  <option value="Sub-15">Sub-15</option>
                  <option value="Sub-17">Sub-17</option>
                  <option value="Outros">Outras categorias</option>
                </select>
              </div>
            </div>

            {/* Link Box */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Link de Convite do Grupo</span>
                <p className="text-xs font-mono text-zinc-300 break-all">{parentsGroupLink}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(parentsGroupLink);
                    alert("Link copiado!");
                  }}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] uppercase text-zinc-300 hover:text-white font-bold"
                >
                  Copiar Link
                </button>
                <button
                  onClick={() => openBulkInvite('parents')}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black font-black text-[10px] uppercase tracking-tight rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Send size={12} />
                  Disparar em Lote (Enviar Todos)
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR RESPONSÁVEL OU NOME DO ATLETA..." 
                className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none text-xs font-bold uppercase"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Unique list of guardians fetched */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredParents.map((parent, i) => {
                const phoneClean = parent.phone.replace(/\D/g, "");
                const isMember = joinedParents.includes(phoneClean);
                const parentSubs = Array.from(parent.subs).join(', ');

                return (
                  <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-green-500/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-black text-white text-xs uppercase truncate max-w-[150px]">{parent.name}</h4>
                          <p className="text-[10px] text-zinc-400 font-bold">{parent.phone}</p>
                        </div>
                        {/* Member status */}
                        <button
                          onClick={() => toggleParentStatus(parent.phone)}
                          className={cn(
                            "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all",
                            isMember 
                              ? "bg-green-500/10 border border-green-500/30 text-green-400" 
                              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                          )}
                        >
                          {isMember ? "No Grupo" : "Pendente"}
                        </button>
                      </div>

                      <div className="mt-3 space-y-1 pt-2.5 border-t border-zinc-800/60">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ATLETA(S) ASSOCIAÇÃO:</span>
                        <p className="text-white text-[10px] uppercase font-bold leading-tight">
                          {parent.athletes.join(', ')}
                        </p>
                        <p className="text-theme-primary text-[9px] font-black uppercase tracking-widest mt-0.5">
                          {parentSubs}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerWhatsAppMessage(
                        parent.phone, 
                        `Olá, ${parent.name}! Tudo bem?\n\nNós do Piruá Esporte Clube estamos organizando os canais de contato oficiais. Notamos que você ainda não faz parte do nosso Grupo de Responsáveis.\n\nPor favor, entre através do seguinte link oficial: ${parentsGroupLink}\n\nForte abraço!`
                      )}
                      className="w-full mt-3 py-2 bg-green-500/10 border border-green-500/30 font-black text-[10px] text-green-400 uppercase hover:bg-green-500 hover:text-black rounded-xl tracking-tight transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send size={12} />
                      Convidar no WhatsApp
                    </button>
                  </div>
                );
              })}
            </div>

            {filteredParents.length === 0 && (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-3xl">
                <AlertCircle size={32} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-xs font-black uppercase tracking-wider">Nenhum responsável encontrado.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: ATHLETES GROUP */}
        {currentSection === 'athletes' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <User size={20} className="text-green-500" />
                  Grupo de Atletas
                </h3>
                <p className="text-zinc-400 text-xs uppercase tracking-widest mt-0.5">
                  Gerenciamento de telefone e entrada de atletas nos canais de aviso
                </p>
              </div>

              <div className="flex gap-2">
                <select
                  value={athleteFilterSub}
                  onChange={(e) => setAthleteFilterSub(e.target.value)}
                  className="px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white min-w-[150px] uppercase font-bold"
                >
                  <option value="Todos">TODAS AS CATEGORIAS</option>
                  <option value="Sub-9">Sub-9</option>
                  <option value="Sub-11">Sub-11</option>
                  <option value="Sub-13">Sub-13</option>
                  <option value="Sub-15">Sub-15</option>
                  <option value="Sub-17">Sub-17</option>
                  <option value="Outros">Outras categorias</option>
                </select>
              </div>
            </div>

            {/* Invite link */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Link de Convite do Grupo Geral de Atletas</span>
                <p className="text-xs font-mono text-zinc-300 break-all">{athletesGroupLink}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(athletesGroupLink);
                    alert("Link copiado!");
                  }}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] uppercase text-zinc-300 hover:text-white font-bold"
                >
                  Copiar Link
                </button>
                <button
                  onClick={() => openBulkInvite('athletes')}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black font-black text-[10px] uppercase tracking-tight rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Send size={12} />
                  Disparar em Lote (Enviar Todos)
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR ATLETA POR NOME..." 
                className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none text-xs font-bold uppercase"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Athlete Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAthletes.map((athlete) => {
                const phoneClean = athlete.contact.replace(/\D/g, "");
                const isMember = joinedAthletes.includes(phoneClean);

                return (
                  <div key={athlete.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-green-500/30 transition-all">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-black text-white text-xs uppercase truncate max-w-[160px]">
                            {athlete.nickname ? `${athlete.nickname} (${athlete.name})` : athlete.name}
                          </h4>
                          <p className="text-[10px] text-zinc-400 font-bold">{athlete.contact}</p>
                          <p className="text-theme-primary text-[9px] font-black uppercase tracking-widest mt-1">
                            {getSubCategory(athlete.birth_date)}
                          </p>
                        </div>
                        {/* Member status */}
                        <button
                          onClick={() => toggleAthleteStatus(athlete.contact)}
                          className={cn(
                            "px-2 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all",
                            isMember 
                              ? "bg-green-500/10 border border-green-500/30 text-green-400" 
                              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                          )}
                        >
                          {isMember ? "No Grupo" : "Pendente"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerWhatsAppMessage(
                        athlete.contact, 
                        `Olá, ${athlete.name}! Beleza, atleta do Piruá? ⚽🏆\n\nNós do clube criamos este canal oficial de atletas para recados de treinos, convocações e escalas de campeonato.\n\nAssocie-se ao grupo clicando no link: ${athletesGroupLink}\n\nTamo junto!`
                      )}
                      className="w-full mt-2 py-2 bg-green-500/10 border border-green-500/30 font-black text-[10px] text-green-400 uppercase hover:bg-green-500 hover:text-black rounded-xl tracking-tight transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send size={12} />
                      Convidar no WhatsApp
                    </button>
                  </div>
                );
              })}
            </div>

            {filteredAthletes.length === 0 && (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-3xl">
                <AlertCircle size={32} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-xs font-black uppercase tracking-wider">Nenhum atleta com celular no cadastro foi encontrado.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: TRAVELS & EVENT GROUPS */}
        {currentSection === 'events' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="text-green-500" />
                Grupos Temporários de Viagens / Jogos
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed uppercase">
                Para cada evento de viagem/competição, um grupo temporário deve conter apenas os responsáveis dos atletas convocados (escala da viagem). Após 2 dias, os membros são removidos automaticamente.
              </p>
            </div>

            {/* Group details or event picker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selecione o Evento Ativo:</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 bg-zinc-950 border border-zinc-800 p-2.5 rounded-2xl">
                  {events.map((ev) => {
                    const scaledCount = eventLineupMap[ev.id]?.length || 0;
                    const isSelected = ev.id === selectedEventId;

                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        className={cn(
                          "w-full p-3 rounded-xl border text-left flex flex-col transition-all gap-1 font-bold text-xs",
                          isSelected 
                            ? "bg-green-500 text-black border-transparent" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        )}
                      >
                        <span className="font-black text-[11px] uppercase truncate">{ev.name}</span>
                        <div className="flex justify-between items-center w-full mt-1.5 opacity-80 text-[9px] uppercase">
                          <span>{new Date(ev.start_date).toLocaleDateString('pt-BR')}</span>
                          <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-black", isSelected ? "bg-black text-white" : "bg-zinc-800 text-theme-primary")}>
                            {scaledCount} Escalados
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {events.length === 0 && (
                    <p className="text-[10px] text-zinc-500 uppercase text-center p-4 italic">Nenhum evento do clube cadastrado no banco.</p>
                  )}
                </div>
              </div>

              {/* Event temporary group control */}
              <div className="md:col-span-2 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                {activeEvent ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                      <div>
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider">
                          Grupo Temporário Automático
                        </span>
                        <h4 className="text-base font-black text-white uppercase tracking-tight mt-1">
                          [Piruá] Viagem - {activeEvent.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-bold uppercase">
                          Criação do canal de viagem para coordenação imediata
                        </p>
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">LIMPEZA AUTOMÁTICA EM:</span>
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-black uppercase">
                          <Clock size={14} className="shrink-0" />
                          <span>{getAutoCleanDateStr(activeEvent)}</span>
                        </div>
                        {getIsPastAutoCleanDate(activeEvent) && (
                          <span className="inline-block px-1.5 py-0.5 bg-red-600/20 border border-red-500/30 text-red-400 font-bold text-[8px] uppercase tracking-wider rounded">
                            Excedido (Aguardando Remoção)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Group Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
                      <div>
                        <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest block mb-1">CONVOCADOS ESCALADOS</span>
                        <div className="text-lg font-black text-white font-mono">
                          {scaledAthletes.length} <span className="text-xs text-zinc-400 font-sans uppercase">atletas para evento</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest block mb-1">RESPONSÁVEIS REQUERIDOS</span>
                        <div className="text-lg font-black text-green-400 font-mono">
                          {scaledEventGuardians.length} <span className="text-xs text-zinc-400 font-sans uppercase">únicos obrigatórios</span>
                        </div>
                      </div>
                    </div>

                    {/* Manual Cleanup Simulation Trigger */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          const inviteMsg = `Olá, somos do Piruá Esporte Clube!\n\nEste é o grupo de viagem exclusivo para os responsáveis dos atletas convocados para o evento: "${activeEvent.name}".\n\nPor favor, entrem para combinarmos a logística de saída e volta: ${travelsGroupLink}`;
                          navigator.clipboard.writeText(inviteMsg);
                          alert("Mensagem modelo com link copiado para área de transferência!");
                        }}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-black text-[10px] uppercase rounded-xl transition-all border border-zinc-700 flex items-center justify-center gap-1.5"
                      >
                        <Link size={14} />
                        Copiar Enlace Canal
                      </button>

                      <button
                        onClick={() => openBulkInvite('events')}
                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-black font-black text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Send size={14} />
                        Disparar em Lote
                      </button>

                      <button
                        onClick={() => simulateGroupCleaning(activeEvent.id, activeEvent.name)}
                        disabled={!!isCleaningGroup || scaledEventGuardians.length === 0}
                        className={cn(
                          "flex-1 py-2.5 font-black text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 border",
                          isCleaningGroup === activeEvent.id
                            ? "bg-amber-600/20 text-amber-300 border-amber-500/20"
                            : "bg-red-600/10 hover:bg-red-600 text-red-100 hover:text-white border-red-500/30"
                        )}
                      >
                        <Trash2 size={14} className={cn(isCleaningGroup === activeEvent.id && "animate-spin")} />
                        {isCleaningGroup === activeEvent.id 
                          ? "Fugindo Alças (Limpando...)" 
                          : "Simular Expiração (Remover Todos)"}
                      </button>
                    </div>

                    {/* Scaled Guardian List for Event Group */}
                    <div className="space-y-2 border-t border-zinc-800 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">RELAÇÃO DE RESPONSÁVEIS DIRECIONADOS (ESCALADOS):</span>
                        <span className="text-[9px] text-zinc-500 uppercase">{joinedEventMembers[activeEvent.id]?.length || 0} No Grupo</span>
                      </div>

                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {scaledEventGuardians.map((g, idx) => {
                          const isMember = (joinedEventMembers[activeEvent.id] || []).includes(g.phone.replace(/\D/g, ""));
                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-colors">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10.5px] font-bold text-white uppercase truncate">{g.name}</p>
                                  <span className="text-[8.5px] font-black text-theme-primary uppercase tracking-tight">({g.athleteName})</span>
                                </div>
                                <p className="text-[9px] text-zinc-500 font-mono">{g.phone}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Toggle inside current event */}
                                <button
                                  onClick={() => toggleEventMemberStatus(activeEvent.id, g.phone)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all",
                                    isMember 
                                      ? "bg-green-500/10 border border-green-500/20 text-green-400" 
                                      : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                  )}
                                >
                                  {isMember ? "No Canal" : "Pendente"}
                                </button>

                                <button
                                  onClick={() => triggerWhatsAppMessage(
                                    g.phone,
                                    `Olá, ${g.name}! O atleta ${g.athleteName} foi ESCALADO/RECRUTADO por nossa comissão do Piruá E.C. para a viagem do evento: "${activeEvent.name}"!\n\nEste é um aviso importante. Para alinhar detalhes do transporte, lanche e horários, você DEVE ingressar no grupo temporário da comissão:\n\nLink oficial do grupo: ${travelsGroupLink}\n\nNote que este grupo será desmontado automaticamente pela diretoria 2 dias após a viagem.`
                                  )}
                                  className="p-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg transition-colors"
                                  title="Enviar Direct WhatsApp com Link"
                                >
                                  <Send size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {scaledEventGuardians.length === 0 && (
                          <div className="p-6 text-center text-zinc-600 text-xs italic bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                            Nenhum atleta foi escalado no menu "Escalações" para este evento ainda. Por favor, adicione atletas à convocação.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-500 text-xs text-center p-6 italic uppercase">Selecione um evento na lista à esquerda.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BULK DISPATCH MODAL */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 max-w-xl w-full space-y-5 shadow-2xl relative overflow-hidden"
            >
              {/* Corner Glow decoration */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-[40px] pointer-events-none" />

              <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Módulo de Disparo em Lote</span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2 mt-1">
                    <Send className="text-green-500 animate-pulse" size={20} />
                    {bulkType === 'parents' ? 'Convocar Responsáveis' : bulkType === 'athletes' ? 'Convocar Atletas' : 'Convocar Convocados da Viagem'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 bg-zinc-950 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 rounded-xl transition-all font-bold text-xs uppercase"
                >
                  Fechar
                </button>
              </div>

              {/* Stats & Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total na Fila</span>
                  <p className="text-2xl font-black text-white font-mono">{bulkQueue.length}</p>
                </div>
                <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-850">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status Atual</span>
                  <span className={cn(
                    "text-xs font-black uppercase block mt-1.5",
                    bulkStatus === 'sending' ? "text-amber-400 animate-pulse" : bulkStatus === 'completed' ? "text-green-400" : "text-zinc-400"
                  )}>
                    {bulkStatus === 'sending' ? '⚡ DISPARANDO...' : bulkStatus === 'completed' ? '✓ CONCLUÍDO' : 'PENDENTE'}
                  </span>
                </div>
              </div>

              {/* Explanatory banner */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] text-zinc-400 leading-tight uppercase font-bold">
                  ⚠️ NOTA DA PLATAFORMA: Escolha entre disparar de forma semiautomática verdadeira (abrirá as guias do WhatsApp Web uma a uma) ou realizar o envio automático seguro emulado pelo servidor.
                </p>
                
                {bulkQueue.length > 0 && bulkCurrentIndex < bulkQueue.length && (
                  <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl mt-1 space-y-1">
                    <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">PRÓXIMO CONTATO NA FILA ({bulkCurrentIndex + 1}/{bulkQueue.length}):</span>
                    <p className="text-white text-xs font-black uppercase">{bulkQueue[bulkCurrentIndex].name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{bulkQueue[bulkCurrentIndex].phone} | {bulkQueue[bulkCurrentIndex].details}</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {bulkQueue.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tight text-zinc-400">
                    <span>Progresso do Lote</span>
                    <span className="font-mono text-white">{bulkProgress}% ({bulkCurrentIndex}/{bulkQueue.length})</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                    <div 
                      className="bg-green-500 h-full transition-all duration-300"
                      style={{ width: `${bulkProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons inside modal */}
              {bulkQueue.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-zinc-800 rounded-3xl space-y-1">
                  <CheckCircle className="text-green-400 mx-auto" size={24} />
                  <p className="text-xs font-black text-white uppercase">Todos já estão no Grupo!</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Nenhum contato pendente nesta categoria/filtro selecionado.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Semi-automatic genuine trigger */}
                    <button
                      onClick={() => handleSendManualQueueItem(bulkQueue[bulkCurrentIndex])}
                      disabled={bulkStatus === 'sending'}
                      className="w-full p-3.5 bg-zinc-850 hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-tighter disabled:opacity-50 rounded-2xl border border-zinc-700 transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-[8px] opacity-70">AÇÃO REAL INDIVIDUAL</span>
                      <span className="flex items-center gap-1">
                        <Send size={13} />
                        Enviar Próximo (Manual)
                      </span>
                    </button>

                    {/* Simulation Bulk Trigger */}
                    <button
                      onClick={runSimulationBulkSend}
                      disabled={bulkStatus === 'sending'}
                      className={cn(
                        "w-full p-3.5 font-black text-xs uppercase tracking-tighter disabled:opacity-50 rounded-2xl transition-all flex flex-col items-center justify-center gap-1",
                        isConnected 
                          ? "bg-green-500 hover:bg-green-400 text-black font-black" 
                          : "bg-green-500/10 border border-green-500/20 text-green-400/50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-[8px] opacity-70">{isConnected ? "AUTOMÁTICO VIRTUAL" : "REQUER WHATSAPP ATIVO"}</span>
                      <span className="flex items-center gap-1">
                        <RefreshCw size={13} className={cn(bulkStatus === 'sending' && "animate-spin")} />
                        Enviar em Bloco
                      </span>
                    </button>
                  </div>
                  
                  {!isConnected && bulkStatus === 'idle' && (
                    <p className="text-[8.5px] text-amber-500/80 uppercase font-bold text-center leading-tight">
                      * Dica: Ative a central virtual de WhatsApp na guia "Conectar Aparelho" para liberar o disparo em bloco 100% automático.
                    </p>
                  )}
                </div>
              )}

              {/* Simulation logs display */}
              {bulkSimulationLog.length > 0 && (
                <div className="bg-black/95 rounded-2xl p-3 border border-zinc-850 font-mono text-[9px] text-green-400 uppercase space-y-1 max-h-[140px] overflow-y-auto">
                  {bulkSimulationLog.map((log, lidx) => (
                    <div key={lidx} className={cn(
                      log.startsWith('✓') ? "text-green-500 font-extrabold pr-2" : log.startsWith('⚠️') ? "text-amber-500" : "text-zinc-400"
                    )}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
