import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event, Athlete, Professor, Companion } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Users, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Printer, 
  Share2, 
  Plus, 
  X, 
  Loader2, 
  ClipboardList,
  Search,
  UserPlus,
  ChevronRight,
  Edit,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import EventsManagement from './EventsManagement';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function TravelList({ role = 'admin' }: { role?: 'admin' | 'student' | 'professor' }) {
  const isAdmin = role === 'admin' || role === 'professor';
  const { settings } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [lineups, setLineups] = useState<{ athletes: Athlete[], staff: Professor[], lineup_index: number, category?: string }[]>([]);
  const [selectedLineupIndexes, setSelectedLineupIndexes] = useState<number[]>([0]);
  const [lineup, setLineup] = useState<{ athletes: Athlete[], staff: Professor[] }>({ athletes: [], staff: [] });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingCompanion, setIsAddingCompanion] = useState(false);
  const [isEditingLineup, setIsEditingLineup] = useState(false);
  const [newCompanion, setNewCompanion] = useState({ name: '', doc: '', whatsapp: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [responsibleWhatsApp, setResponsibleWhatsApp] = useState('');
  const [delegationResponsible, setDelegationResponsible] = useState(settings?.technicalDirector || '');
  const [directorName, setDirectorName] = useState(settings?.president || '');

  const loadAthletes = async () => {
    try {
      const data = await api.getAthletes();
      setAthletes(data);
    } catch (error) {
      console.error("Error loading athletes:", error);
    }
  };

  const loadProfessors = async () => {
    try {
      const data = await api.getProfessors();
      setProfessors(data);
    } catch (error) {
      console.error("Error loading professors:", error);
    }
  };

  useEffect(() => {
    loadEvents();
    loadAthletes();
    loadProfessors();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventData(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    // Combine selected lineups into one cumulative list
    const cumulativeAthletes: Athlete[] = [];
    const cumulativeStaff: Professor[] = [];
    const processedAthleteIds = new Set<string>();
    const processedStaffIds = new Set<string>();

    lineups.forEach(l => {
      if (selectedLineupIndexes.includes(l.lineup_index)) {
        l.athletes.forEach(a => {
          if (!processedAthleteIds.has(a.id)) {
            cumulativeAthletes.push(a);
            processedAthleteIds.add(a.id);
          }
        });
        l.staff.forEach(s => {
          if (!processedStaffIds.has(s.id)) {
            cumulativeStaff.push(s);
            processedStaffIds.add(s.id);
          }
        });
      }
    });

    setLineup({ athletes: cumulativeAthletes, staff: cumulativeStaff });
  }, [lineups, selectedLineupIndexes]);

  const loadEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      toast.error("Erro ao carregar eventos");
    }
  };

  const loadEventData = async (eventId: string) => {
    setLoading(true);
    try {
      // Get All Lineups for the event
      const allLineups = await api.getAllEventLineups(eventId);
      setLineups(allLineups);
      
      // Default to select all indexes if multiple exist, otherwise just index 0
      if (allLineups.length > 0) {
        setSelectedLineupIndexes(allLineups.map(l => l.lineup_index));
      } else {
        setSelectedLineupIndexes([0]);
      }

      // Get Event details for responsible WhatsApp
      const event = events.find(e => e.id === eventId);
      if (event) {
        setResponsibleWhatsApp(event.responsible_phone || '');
        setDelegationResponsible(settings?.technicalDirector || '');
        setDirectorName(settings?.president || '');
      }

      // Get Companions
      const compData = await api.getCompanions(eventId);
      setCompanions(compData);
    } catch (error) {
      toast.error("Erro ao carregar dados da viagem");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLineupPresence = async (personId: string, type: 'athlete' | 'staff', presence: "Presente" | "Ausente", lineupIndex: number) => {
    try {
      await api.updateLineupPresence(selectedEventId, personId, type, presence, lineupIndex);
      // Update local state for immediate feedback
      setLineups(prev => prev.map(l => {
        if (l.lineup_index === lineupIndex) {
          if (type === 'athlete') {
            return { ...l, athletes: l.athletes.map(a => a.id === personId ? { ...a, presence } : a) };
          } else {
            return { ...l, staff: l.staff.map(s => s.id === personId ? { ...s, presence } : s) };
          }
        }
        return l;
      }));
    } catch (error) {
      toast.error("Erro ao atualizar presença");
    }
  };

  const handleUpdateCompanionPresence = async (companionId: string, presence: "Presente" | "Ausente") => {
    try {
      await api.updateCompanionPresence(companionId, presence);
      setCompanions(prev => prev.map(c => c.id === companionId ? { ...c, presence } : c));
    } catch (error) {
      toast.error("Erro ao atualizar presença");
    }
  };

  const handleSaveResponsibleWhatsApp = async () => {
    if (!selectedEventId) return;
    try {
      await api.saveEvent({ ...selectedEvent!, responsible_phone: responsibleWhatsApp });
      toast.success("Contato do responsável salvo");
      loadEvents();
    } catch (error) {
      toast.error("Erro ao salvar contato");
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const isLocked = selectedEvent ? (new Date().toISOString().split('T')[0] > selectedEvent.start_date && !isAdmin) : false;

  const handleAddCompanion = async () => {
    if (!newCompanion.name || !newCompanion.doc || !newCompanion.whatsapp) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      await api.saveCompanion({
        event_id: selectedEventId,
        name: newCompanion.name.toUpperCase(),
        doc: newCompanion.doc,
        whatsapp: newCompanion.whatsapp.replace(/\D/g, '')
      });
      toast.success("Acompanhante adicionado");
      setNewCompanion({ name: '', doc: '', whatsapp: '' });
      setIsAddingCompanion(false);
      loadEventData(selectedEventId);
    } catch (error) {
      toast.error("Erro ao adicionar acompanhante");
    }
  };

  const handleDeleteCompanion = async (id: string) => {
    if (confirm("Deseja remover este acompanhante?")) {
      try {
        await api.deleteCompanion(id);
        toast.success("Acompanhante removido");
        loadEventData(selectedEventId);
      } catch (error) {
        toast.error("Erro ao remover");
      }
    }
  };

  const handleRemoveFromLineup = async (personId: string, type: 'athlete' | 'staff') => {
    if (confirm(`Deseja remover esta pessoa da lista de viagem?`)) {
      try {
        await api.removePersonFromLineup(selectedEventId, personId, type);
        toast.success("Removido com sucesso");
        loadEventData(selectedEventId);
      } catch (error) {
        toast.error("Erro ao remover");
      }
    }
  };

  const handleAddToLineup = async (personId: string, type: 'athlete' | 'staff') => {
    try {
      await api.addPersonToLineup(selectedEventId, personId, type);
      toast.success("Adicionado à lista");
      loadEventData(selectedEventId);
      setSearchQuery('');
    } catch (error) {
      toast.error("Erro ao adicionar");
    }
  };

  const getPublicLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?travel-registration=true&eventId=${selectedEventId}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!selectedEvent) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PIRUÁ ESPORTE CLUBE', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Associação Desportiva e Cultural', pageWidth / 2, 26, { align: 'center' });
    
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(15, 30, pageWidth - 15, 30);
    
    // Event Banner Style
    doc.setFillColor(30, 30, 30);
    doc.rect(15, 35, pageWidth - 30, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE VIAGEM', pageWidth / 2, 42, { align: 'center' });
    
    // Event Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`EVENTO: ${selectedEvent.name.toUpperCase()}`, 15, 55);
    doc.text(`DESTINO: ${selectedEvent.city} - ${selectedEvent.uf}`.toUpperCase(), 15, 60);
    doc.text(`DATA: ${new Date(selectedEvent.start_date).toLocaleDateString('pt-BR')}`, 15, 65);
    doc.text(`RESPONSÁVEL: ${delegationResponsible}`.toUpperCase(), pageWidth - 15, 55, { align: 'right' });
    doc.text(`GERADO EM: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 15, 60, { align: 'right' });
    
    // Table - Athletes
    doc.setFontSize(12);
    doc.text(`ATLETAS (${lineup.athletes.length})`, 15, 75);
    
    autoTable(doc, {
      startY: 78,
      head: [['#', 'NOME COMPLETO', 'RG / CPF', 'RESPONSÁVEL', 'TELEFONE']],
      body: lineup.athletes.map((a, idx) => [
        idx + 1,
        a.name.toUpperCase(),
        a.doc,
        (a.guardian_name || '---').toUpperCase(),
        a.guardian_phone || '---'
      ]),
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    // Table - Staff
    const staffStartY = (doc as any).lastAutoTable.finalY + 15;
    if (lineup.staff.length > 0) {
      doc.text(`COMISSÃO TÉCNICA (${lineup.staff.length})`, 15, staffStartY);
      autoTable(doc, {
        startY: staffStartY + 3,
        head: [['#', 'NOME COMPLETO', 'RG / CPF', 'CARGO']],
        body: lineup.staff.map((s, idx) => [
          idx + 1,
          s.name.toUpperCase(),
          s.doc,
          (s.role || 'COMISSÃO').toUpperCase()
        ]),
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
    }
    
    // Table - Companions
    const companionsStartY = (doc as any).lastAutoTable.finalY + 15;
    if (companions.length > 0) {
      doc.text(`ACOMPANHANTES (${companions.length})`, 15, companionsStartY);
      autoTable(doc, {
        startY: companionsStartY + 3,
        head: [['#', 'NOME COMPLETO', 'RG / CPF', 'WHATSAPP']],
        body: companions.map((c, idx) => [
          idx + 1,
          c.name.toUpperCase(),
          c.doc,
          c.whatsapp
        ]),
        headStyles: { fillColor: [150, 150, 150], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
    }

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    if (finalY + 40 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
    }
    
    const signatureY = (doc as any).lastAutoTable.finalY + 40 > doc.internal.pageSize.getHeight() ? 40 : (doc as any).lastAutoTable.finalY + 40;
    
    doc.setLineWidth(0.5);
    doc.line(20, signatureY, 90, signatureY);
    doc.setFontSize(8);
    doc.text(delegationResponsible.toUpperCase() || 'RESPONSÁVEL PELA DELEGAÇÃO', 55, signatureY + 5, { align: 'center' });
    
    doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);
    doc.text(directorName.toUpperCase() || 'DIRETOR(A) EXECUTIVO(A)', pageWidth - 55, signatureY + 5, { align: 'center' });

    doc.save(`lista-viagem-${selectedEvent.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  if (isEditingLineup && selectedEvent) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => {
            setIsEditingLineup(false);
            loadEventData(selectedEventId);
          }}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all font-bold uppercase text-xs tracking-widest flex items-center gap-2"
        >
          <ChevronRight className="rotate-180" size={14} />
          Voltar para Lista de Viagem
        </button>
        <EventsManagement 
          role="admin" 
          events={[selectedEvent]} 
          athletes={athletes} 
          initialOpenLineupEvent={selectedEvent}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-theme-primary/10 rounded-[2rem] border border-theme-primary/20">
            <ClipboardList className="text-theme-primary w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">Lista de Viagem</h2>
            <p className="text-zinc-500 font-medium">Gestão de passageiros e logística para eventos.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-6 py-4 bg-zinc-800 text-white font-black rounded-2xl border border-zinc-700 hover:border-blue-500 transition-all uppercase tracking-widest text-xs"
          >
            <FileText size={18} />
            Gerar PDF
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-4 bg-zinc-800 text-white font-black rounded-2xl border border-zinc-700 hover:border-theme-primary transition-all uppercase tracking-widest text-xs"
          >
            <Printer size={18} />
            Imprimir Lista
          </button>
        </div>
      </section>

      {/* Select Event and Lineups */}
      <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2.5rem] no-print space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Selecionar Evento</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-primary" size={20} />
              <select 
                className="w-full pl-12 pr-4 py-4 bg-black border border-zinc-800 rounded-2xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold uppercase"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name} - {event.start_date}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Selecione Múltiplas Escalações (Subs)</label>
            <div className="flex flex-wrap gap-2 py-2">
              {lineups.map(l => (
                <label key={l.lineup_index} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${selectedLineupIndexes.includes(l.lineup_index) ? 'bg-theme-primary border-theme-primary text-black' : 'bg-black border-zinc-800 text-zinc-400'}`}>
                  <input 
                    type="checkbox"
                    className="hidden"
                    checked={selectedLineupIndexes.includes(l.lineup_index)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLineupIndexes([...selectedLineupIndexes, l.lineup_index]);
                      } else {
                        setSelectedLineupIndexes(selectedLineupIndexes.filter(i => i !== l.lineup_index));
                      }
                    }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest">{l.category || `SUB ${l.lineup_index}`}</span>
                </label>
              ))}
              {lineups.length === 0 && (
                <p className="text-zinc-600 text-[10px] font-bold italic uppercase">Nenhuma escalação criada para este evento</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4 border-t border-zinc-800 pt-6">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">WhatsApp do Responsável</label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="(00) 00000-0000"
                className="flex-1 px-4 py-4 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold"
                value={responsibleWhatsApp}
                onChange={e => setResponsibleWhatsApp(e.target.value)}
              />
              <button 
                onClick={handleSaveResponsibleWhatsApp}
                disabled={isLocked}
                className="px-6 py-4 bg-zinc-800 text-white font-black rounded-2xl hover:bg-zinc-700 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Resp. pela Delegação</label>
              <input 
                type="text" 
                className="w-full px-4 py-4 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold"
                placeholder="Nome do responsável"
                value={delegationResponsible}
                onChange={e => setDelegationResponsible(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Diretor(a) Executivo(a)</label>
              <input 
                type="text" 
                className="w-full px-4 py-4 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold"
                placeholder="Nome do diretor"
                value={directorName}
                onChange={e => setDirectorName(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex gap-2">
            {!isLocked ? (
              <>
                <button 
                  onClick={() => setIsEditingLineup(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 text-white font-black rounded-2xl border border-zinc-700 hover:border-theme-primary transition-all uppercase tracking-widest text-xs"
                >
                  <Edit size={14} />
                  Editar Escalação
                </button>
                <button 
                  onClick={() => {
                    const link = getPublicLink();
                    navigator.clipboard.writeText(link);
                    toast.success("Link copiado! Envie para os acompanhantes.");
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-theme-primary text-black font-black rounded-2xl hover:bg-theme-primary/90 transition-all uppercase tracking-widest text-xs shadow-lg shadow-theme-primary/20"
                >
                  <Share2 size={14} />
                  Link Cadastro
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-6 py-4 bg-amber-500/10 text-amber-500 font-black rounded-2xl border border-amber-500/20 uppercase tracking-widest text-[10px]">
                <ClipboardList size={14} />
                Lista Bloqueada para Edição (Evento Encerrado)
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-theme-primary animate-spin" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest">Carregando lista...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PRINTABLE AREA START */}
            <div id="printable-travel-list" className="bg-white text-black p-8 md:p-12 min-h-screen">
              {/* Report Header */}
              <div className="flex items-center justify-between border-b-4 border-black pb-8 mb-8">
                <div className="flex items-center gap-6">
                  {settings?.schoolCrest && (
                    <img src={settings.schoolCrest} alt="Logo" className="w-20 h-20 object-contain" />
                  )}
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Piruá Esporte Clube</h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Associação Desportiva e Cultural</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-black text-white px-4 py-2 font-black italic transform skew-x-[-12deg] inline-block mb-2">
                    <span className="skew-x-[12deg] block uppercase text-sm">Lista de Viagem</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Event Info */}
              {selectedEvent && (
                <div className="grid grid-cols-2 gap-8 mb-12 bg-zinc-50 p-6 border-l-8 border-black">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-zinc-400 font-sans">Evento / Competição</p>
                    <h3 className="text-xl font-black uppercase italic leading-none">{selectedEvent.name}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-zinc-400 font-sans">Destino</p>
                      <p className="font-bold uppercase text-xs">{selectedEvent.city} - {selectedEvent.uf}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-zinc-400 font-sans">Data</p>
                      <p className="font-bold uppercase text-xs">{new Date(selectedEvent.start_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-zinc-400 font-sans">WhatsApp Resp.</p>
                      <p className="font-bold uppercase text-xs">{selectedEvent.responsible_phone || 'NÃO INFORMADO'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Passenger List Table */}
              <div className="space-y-12">
                {/* Athletes Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-1.5 bg-black" />
                    <h4 className="text-lg font-black uppercase tracking-tight">Atletas ({lineup.athletes.length})</h4>
                  </div>
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">#</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Nome Completo</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">RG / CPF</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Tel. Responsável</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Nome Responsável</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Presença</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest no-print w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 border-x border-b border-zinc-200">
                      {lineup.athletes.map((athlete, idx) => {
                        const originalLineup = lineups.find(l => l.athletes.some(a => a.id === athlete.id));
                        const lIdx = originalLineup?.lineup_index ?? 0;
                        
                        return (
                          <tr key={athlete.id} className="hover:bg-zinc-50 group">
                            <td className="py-3 px-4 text-xs font-bold text-zinc-400">{idx + 1}</td>
                            <td className="py-3 px-4 text-xs font-black uppercase">{athlete.name}</td>
                            <td className="py-3 px-4 text-xs font-medium">{athlete.doc}</td>
                            <td className="py-3 px-4 text-xs font-medium">{athlete.guardian_phone || '---'}</td>
                            <td className="py-3 px-4 text-xs font-bold uppercase text-zinc-600 truncate max-w-[120px]">
                              {athlete.guardian_name ? athlete.guardian_name.split(' ').slice(0, 2).join(' ') : '---'}
                            </td>
                            <td className="py-3 px-4 no-print text-right bg-zinc-200/50"></td>
                            <td className="py-3 px-4">
                              {!isLocked ? (
                                <div className="flex gap-1 no-print">
                                  <button 
                                    onClick={() => handleUpdateLineupPresence(athlete.id, 'athlete', 'Presente', lIdx)}
                                    className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm border ${athlete.presence === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-green-600 hover:text-green-600'}`}
                                  >
                                    P
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateLineupPresence(athlete.id, 'athlete', 'Ausente', lIdx)}
                                    className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm border ${athlete.presence === 'Ausente' ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-red-600 hover:text-red-600'}`}
                                  >
                                    F
                                  </button>
                                </div>
                              ) : null}
                              <span className={`${!isLocked ? 'print:block hidden' : 'block'} font-bold text-xs uppercase`}>
                                {athlete.presence === 'Presente' ? 'Presente' : athlete.presence === 'Ausente' ? 'Faltou' : '---'}
                              </span>
                            </td>
                            <td className="py-3 px-4 no-print text-right">
                              {!isLocked && (
                                <button 
                                  onClick={() => handleRemoveFromLineup(athlete.id, 'athlete')}
                                  className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                                  title="Remover atleta da lista"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {lineup.athletes.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-zinc-400 font-bold uppercase text-xs">Nenhum atleta escalado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Staff Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-1.5 bg-black" />
                    <h4 className="text-lg font-black uppercase tracking-tight">Comissão Técnica ({lineup.staff.length})</h4>
                  </div>
                  <table className="w-full">
                    <thead className="bg-zinc-800 text-white">
                      <tr>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">#</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Nome Completo</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Cargo</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">RG / CPF</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Presença</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest no-print w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 border-x border-b border-zinc-200">
                      {lineup.staff.map((p, idx) => {
                        const originalLineup = lineups.find(l => l.staff.some(s => s.id === p.id));
                        const lIdx = originalLineup?.lineup_index ?? 0;

                        return (
                          <tr key={p.id} className="hover:bg-zinc-50 group">
                            <td className="py-3 px-4 text-xs font-bold text-zinc-400">{idx + 1}</td>
                            <td className="py-3 px-4 text-xs font-black uppercase">{p.name}</td>
                            <td className="py-3 px-4 text-xs font-bold uppercase text-zinc-500">{p.role || 'Comissão'}</td>
                            <td className="py-3 px-4 text-xs font-medium">{p.doc}</td>
                            <td className="py-3 px-4 no-print text-right bg-zinc-200/50"></td>
                            <td className="py-3 px-4">
                              {!isLocked ? (
                                <div className="flex gap-1 no-print">
                                  <button 
                                    onClick={() => handleUpdateLineupPresence(p.id, 'staff', 'Presente', lIdx)}
                                    className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm border ${p.presence === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-green-600 hover:text-green-600'}`}
                                  >
                                    P
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateLineupPresence(p.id, 'staff', 'Ausente', lIdx)}
                                    className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm border ${p.presence === 'Ausente' ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-red-600 hover:text-red-600'}`}
                                  >
                                    F
                                  </button>
                                </div>
                              ) : null}
                              <span className={`${!isLocked ? 'print:block hidden' : 'block'} font-bold text-xs uppercase`}>
                                {p.presence === 'Presente' ? 'Presente' : p.presence === 'Ausente' ? 'Faltou' : '---'}
                              </span>
                            </td>
                            <td className="py-3 px-4 no-print text-right">
                              {!isLocked && (
                                <button 
                                  onClick={() => handleRemoveFromLineup(p.id, 'staff')}
                                  className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                                  title="Remover comissão da lista"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {lineup.staff.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-zinc-400 font-bold uppercase text-xs">Nenhuma comissão técnica escalada</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Companions Section */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-1.5 bg-black" />
                      <h4 className="text-lg font-black uppercase tracking-tight">Acompanhantes ({companions.length})</h4>
                    </div>
                    {!isLocked && (
                      <button 
                        onClick={() => setIsAddingCompanion(!isAddingCompanion)}
                        className="no-print flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-black uppercase hover:bg-zinc-800 transition-all"
                      >
                        {isAddingCompanion ? <X size={14} /> : <Plus size={14} />}
                        {isAddingCompanion ? 'Cancelar' : 'Adicionar Manual'}
                      </button>
                    )}
                  </div>

                  {isAddingCompanion && (
                    <div className="no-print mb-6 space-y-6">
                      {/* Search and Add Existing */}
                      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <Search className="text-theme-primary" size={18} />
                          <h5 className="text-xs font-black text-white uppercase tracking-widest">Incluir Atleta ou Comissão</h5>
                        </div>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="PESQUISAR POR NOME..."
                            className="w-full pl-12 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold uppercase"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        </div>
                        
                        {searchQuery.length >= 2 && (
                          <div className="mt-3 bg-black border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-900 max-h-60 overflow-y-auto">
                            {[...athletes, ...professors]
                              .filter(p => p.name.toUpperCase().includes(searchQuery.toUpperCase()))
                              .slice(0, 10)
                              .map(person => {
                                const isAthlete = 'position' in person;
                                const isAlreadyIn = isAthlete 
                                  ? lineup.athletes.some(a => a.id === person.id)
                                  : lineup.staff.some(s => s.id === person.id);
                                
                                return (
                                  <div key={person.id} className="flex items-center justify-between p-3 hover:bg-zinc-900 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${isAthlete ? 'bg-theme-primary text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {isAthlete ? 'A' : 'C'}
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-white uppercase">{person.name}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{isAthlete ? 'Atleta' : 'Comissão'}</p>
                                      </div>
                                    </div>
                                    {isAlreadyIn ? (
                                      <span className="text-[9px] font-black text-green-500 uppercase px-3 py-1 bg-green-500/10 rounded-full">Já na Lista</span>
                                    ) : (
                                      <button 
                                        onClick={() => handleAddToLineup(person.id, isAthlete ? 'athlete' : 'staff')}
                                        className="px-4 py-1.5 bg-theme-primary text-black text-[10px] font-black rounded-lg hover:bg-theme-primary/90 transition-all uppercase"
                                      >
                                        Incluir
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            {[...athletes, ...professors].filter(p => p.name.toUpperCase().includes(searchQuery.toUpperCase())).length === 0 && (
                              <div className="p-4 text-center text-zinc-600 text-[10px] font-bold uppercase italic">Nenhum resultado encontrado</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Manual Add Companion */}
                      <div className="p-6 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <UserPlus className="text-zinc-600" size={18} />
                          <h5 className="text-xs font-black text-zinc-600 uppercase tracking-widest">Incluir Acompanhante (Não Cadastrado)</h5>
                        </div>
                        <div className="flex flex-wrap gap-4 items-end">
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1">Nome</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 uppercase"
                              value={newCompanion.name}
                              onChange={e => setNewCompanion({...newCompanion, name: e.target.value})}
                            />
                          </div>
                          <div className="w-32">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1">RG / CPF</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                              value={newCompanion.doc}
                              onChange={e => setNewCompanion({...newCompanion, doc: e.target.value})}
                            />
                          </div>
                          <div className="w-40">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1">WhatsApp</label>
                            <input 
                              type="text" 
                              placeholder="(00) 00000-0000"
                              className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                              value={newCompanion.whatsapp}
                              onChange={e => setNewCompanion({...newCompanion, whatsapp: e.target.value})}
                            />
                          </div>
                          <button 
                            onClick={handleAddCompanion}
                            className="px-6 py-2 bg-black text-white font-black rounded-lg text-[10px] uppercase hover:bg-zinc-800 transition-all flex items-center gap-2 h-[38px]"
                          >
                            <Plus size={14} />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <table className="w-full">
                    <thead className="bg-zinc-100 text-zinc-600">
                      <tr>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">#</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Nome Completo</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">RG / CPF</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">WhatsApp</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest">Presença</th>
                        <th className="py-3 px-4 text-left text-[10px] uppercase font-black tracking-widest no-print w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 border-x border-b border-zinc-200">
                      {companions.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-zinc-50 group">
                          <td className="py-3 px-4 text-xs font-bold text-zinc-400">{idx + 1}</td>
                          <td className="py-3 px-4 text-xs font-black uppercase text-zinc-800">{c.name}</td>
                          <td className="py-3 px-4 text-xs font-medium text-zinc-600">{c.doc}</td>
                          <td className="py-3 px-4 text-xs font-medium text-zinc-600">{c.whatsapp || '---'}</td>
                          <td className="py-3 px-4 no-print text-right bg-zinc-200/50"></td>
                          <td className="py-3 px-4">
                            {!isLocked ? (
                              <div className="flex gap-1 no-print">
                                <button 
                                  onClick={() => handleUpdateCompanionPresence(c.id, 'Presente')}
                                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm border ${c.presence === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-green-600 hover:text-green-600'}`}
                                >
                                  P
                                </button>
                                <button 
                                  onClick={() => handleUpdateCompanionPresence(c.id, 'Ausente')}
                                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-sm border ${c.presence === 'Ausente' ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-red-600 hover:text-red-600'}`}
                                >
                                  F
                                </button>
                              </div>
                            ) : null}
                            <span className={`${!isLocked ? 'print:block hidden' : 'block'} font-bold text-xs uppercase`}>
                              {c.presence === 'Presente' ? 'Presente' : c.presence === 'Ausente' ? 'Faltou' : '---'}
                            </span>
                          </td>
                          <td className="py-3 px-4 no-print text-right">
                            {!isLocked && (
                              <button 
                                onClick={() => handleDeleteCompanion(c.id)}
                                className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                                title="Excluir acompanhante da lista"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {companions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-zinc-300 font-bold uppercase text-[10px] tracking-widest">Nenhum acompanhante cadastrado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signature Footer */}
              <div className="mt-24 grid grid-cols-2 gap-12 max-w-4xl mx-auto">
                <div className="text-center pt-8 border-t-2 border-black">
                  <p className="font-bold uppercase text-[11px] mb-2">{delegationResponsible || '_________________________________'}</p>
                  <p className="font-black uppercase text-[10px] leading-none mb-1">Responsável pela Delegação</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">{settings?.schoolName}</p>
                </div>
                <div className="text-center pt-8 border-t-2 border-black">
                  <p className="font-bold uppercase text-[11px] mb-2">{directorName || '_________________________________'}</p>
                  <p className="font-black uppercase text-[10px] leading-none mb-1">Diretoria Executiva</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">{settings?.schoolName}</p>
                </div>
              </div>

              {/* Print Footer */}
              <div className="mt-20 border-t border-zinc-100 pt-8 text-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                  Documento Oficial - {settings?.schoolName}
                </p>
                {(settings?.address || settings?.city) && (
                  <p className="text-[8px] text-zinc-400 uppercase font-medium">
                    {settings.address && settings.address}
                    {settings.neighborhood ? `, ${settings.neighborhood}` : ""}
                    {settings.city ? ` • ${settings.city}` : ""}
                    {settings.uf ? ` - ${settings.uf}` : ""}
                    {settings.phone ? ` • ${settings.phone}` : ""}
                    {settings.email ? ` • ${settings.email}` : ""}
                  </p>
                )}
                <p className="text-[7px] text-zinc-300 font-bold uppercase mt-2 italic">© {new Date().getFullYear()} Desenvolvido pela Piruá Esporte Clube</p>
              </div>
            </div>
            {/* PRINTABLE AREA END */}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-travel-list, #printable-travel-list * { visibility: visible; }
          #printable-travel-list { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
