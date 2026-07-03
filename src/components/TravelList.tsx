import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event, Athlete, Professor, Companion, getSubCategory } from '../types';
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
  FileText,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import EventsManagement from './EventsManagement';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function TravelList({ role = 'admin', athletes: athletesProp, professors: professorsProp, initialEventId }: { role?: 'admin' | 'student' | 'professor', athletes?: Athlete[], professors?: Professor[], initialEventId?: string | null }) {
  const isAdmin = role === 'admin' || role === 'professor';
  const { settings } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [lineups, setLineups] = useState<{ athletes: Athlete[], staff: Professor[], lineup_index: number, category?: string, lineup_name?: string }[]>([]);
  const [selectedLineupIndexes, setSelectedLineupIndexes] = useState<number[]>([0]);
  const [lineup, setLineup] = useState<{ athletes: Athlete[], staff: Professor[] }>({ athletes: [], staff: [] });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [professors, setProfessors] = useState<Professor[]>(professorsProp || []);
  const [loading, setLoading] = useState(false);
  const [isAddingCompanion, setIsAddingCompanion] = useState(false);
  const [isEditingLineup, setIsEditingLineup] = useState(false);
  const [newCompanion, setNewCompanion] = useState({ name: '', doc: '', whatsapp: '', role: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [responsibleWhatsApp, setResponsibleWhatsApp] = useState('');
  const [delegationResponsible, setDelegationResponsible] = useState(settings?.technicalDirector || '');
  const [directorName, setDirectorName] = useState(settings?.president || '');
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);

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

  const formatTravelDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const totalOccupiedSeats = (lineup?.athletes?.length || 0) + (lineup?.staff?.length || 0) + (companions?.length || 0);
  const remainingSeatsCount = Math.max(0, 50 - totalOccupiedSeats);

  useEffect(() => {
    if (athletesProp) setAthletes(athletesProp);
    if (professorsProp) setProfessors(professorsProp);
  }, [athletesProp, professorsProp]);

  const loadAthletes = async () => {
    if (athletesProp && athletesProp.length > 0) return;
    try {
      const data = await api.getAthletes();
      setAthletes(data);
    } catch (error) {
      console.error("Error loading athletes:", error);
    }
  };

  const loadProfessors = async () => {
    if (professorsProp && professorsProp.length > 0) return;
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
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId]);

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
          if (!processedAthleteIds.has(a.id) && !excludedIds.includes(a.id)) {
            cumulativeAthletes.push(a);
            processedAthleteIds.add(a.id);
          }
        });
        l.staff.forEach(s => {
          if (!processedStaffIds.has(s.id) && !excludedIds.includes(s.id)) {
            cumulativeStaff.push(s);
            processedStaffIds.add(s.id);
          }
        });
      }
    });

    // Sort alphabetically by name
    cumulativeAthletes.sort((a, b) => a.name.localeCompare(b.name));
    cumulativeStaff.sort((a, b) => a.name.localeCompare(b.name));

    setLineup({ athletes: cumulativeAthletes, staff: cumulativeStaff });
  }, [lineups, selectedLineupIndexes, excludedIds]);

  const loadEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
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
      setCompanions(compData.sort((a, b) => a.name.localeCompare(b.name)));

      // Get Travel Exclusions
      const exclusions = await api.getTravelExclusions(eventId);
      setExcludedIds(exclusions.excluded_ids || []);
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
    if (!newCompanion.name.trim()) {
      toast.error("O nome do acompanhante é obrigatório");
      return;
    }
    try {
      await api.saveCompanion({
        event_id: selectedEventId,
        name: newCompanion.name.toUpperCase().trim(),
        doc: newCompanion.doc.trim() || '---',
        whatsapp: newCompanion.whatsapp.replace(/\D/g, '') || '---',
        role: newCompanion.role.toUpperCase().trim() || 'ACOMPANHANTE'
      });
      toast.success("Acompanhante adicionado");
      setNewCompanion({ name: '', doc: '', whatsapp: '', role: '' });
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
    if (confirm(`Deseja remover esta pessoa da lista de viagem (sem alterar a escalação original)?`)) {
      try {
        await api.addTravelExclusion(selectedEventId, personId);
        toast.success("Passageiro removido da lista de viagem! (Escalação original preservada)");
        loadEventData(selectedEventId);
      } catch (error) {
        toast.error("Erro ao remover");
      }
    }
  };

  const handleAddToLineup = async (personId: string, type: 'athlete' | 'staff') => {
    try {
      if (excludedIds.includes(personId)) {
        await api.removeTravelExclusion(selectedEventId, personId);
        toast.success("Passageiro reincluído na lista de viagem!");
      } else {
        await api.addPersonToLineup(selectedEventId, personId, type);
        toast.success("Adicionado à lista");
      }
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
    
    // Calculate occupied seats and total target seats (standard bus size is 46, but scale up if delegation is larger)
    const totalOccupiedSeats = lineup.athletes.length + lineup.staff.length + companions.length;
    let targetTotalSeats = 46;
    if (totalOccupiedSeats > 46) {
      targetTotalSeats = totalOccupiedSeats; // no empty seats if we exceed standard capacity
    }
    const remainingSeatsCount = Math.max(0, targetTotalSeats - totalOccupiedSeats);
    const totalRowsToRender = totalOccupiedSeats + remainingSeatsCount;

    // Dynamically scale typography and spacing to ensure everything fits on exactly 1 A4 page
    let fontSize = 6.2;
    let cellPadding = 0.6;
    let sectionSpacing = 4;
    let titleFontSize = 8;

    if (totalRowsToRender > 45) {
      fontSize = 5.2;
      cellPadding = 0.35;
      sectionSpacing = 2.5;
      titleFontSize = 7;
    } else if (totalRowsToRender > 30) {
      fontSize = 5.8;
      cellPadding = 0.5;
      sectionSpacing = 3.5;
      titleFontSize = 7.5;
    }

    // Table - Athletes
    doc.setFontSize(titleFontSize);
    doc.text(`ATLETAS (${lineup.athletes.length})`, 10, 39);
    
    autoTable(doc, {
      startY: 41,
      head: [['#', 'NOME COMPLETO', 'RG / CPF', 'CATEGORIA', 'RESPONSÁVEL', 'TELEFONE', 'PRESENÇA']],
      body: lineup.athletes.map((a, idx) => [
        idx + 1,
        a.name.toUpperCase(),
        a.doc || '---',
        getSubCategory(a.birth_date),
        (a.guardian_name || '---').toUpperCase(),
        a.guardian_phone || '---',
        (a.presence || 'PENDENTE').toUpperCase()
      ]),
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', minCellHeight: 3.5 },
      styles: { fontSize: fontSize, cellPadding: cellPadding, overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 39, left: 10, right: 10 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const athlete = lineup.athletes[data.row.index];
          if (athlete) {
            if (athlete.presence === 'Presente') {
              data.cell.styles.fillColor = [220, 252, 231]; // light green (#dcfce7)
            } else if (athlete.presence === 'Ausente') {
              data.cell.styles.fillColor = [254, 226, 226]; // light red (#fee2e2)
            }
          }
        }
      }
    });
    
    // Table - Staff
    let nextY = (doc as any).lastAutoTable.finalY + sectionSpacing;
    if (lineup.staff.length > 0) {
      doc.setFontSize(titleFontSize);
      doc.text(`COMISSÃO TÉCNICA (${lineup.staff.length})`, 10, nextY);
      autoTable(doc, {
        startY: nextY + 1.5,
        head: [['#', 'NOME COMPLETO', 'RG / CPF', 'CARGO', 'PRESENÇA']],
        body: lineup.staff.map((s, idx) => [
          idx + 1 + lineup.athletes.length,
          s.name.toUpperCase(),
          s.doc,
          (s.role || 'COMISSÃO').toUpperCase(),
          (s.presence || 'PENDENTE').toUpperCase()
        ]),
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', minCellHeight: 3.5 },
        styles: { fontSize: fontSize, cellPadding: cellPadding },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { top: 39, left: 10, right: 10 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const staffMember = lineup.staff[data.row.index];
            if (staffMember) {
              if (staffMember.presence === 'Presente') {
                data.cell.styles.fillColor = [220, 252, 231]; // light green (#dcfce7)
              } else if (staffMember.presence === 'Ausente') {
                data.cell.styles.fillColor = [254, 226, 226]; // light red (#fee2e2)
              }
            }
          }
        }
      });
      nextY = (doc as any).lastAutoTable.finalY + sectionSpacing;
    }
    
    // Table - Companions
    if (companions.length > 0) {
      doc.setFontSize(titleFontSize);
      doc.text(`ACOMPANHANTES (${companions.length})`, 10, nextY);
      autoTable(doc, {
        startY: nextY + 1.5,
        head: [['#', 'NOME COMPLETO', 'RG / CPF', 'WHATSAPP', 'PRESENÇA']],
        body: companions.map((c, idx) => [
          idx + 1 + lineup.athletes.length + lineup.staff.length,
          c.role ? `${c.name.toUpperCase()} (${c.role.toUpperCase()})` : c.name.toUpperCase(),
          c.doc,
          c.whatsapp,
          (c.presence || 'PENDENTE').toUpperCase()
        ]),
        headStyles: { fillColor: [150, 150, 150], textColor: [0, 0, 0], fontStyle: 'bold', minCellHeight: 3.5 },
        styles: { fontSize: fontSize, cellPadding: cellPadding },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { top: 39, left: 10, right: 10 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const companion = companions[data.row.index];
            if (companion) {
              if (companion.presence === 'Presente') {
                data.cell.styles.fillColor = [220, 252, 231]; // light green (#dcfce7)
              } else if (companion.presence === 'Ausente') {
                data.cell.styles.fillColor = [254, 226, 226]; // light red (#fee2e2)
              }
            }
          }
        }
      });
      nextY = (doc as any).lastAutoTable.finalY + sectionSpacing;
    }

    // Table - Remaining Empty Seats
    if (remainingSeatsCount > 0) {
      doc.setFontSize(titleFontSize);
      doc.text(`ASSENTOS LIVRES / VAGAS REMANESCENTES EM BRANCO (${remainingSeatsCount})`, 10, nextY);
      autoTable(doc, {
        startY: nextY + 1.5,
        head: [[`#`, `NOME COMPLETO (PREENCHIMENTO MANUAL ATÉ ${targetTotalSeats} LUGARES)`, 'RG / CPF', 'ASSINATURA / WHATSAPP']],
        body: Array.from({ length: remainingSeatsCount }).map((_, rIdx) => [
          totalOccupiedSeats + rIdx + 1,
          '...........................................................................................',
          '................................................',
          '................................................'
        ]),
        headStyles: { fillColor: [220, 220, 220], textColor: [100, 100, 100], fontStyle: 'bold', minCellHeight: 3.5 },
        styles: { fontSize: fontSize, cellPadding: cellPadding },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        margin: { top: 39, left: 10, right: 10 }
      });
      nextY = (doc as any).lastAutoTable.finalY + sectionSpacing;
    }

    // Signatures (Fixed at bottom of the page)
    const signatureY = 275;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(15, signatureY, 90, signatureY);
    doc.setFontSize(7.5);
    doc.text(delegationResponsible.toUpperCase() || 'RESPONSÁVEL PELA DELEGAÇÃO', 52.5, signatureY + 4, { align: 'center' });
    
    doc.line(pageWidth - 90, signatureY, pageWidth - 15, signatureY);
    doc.text(directorName.toUpperCase() || 'DIRETOR(A) EXECUTIVO(A)', pageWidth - 52.5, signatureY + 4, { align: 'center' });

    // Header drawing on all pages (strictly 1 page)
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Header Text and Lines
      if (crestDataUrl) {
        try {
          doc.addImage(crestDataUrl, 'PNG', 10, 5, 11, 11);
        } catch (err) {
          console.warn('Could not add school crest to PDF', err);
        }
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('PIRUÁ ESPORTE CLUBE', pageWidth / 2, 11, { align: 'center' });
      
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Associação Desportiva e Cultural', pageWidth / 2, 15, { align: 'center' });
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, 17, pageWidth - 10, 17);
      
      // Event Banner Style
      doc.setFillColor(0, 0, 0);
      doc.rect(10, 19, pageWidth - 20, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTA DE VIAGEM', pageWidth / 2, 23.5, { align: 'center' });
      
      // Event Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`EVENTO: ${selectedEvent.name.toUpperCase()}`, 10, 29);
      doc.text(`DESTINO: ${selectedEvent.city} - ${selectedEvent.uf}`.toUpperCase(), 10, 32);
      doc.text(`DATA DA VIAGEM: ${formatTravelDate(selectedEvent.start_date)}`, 10, 35);
      doc.text(`RESPONSÁVEL: ${delegationResponsible}`.toUpperCase(), pageWidth - 10, 29, { align: 'right' });
      doc.text(`CONTATO: ${responsibleWhatsApp || '---'}`, pageWidth - 10, 32, { align: 'right' });

      // Page numbers at the bottom footer
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Página: ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    }

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
            onClick={() => {
              if (selectedEventId) {
                toast.promise(loadEventData(selectedEventId), {
                  loading: 'Sincronizando dados mais recentes...',
                  success: 'Dados atualizados com sucesso!',
                  error: 'Erro ao conectar ou buscar dados.',
                });
              } else {
                toast.error('Nenhum evento selecionado.');
              }
            }}
            disabled={loading || !selectedEventId}
            className="flex items-center gap-2 px-6 py-4 bg-zinc-800 text-white font-black rounded-2xl border border-zinc-700 hover:border-theme-primary transition-all uppercase tracking-widest text-xs disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-theme-primary" : "text-theme-primary"} />
            Atualizar dados
          </button>
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
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {l.lineup_name || l.category || `SUB ${l.lineup_index}`}
                  </span>
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

          <div className="w-full md:w-auto flex flex-wrap gap-2">
            {!isLocked ? (
              <>
                <button 
                  onClick={() => setIsAddingCompanion(!isAddingCompanion)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 font-black rounded-2xl border transition-all uppercase tracking-widest text-xs ${isAddingCompanion ? 'bg-theme-primary text-black border-theme-primary shadow-lg shadow-theme-primary/20' : 'bg-zinc-800 text-white border-zinc-700 hover:border-theme-primary'}`}
                >
                  <UserPlus size={14} />
                  {isAddingCompanion ? 'Fechar Painel' : 'Incluir Passageiro'}
                </button>
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
            <div id="printable-travel-list" className="bg-white text-black p-4 print:p-0 min-h-screen">
              {/* Report Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4 print:pb-2 print:mb-2">
                <div className="flex items-center gap-4">
                  {settings?.schoolCrest && (
                    <img src={settings.schoolCrest} alt="Logo" className="w-12 h-12 print:w-10 print:h-10 object-contain" />
                  )}
                  <div>
                    <h1 className="text-xl print:text-lg font-black uppercase tracking-tighter leading-none mb-0.5">Piruá Esporte Clube</h1>
                    <p className="text-[10px] print:text-[8px] font-bold uppercase tracking-widest text-zinc-600">Associação Desportiva e Cultural</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-black text-white px-3 py-1 font-black italic transform skew-x-[-12deg] inline-block mb-1">
                    <span className="skew-x-[12deg] block uppercase text-xs">Lista de Viagem</span>
                  </div>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5 leading-none">Data da Viagem</p>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">{selectedEvent ? formatTravelDate(selectedEvent.start_date) : '---'}</p>
                </div>
              </div>
 
              {/* Event Info */}
              {selectedEvent && (
                <div className="grid grid-cols-2 gap-4 mb-4 print:mb-2 bg-zinc-50 p-3 print:p-2 border-l-4 border-black">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 text-zinc-400 font-sans">Evento / Competição</p>
                    <h3 className="text-sm print:text-xs font-black uppercase italic leading-none">{selectedEvent.name}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 text-zinc-400 font-sans">Destino</p>
                      <p className="font-bold uppercase text-[9px]">{selectedEvent.city} - {selectedEvent.uf}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 text-zinc-400 font-sans">Data</p>
                      <p className="font-bold uppercase text-[9px]">{formatTravelDate(selectedEvent.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 text-zinc-400 font-sans">Responsável</p>
                      <p className="font-bold uppercase text-[9px]">{delegationResponsible || 'NÃO INFORMADO'}</p>
                    </div>
                  </div>
                </div>
              )}
 
              {/* Passenger List Table */}
              <div className="space-y-6 print:space-y-4">
                {/* Athletes Section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-1 bg-black" />
                    <h4 className="text-sm print:text-xs font-black uppercase tracking-tight">Atletas ({lineup.athletes.length})</h4>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">#</th>
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">Nome Completo</th>
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">RG / CPF</th>
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">Responsável</th>
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">Telefone</th>
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest no-print">Presença</th>
                        <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest no-print w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="border-x border-b border-zinc-200">
                      {lineup.athletes.map((athlete, idx) => {
                        const originalLineup = lineups.find(l => l.athletes.some(a => a.id === athlete.id));
                        const lIdx = originalLineup?.lineup_index ?? 0;
                        
                        return (
                          <tr key={athlete.id} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                            <td className="py-1 px-2 text-[9px] font-bold text-zinc-400">{idx + 1}</td>
                            <td className="py-1 px-2 text-[9px] font-black uppercase leading-tight">{athlete.name}</td>
                            <td className="py-1 px-2 text-[9px] font-bold text-zinc-600">{athlete.doc}</td>
                            <td className="py-1 px-2 text-[9px] font-bold uppercase text-zinc-600 break-words max-w-[200px]">
                              {athlete.guardian_name || '---'}
                            </td>
                            <td className="py-1 px-2 text-[9px] font-bold text-zinc-600">{athlete.guardian_phone || '---'}</td>
                            <td className="py-1 px-2 no-print">
                              {!isLocked ? (
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => handleUpdateLineupPresence(athlete.id, 'athlete', 'Presente', lIdx)}
                                    className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-sm border ${athlete.presence === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400'}`}
                                  >
                                    P
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateLineupPresence(athlete.id, 'athlete', 'Ausente', lIdx)}
                                    className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-sm border ${athlete.presence === 'Ausente' ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400'}`}
                                  >
                                    F
                                  </button>
                                </div>
                              ) : (
                                <span className="font-bold text-[8px] uppercase">
                                  {athlete.presence === 'Presente' ? 'P' : athlete.presence === 'Ausente' ? 'F' : '---'}
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2 no-print text-right">
                              {!isLocked && (
                                <button 
                                  onClick={() => handleRemoveFromLineup(athlete.id, 'athlete')}
                                  className="text-zinc-400 hover:text-red-600 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
 
                {/* Staff Section */}
                {lineup.staff.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-zinc-600" />
                      <h4 className="text-sm print:text-xs font-black uppercase tracking-tight">Comissão Técnica ({lineup.staff.length})</h4>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-zinc-800 text-white">
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">#</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">Nome Completo</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">Cargo</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">RG / CPF</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest no-print">Presença</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest no-print w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="border-x border-b border-zinc-200">
                        {lineup.staff.map((p, idx) => {
                          const originalLineup = lineups.find(l => l.staff.some(s => s.id === p.id));
                          const lIdx = originalLineup?.lineup_index ?? 0;
  
                          return (
                            <tr key={p.id} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                              <td className="py-1 px-2 text-[9px] font-bold text-zinc-400">{idx + 1 + lineup.athletes.length}</td>
                              <td className="py-1 px-2 text-[9px] font-black uppercase leading-tight">{p.name}</td>
                              <td className="py-1 px-2 text-[9px] font-bold uppercase text-zinc-500">{p.role || 'Comissão'}</td>
                              <td className="py-1 px-2 text-[9px] font-bold text-zinc-600">{p.doc}</td>
                              <td className="py-1 px-2 no-print">
                                {!isLocked ? (
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleUpdateLineupPresence(p.id, 'staff', 'Presente', lIdx)}
                                      className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-sm border ${p.presence === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400'}`}
                                    >
                                      P
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateLineupPresence(p.id, 'staff', 'Ausente', lIdx)}
                                      className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-sm border ${p.presence === 'Ausente' ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400'}`}
                                    >
                                      F
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-bold text-[8px] uppercase">{p.presence === 'Presente' ? 'P' : 'F'}</span>
                                )}
                              </td>
                              <td className="py-1 px-2 no-print text-right">
                                {!isLocked && (
                                  <button 
                                    onClick={() => handleRemoveFromLineup(p.id, 'staff')}
                                    className="text-zinc-400 hover:text-red-600 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
 
                {/* Companions Section */}
                {companions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-zinc-400" />
                      <h4 className="text-sm print:text-xs font-black uppercase tracking-tight">Acompanhantes ({companions.length})</h4>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 text-zinc-600">
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">#</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">Nome Completo</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">RG / CPF</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest">WhatsApp</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest no-print">Presença</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest no-print w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="border-x border-b border-zinc-200">
                        {companions.map((c, idx) => (
                          <tr key={c.id} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                            <td className="py-1 px-2 text-[9px] font-bold text-zinc-400">{idx + 1 + lineup.athletes.length + lineup.staff.length}</td>
                            <td className="py-1 px-2 text-[9px] font-black uppercase leading-tight text-zinc-800">
                              {c.name}
                              {c.role && (
                                <span className="ml-2 text-[8px] bg-zinc-200 text-zinc-700 px-1 py-0.5 rounded font-black tracking-tight">{c.role}</span>
                              )}
                            </td>
                            <td className="py-1 px-2 text-[9px] font-bold text-zinc-600">{c.doc}</td>
                            <td className="py-1 px-2 text-[9px] font-bold text-zinc-600">{c.whatsapp || '---'}</td>
                            <td className="py-1 px-2 no-print">
                              {!isLocked ? (
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => handleUpdateCompanionPresence(c.id, 'Presente')}
                                    className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-sm border ${c.presence === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400'}`}
                                  >
                                    P
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateCompanionPresence(c.id, 'Ausente')}
                                    className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-sm border ${c.presence === 'Ausente' ? 'bg-red-600 border-red-600 text-white' : 'bg-transparent border-zinc-300 text-zinc-400'}`}
                                  >
                                    F
                                  </button>
                                </div>
                              ) : (
                                <span className="font-bold text-[8px] uppercase">{c.presence === 'Presente' ? 'P' : 'F'}</span>
                              )}
                            </td>
                            <td className="py-1 px-2 no-print text-right">
                              {!isLocked && (
                                <button 
                                  onClick={() => handleDeleteCompanion(c.id)}
                                  className="text-zinc-400 hover:text-red-600 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Remaining Empty Seats to hit minimum 50 spots */}
                {remainingSeatsCount > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 w-1 bg-zinc-300" />
                      <h4 className="text-sm print:text-xs font-black uppercase tracking-tight text-zinc-500">
                        Vagas em Branco / Assentos Livres ({remainingSeatsCount} lugares restantes para atingir mínimo de 50)
                      </h4>
                    </div>
                    <table className="w-full border-collapse border border-zinc-200">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-400">
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest w-12 border-b border-zinc-200"># Assento</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest border-b border-zinc-200">Nome Completo (Preenchimento Manual)</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest w-1/4 border-b border-zinc-200">RG / CPF</th>
                          <th className="py-1 px-2 text-left text-[8px] uppercase font-black tracking-widest w-1/4 border-b border-zinc-200">Assinatura / WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody className="border-x border-b border-zinc-200 text-zinc-450">
                        {Array.from({ length: remainingSeatsCount }).map((_, rIdx) => {
                          const seatNumber = totalOccupiedSeats + rIdx + 1;
                          return (
                            <tr key={rIdx} className="border-b border-zinc-100 last:border-0 h-[32px] odd:bg-white even:bg-zinc-50/20">
                              <td className="py-2 px-2 text-[9px] font-bold text-zinc-300 border-r border-zinc-100">{seatNumber}</td>
                              <td className="py-2 px-2 border-r border-zinc-100">
                                <div className="border-b border-dashed border-zinc-300 h-4 w-full opacity-60"></div>
                              </td>
                              <td className="py-2 px-2 border-r border-zinc-100">
                                <div className="border-b border-dashed border-zinc-300 h-4 w-full opacity-60"></div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="border-b border-dashed border-zinc-300 h-4 w-full opacity-60"></div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
 
              {/* Signature Footer */}
              <div className="mt-8 print:mt-6 grid grid-cols-2 gap-8 max-w-4xl mx-auto border-t-2 border-black pt-4">
                <div className="text-center">
                  <p className="font-bold uppercase text-[9px] mb-1">{delegationResponsible || '_________________________________'}</p>
                  <p className="font-black uppercase text-[8px] leading-none">Responsável pela Delegação</p>
                </div>
                <div className="text-center">
                  <p className="font-bold uppercase text-[9px] mb-1">{directorName || '_________________________________'}</p>
                  <p className="font-black uppercase text-[8px] leading-none">Diretoria Executiva</p>
                </div>
              </div>
 
              {/* Print Footer */}
              <div className="mt-6 print:mt-4 pt-4 text-center border-t border-zinc-100">
                <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest">
                  Documento Oficial - {settings?.schoolName} • Viagem em: {selectedEvent ? formatTravelDate(selectedEvent.start_date) : '---'}
                </p>
                {(settings?.address || settings?.city) && (
                  <p className="text-[6px] text-zinc-300 uppercase font-medium mt-0.5">
                    {settings.city || 'São Paulo'} - {settings.uf || 'SP'} • {settings.schoolName}
                  </p>
                )}
              </div>
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
                                const isExcluded = excludedIds.includes(person.id);
                                const isOriginallyInLineup = lineups.some(l => 
                                  selectedLineupIndexes.includes(l.lineup_index) && 
                                  (isAthlete ? l.athletes.some(a => a.id === person.id) : l.staff.some(s => s.id === person.id))
                                );
                                const isAlreadyIn = isOriginallyInLineup ? !isExcluded : (
                                  isAthlete 
                                    ? lineup.athletes.some(a => a.id === person.id)
                                    : lineup.staff.some(s => s.id === person.id)
                                );
                                
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
                                        {isExcluded ? 'Reincluir' : 'Incluir'}
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

                      {/* List of Excluded Passengers */}
                      {excludedIds.length > 0 && (
                        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-xl">
                          <div className="flex items-center gap-3 mb-4">
                            <X className="text-red-500" size={18} />
                            <h5 className="text-xs font-black text-white uppercase tracking-widest">Passageiros Excluídos da Viagem ({excludedIds.length})</h5>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4 leading-relaxed">
                            Estas pessoas estão escaladas no evento, mas foram removidas especificamente da lista de viagem. Clique em "Reincluir" para adicioná-las de volta, sem alterar as escalações dos jogos.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {excludedIds.map(exId => {
                              const p = [...athletes, ...professors].find(x => x.id === exId);
                              if (!p) return null;
                              const isAthlete = 'position' in p;
                              return (
                                <div key={exId} className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded-xl">
                                  <div className="min-w-0 flex-1 mr-2">
                                    <p className="text-xs font-black text-white uppercase truncate">{p.name}</p>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{isAthlete ? 'Atleta' : 'Comissão'}</p>
                                  </div>
                                  <button
                                    onClick={() => handleAddToLineup(exId, isAthlete ? 'athlete' : 'staff')}
                                    className="px-3 py-1 bg-theme-primary text-black text-[9px] font-black rounded-lg hover:bg-theme-primary/95 transition-all uppercase flex-shrink-0"
                                  >
                                    Reincluir
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Manual Add Companion */}
                      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <UserPlus className="text-theme-primary" size={18} />
                          <h5 className="text-xs font-black text-white uppercase tracking-widest">Incluir Acompanhante Manualmente (Não Cadastrado)</h5>
                        </div>
                        <div className="flex flex-wrap gap-4 items-end">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1 animate-pulse">Nome Completo *</label>
                            <input 
                              type="text" 
                              placeholder="NOME DO PASSAGEIRO"
                              className="w-full px-4 py-3 bg-black border border-zinc-820 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold uppercase placeholder:text-zinc-700"
                              value={newCompanion.name}
                              onChange={e => setNewCompanion({...newCompanion, name: e.target.value})}
                            />
                          </div>
                          <div className="w-48">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1">Vínculo / Função</label>
                            <input 
                              type="text" 
                              placeholder="Ex: MÃE, PAI, MOTORISTA..."
                              className="w-full px-4 py-3 bg-black border border-zinc-820 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold uppercase placeholder:text-zinc-700"
                              value={newCompanion.role}
                              onChange={e => setNewCompanion({...newCompanion, role: e.target.value})}
                            />
                          </div>
                          <div className="w-32">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1">RG / CPF (Opcional)</label>
                            <input 
                              type="text" 
                              placeholder="DOCUMENTO"
                              className="w-full px-4 py-3 bg-black border border-zinc-820 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold placeholder:text-zinc-700"
                              value={newCompanion.doc}
                              onChange={e => setNewCompanion({...newCompanion, doc: e.target.value})}
                            />
                          </div>
                          <div className="w-40">
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 px-1">WhatsApp (Opcional)</label>
                            <input 
                              type="text" 
                              placeholder="(00) 00000-0000"
                              className="w-full px-4 py-3 bg-black border border-zinc-820 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold placeholder:text-zinc-700"
                              value={newCompanion.whatsapp}
                              onChange={e => setNewCompanion({...newCompanion, whatsapp: e.target.value})}
                            />
                          </div>
                          <button 
                            onClick={handleAddCompanion}
                            className="px-6 py-3 bg-theme-primary text-black font-black rounded-xl text-xs uppercase hover:bg-theme-primary/95 transition-all flex items-center justify-center gap-2 h-[42px] shadow-lg shadow-theme-primary/20"
                          >
                            <Plus size={14} />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: auto; margin: 5mm; }
          body * { visibility: hidden; }
          #printable-travel-list, #printable-travel-list * { visibility: visible; }
          #printable-travel-list { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          
          /* Forced compacting for print */
          table th, table td { padding: 4px 8px !important; font-size: 8px !important; }
          h1, h2, h3, h4 { margin-top: 4px !important; margin-bottom: 4px !important; }
          .mb-12, .mb-8, .mb-6 { margin-bottom: 8px !important; }
          .mt-24, .mt-20, .mt-12 { margin-top: 8px !important; }
          .p-8, .p-12, .p-6 { padding: 4px !important; }
          
          /* Ensure text is black and high contrast */
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
}
