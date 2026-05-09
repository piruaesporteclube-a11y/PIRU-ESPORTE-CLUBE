import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event, Athlete, Professor, getSubCategory, categories, EventMatchScore, EventMatch } from '../types';
import { Calendar, Plus, MapPin, Clock, Users, User, Save, Printer, X, ChevronRight, Trash2, MessageCircle, Search, FileDown, AlertCircle, CheckCircle2, QrCode, Edit, Instagram, Trophy, Activity, FileText } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRef } from 'react';
import { cn, fixHtml2CanvasColors } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import Attendance from './Attendance';
import EventFlyer from './EventFlyer';
import TrainingFlyer from './TrainingFlyer';

interface EventsManagementProps {
  athletes?: Athlete[];
  events?: Event[];
  role?: 'admin' | 'student' | 'professor';
  initialOpenLineupEvent?: Event;
  loggedInUserId?: string;
}

export default function EventsManagement({ athletes: athletesProp, events: eventsProp, role = 'admin', initialOpenLineupEvent, loggedInUserId }: EventsManagementProps) {
  const { settings } = useTheme();
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const isAdmin = role === 'admin' || role === 'professor';
  const [events, setEvents] = useState<Event[]>(eventsProp || []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLineupOpen, setIsLineupOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (initialOpenLineupEvent) {
      handleOpenLineup(initialOpenLineupEvent);
    }
  }, [initialOpenLineupEvent]);
  const [activeLineupIndex, setActiveLineupIndex] = useState(0);
  const [activeAttendanceEvent, setActiveAttendanceEvent] = useState<Event | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [lineupAthletes, setLineupAthletes] = useState<Athlete[]>([]);
  const [lineupStaff, setLineupStaff] = useState<Professor[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [filterSub, setFilterSub] = useState('Todos');
  const [athleteSearch, setAthleteSearch] = useState('');
  const [namedLineups, setNamedLineups] = useState<any[]>([]);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isLoadTemplateOpen, setIsLoadTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isEventFinished, setIsEventFinished] = useState(false);
  const [lineupCategory, setLineupCategory] = useState('');
  const [lineupName, setLineupName] = useState('');
  const [lineupIndicesWithData, setLineupIndicesWithData] = useState<Record<number, string>>({});
  const [lineupIndicesWithNames, setLineupIndicesWithNames] = useState<Record<number, string>>({});
  const [maxLineupIndex, setMaxLineupIndex] = useState(9);
  const [lineupCounts, setLineupCounts] = useState<Record<string, number>>({});
  const [lineupSummaries, setLineupSummaries] = useState<Record<string, string[]>>({});
  const [activeQRCodeEvent, setActiveQRCodeEvent] = useState<Event | null>(null);
  const [activeFlyerEvent, setActiveFlyerEvent] = useState<Event | null>(null);
  const [modalTab, setModalTab] = useState<'lineup' | 'scores'>('lineup');
  const [eventMatches, setEventMatches] = useState<EventMatch[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isMatchFormOpen, setIsMatchFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<EventMatch> | null>(null);
  const [isDeletingMatch, setIsDeletingMatch] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    if (athletesProp) {
      setAthletes(athletesProp);
    } else {
      api.getAthletes().then(setAthletes);
    }
    
    if (eventsProp) {
      setEvents(eventsProp.sort((a, b) => b.start_date.localeCompare(a.start_date)));
    } else {
      loadEvents();
    }
    
    api.getProfessors().then(setProfessors);
    api.getNamedLineups().then(setNamedLineups);
  }, [athletesProp, eventsProp]);

  const [eventScoresSummary, setEventScoresSummary] = useState<Record<string, EventMatch[]>>({});

  useEffect(() => {
    if (events.length > 0) {
      events.forEach(async (event) => {
        try {
          const { athletes } = await api.getLineup(event.id, 0);
          setLineupCounts(prev => ({ ...prev, [event.id]: athletes.length }));
          setLineupSummaries(prev => ({ ...prev, [event.id]: athletes.map(a => a.name) }));
          
          const matches = await api.getEventMatches(event.id);
          setEventScoresSummary(prev => ({ ...prev, [event.id]: matches }));
        } catch (err) {
          console.error(`Error fetching data for event ${event.id}:`, err);
        }
      });
    }
  }, [events]);

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

  const loadEvents = async () => {
    const data = await api.getEvents();
    setEvents(data.sort((a, b) => b.start_date.localeCompare(a.start_date)));
  };

  const lineupRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [isManualReceiptModalOpen, setIsManualReceiptModalOpen] = useState(false);
  const [manualReceiptData, setManualReceiptData] = useState({ name: '', event: '', date: '' });
  const [showLineupResetConfirm, setShowLineupResetConfirm] = useState(false);

  const handleGenerateReceiptPDF = async (data: { name: string; event: string; date: string; type?: string }) => {
    setIsGeneratingReceipt(true);
    const loadingToast = toast.loading('Gerando comprovante...');
    
    try {
      // Use standard A6 size in portrait
      const pdf = new jsPDF('p', 'mm', [105, 148]);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const primaryColor = settings?.primaryColor || '#fbbf24';
      
      // Header Banner
      pdf.setFillColor(primaryColor);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // Crest
      if (crestDataUrl) {
        try {
          pdf.addImage(crestDataUrl, 'PNG', margin, 5, 15, 15);
        } catch (e) {
          console.warn("Could not add crest to individual PDF:", e);
        }
      }
      
      // School Name
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(settings?.schoolName || 'Piruá Esporte Clube', 28, 12);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('COMPROVANTE OFICIAL DE PARTICIPAÇÃO', 28, 17);

      // Body Section
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CERTIFICADO / COMPROVANTE', pageWidth / 2, 45, { align: 'center' });
      
      pdf.setDrawColor(primaryColor);
      pdf.setLineWidth(0.8);
      pdf.line(pageWidth / 4, 48, (pageWidth / 4) * 3, 48);
      
      let currentY = 65;
      
      const addField = (label: string, value: string) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 100, 100);
        pdf.text(label, margin, currentY);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(value.toUpperCase(), margin, currentY + 6);
        currentY += 20;
      };

      addField('NOME COMPLETO:', data.name);
      addField('EVENTO / ATIVIDADE:', data.event);
      addField('DATA DO EVENTO:', data.date);
      if (data.type) addField('CATEGORIA / FUNÇÃO:', data.type);

      // Contact Details from settings
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('DADOS DA INSTITUIÇÃO:', margin, currentY + 10);
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      let contactY = currentY + 15;
      if (settings?.address) {
        pdf.text(`Endereço: ${settings.address}`, margin, contactY);
        contactY += 4;
      }
      const contactPhone = settings?.whatsapp || settings?.phone;
      if (contactPhone) {
        pdf.text(`Contato: ${contactPhone}`, margin, contactY);
        contactY += 4;
      }
      if (settings?.instagram) {
        pdf.text(`Instagram: @${settings.instagram.replace('@', '')}`, margin, contactY);
      }

      // Footer
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
      pdf.setFontSize(6);
      pdf.setTextColor(150, 150, 150);
      const now = new Date();
      pdf.text(`Documento emitido em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, margin, pageHeight - 12);
      pdf.text(`Código de Autenticidade: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, margin, pageHeight - 8);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryColor);
      pdf.text('PIRUÁ ESPORTE CLUBE', pageWidth - margin, pageHeight - 10, { align: 'right' });

      pdf.save(`comprovante_${data.name.replace(/\s+/g, '_')}_${data.event.replace(/\s+/g, '_')}.pdf`);
      toast.success('Comprovante gerado com sucesso!', { id: loadingToast });
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      toast.error(`Erro ao gerar comprovante: ${error.message}`, { id: loadingToast });
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const [isWhatsAppGroupLoading, setIsWhatsAppGroupLoading] = useState(false);

  const handleSyncWhatsAppGroup = async () => {
    if (!selectedEvent) return;
    
    setIsWhatsAppGroupLoading(true);
    const loadingToast = toast.loading('Sincronizando grupo do WhatsApp...');
    
    try {
      let groupId = selectedEvent.whatsapp_group_id;
      
      if (!groupId) {
        toast.message('Criando novo grupo para o evento...');
        const createRes = await api.whatsapp.createGroup(`VIAGEM: ${selectedEvent.name}`.toUpperCase());
        if (createRes.success && createRes.groupId) {
          groupId = createRes.groupId;
          await api.saveEvent({ ...selectedEvent, whatsapp_group_id: groupId });
          setSelectedEvent(prev => prev ? { ...prev, whatsapp_group_id: groupId } : null);
        } else {
          throw new Error('Falha ao criar grupo');
        }
      }

      // Add staff
      for (const staff of lineupStaff) {
        if (staff.phone) {
          await api.whatsapp.addParticipant(groupId!, staff.phone, `Olá ${staff.name}! Você foi escalado para o evento ${selectedEvent.name}.`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      // Add athletes and guardians
      for (const athlete of lineupAthletes) {
        if (athlete.contact) {
          await api.whatsapp.addParticipant(groupId!, athlete.contact, `Olá ${athlete.name}! Você foi escalado para o evento ${selectedEvent.name}.`);
          await new Promise(r => setTimeout(r, 3000));
        }
        if (athlete.guardian_phone) {
          await api.whatsapp.addParticipant(groupId!, athlete.guardian_phone, `Olá! O atleta ${athlete.name} foi escalado para o evento ${selectedEvent.name}. Você está sendo adicionado ao grupo de viagem.`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      toast.success('Grupo sincronizado com sucesso!', { id: loadingToast });
    } catch (err: any) {
      toast.error(`Erro ao sincronizar grupo: ${err.message}`, { id: loadingToast });
    } finally {
      setIsWhatsAppGroupLoading(false);
    }
  };

  const handleClearWhatsAppGroup = async () => {
    if (!selectedEvent || !selectedEvent.whatsapp_group_id) return;
    
    if (!confirm("Isso removerá todos os atletas e responsáveis do grupo. Deseja continuar?")) return;

    setIsWhatsAppGroupLoading(true);
    const loadingToast = toast.loading('Removendo participantes...');

    try {
      const groupId = selectedEvent.whatsapp_group_id;
      
      // Remove staff
      for (const staff of lineupStaff) {
        if (staff.phone) {
          await api.whatsapp.removeParticipant(groupId, staff.phone);
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      // Remove athletes and guardians
      for (const athlete of lineupAthletes) {
        if (athlete.contact) {
          await api.whatsapp.removeParticipant(groupId, athlete.contact);
          await new Promise(r => setTimeout(r, 1500));
        }
        if (athlete.guardian_phone) {
          await api.whatsapp.removeParticipant(groupId, athlete.guardian_phone);
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      toast.success('Membros removidos com sucesso!', { id: loadingToast });
    } catch (err: any) {
      toast.error(`Erro ao limpar grupo: ${err.message}`, { id: loadingToast });
    } finally {
      setIsWhatsAppGroupLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedEvent) return;
    
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF da escalação...');
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const { settings } = useTheme();
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PIRUÁ ESPORTE CLUBE', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Associação Desportiva e Cultural', pageWidth / 2, 20, { align: 'center' });
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(15, 23, pageWidth - 15, 23);
      
      // Event Banner Style
      const currentLineupLabel = lineupName ? `${lineupName.toUpperCase()} - ${lineupCategory.toUpperCase()}` : `CONVOCATÓRIA: ${selectedEvent.name.toUpperCase()}`;
      doc.setFillColor(0, 0, 0);
      doc.rect(15, 26, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(currentLineupLabel, pageWidth / 2, 31, { align: 'center' });
      
      // Event Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text(`EVENTO: ${selectedEvent.name.toUpperCase()}`, 15, 40);
      doc.text(`DESTINO: ${selectedEvent.city} - ${selectedEvent.uf}`.toUpperCase(), 15, 44);
      doc.text(`DATA: ${new Date(selectedEvent.start_date).toLocaleDateString('pt-BR')}`, 15, 48);
      doc.text(`DOCUMENTO OFICIAL DE CONVOCATÓRIA`, pageWidth - 15, 40, { align: 'right' });
      doc.text(`GERADO EM: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 15, 44, { align: 'right' });
      
      // Display current Match if applicable
      if (activeMatchId) {
        const match = eventMatches.find(m => m.id === activeMatchId);
        if (match) {
          doc.setFont('helvetica', 'bold');
          doc.text(`PARTIDA: ${match.team_a_name} X ${match.team_b_name} (${match.date} ${match.time})`.toUpperCase(), 15, 54);
        }
      }

      // Table - Staff
      let startY = activeMatchId ? 58 : 55;
      if (lineupStaff.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`COMISSÃO TÉCNICA (${lineupStaff.length})`, 15, startY);
        
        autoTable(doc, {
          startY: startY + 2,
          head: [['#', 'NOME COMPLETO', 'IDENTIDADE', 'CARGO', 'CONFIRMAÇÃO']],
          body: lineupStaff.map((s, idx) => [
            idx + 1,
            s.name.toUpperCase(),
            s.doc || '---',
            (s.role || 'COMISSÃO').toUpperCase(),
            (s.confirmation || 'PENDENTE').toUpperCase()
          ]),
          headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', minCellHeight: 4 },
          styles: { fontSize: 7, cellPadding: 1 },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: 15, right: 15 }
        });
        startY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Table - Athletes
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`ATLETAS CONVOCADOS (${lineupAthletes.length})`, 15, startY);
      
      autoTable(doc, {
        startY: startY + 2,
        head: [['#', 'NOME COMPLETO', 'RG / CPF', 'NASC.', 'CATEGORIA', 'STATUS', 'CONFIRMAÇÃO']],
        body: lineupAthletes.sort((a, b) => a.name.localeCompare(b.name)).map((a, idx) => [
          idx + 1,
          a.name.toUpperCase(),
          a.doc || '---',
          a.birth_date ? new Date(a.birth_date).toLocaleDateString('pt-BR') : '---',
          getSubCategory(a.birth_date),
          ((a as any).lineup_status || '---').toUpperCase(),
          (a.confirmation || 'PENDENTE').toUpperCase()
        ]),
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', minCellHeight: 4 },
        styles: { fontSize: 7, cellPadding: 1 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 15, right: 15 }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      if (finalY + 20 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
      }
      
      const signatureY = finalY;
      doc.setLineWidth(0.5);
      doc.line( pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);
      doc.setFontSize(8);
      doc.text('ASSINATURA DO RESPONSÁVEL', pageWidth / 2, signatureY + 5, { align: 'center' });
      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.text('Este documento é uma convocatória oficial para atividades do Piruá Esporte Clube.', pageWidth / 2, signatureY + 12, { align: 'center' });

      doc.save(`convocatoria-${selectedEvent.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Erro ao gerar PDF', { id: loadingToast });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    const now = new Date();
    const [year, month, day] = event.end_date.split('-').map(Number);
    const [hours, minutes] = event.end_time.split(':').map(Number);
    const eventEnd = new Date(year, month - 1, day, hours, minutes);
    
    if (eventEnd < now && !isAdmin) {
      toast.error("Não é possível editar um evento que já finalizou.");
      return;
    }
    
    setFormData(event);
    setIsFormOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveEvent(formData);
      toast.success(formData.id ? "Evento atualizado com sucesso!" : "Evento criado com sucesso!");
      setIsFormOpen(false);
      setFormData({ name: '', street: '', number: '', neighborhood: '', city: '', uf: '', start_date: '', end_date: '', start_time: '', end_time: '' });
      loadEvents();
    } catch (err: any) {
      toast.error(`Erro ao salvar evento: ${err.message}`);
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEventToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await api.deleteEvent(eventToDelete);
      toast.success("Evento excluído com sucesso!");
      loadEvents();
      setIsDeleteConfirmOpen(false);
      setEventToDelete(null);
    } catch (err: any) {
      toast.error(`Erro ao excluir evento: ${err.message}`);
    }
  };

  const handleOpenScores = (event: Event) => {
    setSelectedEvent(event);
    setModalTab('scores');
    setIsLineupOpen(true);
  };

  const handleOpenLineup = async (event: Event, index: number = 0, matchId?: string) => {
    try {
      setSelectedEvent(event);
      setActiveLineupIndex(index);
      setActiveMatchId(matchId || null);
      setModalTab('lineup');
      
      // Set initial loading state for the main lineup
      setLineupAthletes([]);
      setLineupStaff([]);

      // Fetch matches and all lineups for this event in parallel to save quota and time
      const [matches, allLineups] = await Promise.all([
        api.getEventMatches(event.id),
        api.getAllEventLineups(event.id, athletes, professors)
      ]);
      
      setEventMatches(matches);
      
      // Set data for the specific index
      const targetLineup = allLineups.find(l => l.lineup_index === index) || { athletes: [], staff: [], category: '', lineup_name: '' };
      setLineupAthletes(targetLineup.athletes);
      setLineupStaff(targetLineup.staff);
      setLineupCategory(targetLineup.category || '');
      setLineupName((targetLineup as any).lineup_name || '');
      setSelectedAthletes(targetLineup.athletes.map(a => a.id));
      setSelectedStaff(targetLineup.staff.map(s => s.id));

      // Auto-focus the correct index for students
      if (role === 'student' && loggedInUserId && index === 0) {
        const studentIndex = allLineups.findIndex(l => l.athletes.some(a => a.id === loggedInUserId));
        if (studentIndex !== -1 && allLineups[studentIndex].lineup_index !== index) {
          const actualIndex = allLineups[studentIndex].lineup_index;
          setActiveLineupIndex(actualIndex);
          const studentLineup = allLineups[studentIndex];
          setLineupAthletes(studentLineup.athletes);
          setLineupStaff(studentLineup.staff);
          setLineupCategory(studentLineup.category || '');
          setLineupName((studentLineup as any).lineup_name || '');
          setSelectedAthletes(studentLineup.athletes.map(a => a.id));
          setSelectedStaff(studentLineup.staff.map(s => s.id));
        }
      }

      // Check if event is finished
      const now = new Date();
      const [year, month, day] = event.end_date.split('-').map(Number);
      const [hours, minutes] = event.end_time.split(':').map(Number);
      const eventEnd = new Date(year, month - 1, day, hours, minutes);
      setIsEventFinished(eventEnd < now && !isAdmin);

      if (!matchId) {
        // Distribute indices data from the single getAllEventLineups call
        const indices: Record<number, string> = {};
        const names: Record<number, string> = {};
        let currentMax = 9;

        allLineups.forEach(l => {
          indices[l.lineup_index] = l.category || 'Com Dados';
          names[l.lineup_index] = (l as any).lineup_name || '';
          if (l.lineup_index > currentMax) currentMax = l.lineup_index;
        });
        
        setMaxLineupIndex(Math.max(9, currentMax + 1));
        setLineupIndicesWithData(indices);
        setLineupIndicesWithNames(names);
      } else {
        // For matches, we still need to load the specific match lineup if not covered by general indices
        const matchLineup = await api.getLineup(event.id, index, matchId, athletes, professors);
        setLineupAthletes(matchLineup.athletes);
        setLineupStaff(matchLineup.staff);
        setLineupCategory(matchLineup.category || '');
        setLineupName(matchLineup.lineup_name || '');
        setSelectedAthletes(matchLineup.athletes.map(a => a.id));
        setSelectedStaff(matchLineup.staff.map(s => s.id));
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar escalação: ${err.message}`);
    } finally {
      setIsLineupOpen(true);
    }
  };
  const handleOpenMatches = async (event: Event) => {
    try {
      setSelectedEvent(event);
      setModalTab('scores');
      
      const matches = await api.getEventMatches(event.id);
      setEventMatches(matches);
      
      const now = new Date();
      const [year, month, day] = event.end_date.split('-').map(Number);
      const [hours, minutes] = event.end_time.split(':').map(Number);
      const eventEnd = new Date(year, month - 1, day, hours, minutes);
      
      setIsEventFinished(eventEnd < now && !isAdmin);
      setIsLineupOpen(true);
    } catch (err: any) {
      toast.error(`Erro ao carregar jogos: ${err.message}`);
    }
  };
  const handleUpdateAthleteStatus = async (athleteId: string, status: "Titular" | "Reserva") => {
    if (isEventFinished) {
      toast.error("Evento finalizado.");
      return;
    }
    if (selectedEvent) {
      try {
        await api.updateAthleteStatusInLineup(selectedEvent.id, athleteId, status, activeLineupIndex, activeMatchId || undefined);
        const { athletes: updatedLineup } = await api.getLineup(selectedEvent.id, activeLineupIndex, activeMatchId || undefined);
        setLineupAthletes(updatedLineup);
        toast.success(`Status atualizado: ${status}`);
      } catch (err: any) {
        toast.error(`Erro: ${err.message}`);
      }
    }
  };

  const handleConfirmAthlete = async (athleteId: string, type: 'athlete' | 'staff', status: string) => {
    if (isEventFinished) {
      toast.error("Este evento já finalizou. A escalação não pode ser alterada.");
      return;
    }
    if (selectedEvent) {
      try {
        await api.confirmLineup(selectedEvent.id, athleteId, type, status, activeLineupIndex);
        const { athletes: updatedLineup, staff: updatedStaff } = await api.getLineup(selectedEvent.id, activeLineupIndex, activeMatchId || undefined);
        setLineupAthletes(updatedLineup);
        setLineupStaff(updatedStaff);
        toast.success("Confirmação registrada!");
      } catch (err: any) {
        toast.error(`Erro ao confirmar: ${err.message}`);
      }
    }
  };

  const toggleAthlete = (id: string) => {
    if (selectedAthletes.includes(id)) {
      setSelectedAthletes(selectedAthletes.filter(aid => aid !== id));
    } else if (selectedAthletes.length < 22) {
      setSelectedAthletes([...selectedAthletes, id]);
    } else {
      toast.warning('Limite máximo de 22 atletas atingido.');
    }
  };

  const toggleStaff = (id: string) => {
    if (selectedStaff.includes(id)) {
      setSelectedStaff(selectedStaff.filter(sid => sid !== id));
    } else if (selectedStaff.length < 4) {
      setSelectedStaff([...selectedStaff, id]);
    } else {
      toast.warning('Limite máximo de 4 membros da comissão atingido.');
    }
  };

  const handleResetLineup = () => {
    setShowLineupResetConfirm(true);
  };

  const confirmResetLineup = () => {
    setSelectedAthletes([]);
    setSelectedStaff([]);
    setLineupAthletes([]);
    setLineupStaff([]);
    setLineupCategory('');
    setLineupName('');
    setShowLineupResetConfirm(false);
    toast.success("Escalação limpa! Não esqueça de salvar para confirmar no sistema.");
  };

  const [isSavingLineup, setIsSavingLineup] = useState(false);
  const [isNotifyingAll, setIsNotifyingAll] = useState(false);

  const handleNotifyAllLineup = () => {
    if (!selectedEvent) return;
    
    const message = `Olá! Você foi escalado para o evento *${selectedEvent.name}* em *${selectedEvent.start_date}* às *${selectedEvent.start_time}*.
    
Por favor, confirme sua participação acessando o portal: ${window.location.origin}

Contamos com sua presença!`;
    
    // Create a encoded message
    const encodedMessage = encodeURIComponent(message);
    
    // Find all selected whose phone is available
    const athletesWithPhone = athletes.filter(a => selectedAthletes.includes(a.id) && (a as any).contact || (a as any).phone);
    const staffWithPhone = professors.filter(p => selectedStaff.includes(p.id) && p.phone);
    
    if (athletesWithPhone.length === 0 && staffWithPhone.length === 0) {
      toast.error("Nenhum atleta ou membro com telefone cadastrado para notificar.");
      return;
    }

    toast.info(`Iniciando notificações para ${athletesWithPhone.length + staffWithPhone.length} pessoas...`);
    
    // We can't batch send WhatsApp, but we can provide links or open them one by one (browser might block popups)
    // For now, let's open the first one and show a list or just open them in sequence with a delay if allowed
    // Better: Open a small helper list/modal to click one by one efficiently
    setNotificationBatch({
      message: message,
      recipients: [
        ...athletesWithPhone.map(a => ({ id: a.id, name: a.name, phone: (a as any).contact || (a as any).phone || '', type: 'Atleta' })),
        ...staffWithPhone.map(p => ({ id: p.id, name: p.name, phone: p.phone!, type: 'Comissão' }))
      ]
    });
    setIsNotificationModalOpen(true);
  };

  const [notificationBatch, setNotificationBatch] = useState<{ message: string, recipients: { id: string, name: string, phone: string, type: string }[] } | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const handleSaveLineup = async () => {
    if (isEventFinished) {
      toast.error("Este evento já finalizou. A escalação não pode ser alterada.");
      return;
    }
    if (!selectedEvent) return;

    setIsSavingLineup(true);
    const loadingToast = toast.loading('Salvando escalação...');
    try {
      await api.saveLineup(
        selectedEvent.id, 
        selectedAthletes, 
        selectedStaff, 
        activeLineupIndex, 
        lineupCategory, 
        lineupName,
        activeMatchId || undefined
      );
      
      // Delay slightly to ensure Firebase consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force refresh data efficiently using current athletes and professors
      const { athletes: updatedLineup, staff: updatedStaff } = await api.getLineup(
        selectedEvent.id, 
        activeLineupIndex, 
        activeMatchId || undefined,
        athletes,
        professors
      );
      setLineupAthletes(updatedLineup);
      setLineupStaff(updatedStaff);
      
      // Update indices data for UI (only for general lineups)
      if (!activeMatchId) {
        setLineupIndicesWithData(prev => {
          const hasData = selectedAthletes.length > 0 || selectedStaff.length > 0 || lineupCategory || lineupName.trim() !== '';
          if (!hasData) {
            const next = { ...prev };
            delete next[activeLineupIndex];
            return next;
          }
          return {
            ...prev,
            [activeLineupIndex]: lineupCategory || 'Com Dados'
          };
        });

        setLineupIndicesWithNames(prev => ({
          ...prev,
          [activeLineupIndex]: lineupName
        }));

        // Update total counts for the main list
        setLineupCounts(prev => ({
          ...prev,
          [selectedEvent.id]: selectedAthletes.length
        }));
      } else {
        // For matches, we might want to refresh the match list counts or something, 
        // but for now refreshes on event list are usually enough
      }
      
      toast.success('Escalação salva com sucesso!', { id: loadingToast });
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(`Erro ao salvar escalação: ${err.message}`, { id: loadingToast });
    } finally {
      setIsSavingLineup(false);
    }
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.saveEventMatch({
        ...editingMatch,
        event_id: selectedEvent.id
      } as EventMatch);
      toast.success("Jogo salvo com sucesso!");
      setIsMatchFormOpen(false);
      setEditingMatch(null);
      const matches = await api.getEventMatches(selectedEvent.id);
      setEventMatches(matches);
      setEventScoresSummary(prev => ({ ...prev, [selectedEvent.id]: matches }));
    } catch (err: any) {
      toast.error(`Erro ao salvar jogo: ${err.message}`);
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este jogo? Isso também excluirá a escalação vinculada a ele.")) return;
    try {
      await api.deleteEventMatch(id);
      toast.success("Jogo excluído!");
      if (selectedEvent) {
        const matches = await api.getEventMatches(selectedEvent.id);
        setEventMatches(matches);
      }
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleRemoveLineup = async () => {
    if (!selectedEvent || !confirm("Deseja realmente excluir COMPLETAMENTE esta lista (atletas, comissão e configurações)?")) return;
    
    const loadingToast = toast.loading('Excluindo lista...');
    try {
      await api.saveLineup(
        selectedEvent.id, 
        [], 
        [], 
        activeLineupIndex, 
        '', 
        '', 
        activeMatchId || undefined
      );
      
      setLineupAthletes([]);
      setLineupStaff([]);
      setLineupCategory('');
      setLineupName('');
      setSelectedAthletes([]);
      setSelectedStaff([]);
      
      if (!activeMatchId) {
        setLineupIndicesWithData(prev => {
          const next = { ...prev };
          delete next[activeLineupIndex];
          return next;
        });
        setLineupIndicesWithNames(prev => {
          const next = { ...prev };
          delete next[activeLineupIndex];
          return next;
        });
        
        // If we removed the current max, adjust maxLineupIndex
        if (activeLineupIndex === maxLineupIndex && activeLineupIndex > 0) {
          setMaxLineupIndex(prev => prev - 1);
        }
      }
      
      toast.success('Lista excluída com sucesso!', { id: loadingToast });
    } catch (err: any) {
      toast.error(`Erro ao excluir lista: ${err.message}`, { id: loadingToast });
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Informe um nome para o modelo');
      return;
    }
    try {
      await api.saveNamedLineup(templateName, selectedAthletes, selectedStaff);
      toast.success('Modelo de escalação salvo com sucesso!');
      setIsSaveTemplateOpen(false);
      setTemplateName('');
      api.getNamedLineups().then(setNamedLineups);
    } catch (err: any) {
      toast.error('Erro ao salvar modelo');
    }
  };

  const handleLoadTemplate = (template: any) => {
    setSelectedAthletes(template.athlete_ids || []);
    setSelectedStaff(template.staff_ids || []);
    setIsLoadTemplateOpen(false);
    toast.success(`Modelo "${template.name}" carregado!`);
  };

  const filteredAthletes = athletes.filter(a => 
    (filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub) && 
    a.status === 'Ativo' &&
    (a.name.toLowerCase().includes(athleteSearch.toLowerCase()) || 
     (a.nickname && a.nickname.toLowerCase().includes(athleteSearch.toLowerCase())) ||
     a.doc.includes(athleteSearch))
  );

  if (activeAttendanceEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                Chamada: {activeAttendanceEvent.name}
              </h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">
                {activeAttendanceEvent.start_date} às {activeAttendanceEvent.start_time} - {activeAttendanceEvent.city}/{activeAttendanceEvent.uf}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveAttendanceEvent(null)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
          >
            <X size={18} />
            Fechar Chamada
          </button>
        </div>
        <Attendance athletes={athletes} eventId={activeAttendanceEvent.id} initialDate={activeAttendanceEvent.start_date} role={role} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">Eventos</h2>
          <p className="text-zinc-400 text-sm">Visualize os eventos e jogos do clube</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors"
          >
            <Plus size={18} />
            Novo Evento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        {events.map((event) => (
          <div key={event.id} className="bg-black border border-theme-primary/20 rounded-3xl p-6 hover:border-theme-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                <Calendar size={24} />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenLineup(event)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  <Users size={16} />
                  {isAdmin ? 'Gerenciar Subs' : 'Ver Subs'}
                </button>
                <button 
                  onClick={() => handleOpenScores(event)}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary text-sm font-bold rounded-xl transition-colors"
                >
                  <Trophy size={16} />
                  Resultados
                </button>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditEvent(event)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-colors"
                      title="Editar Detalhes do Evento"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const now = new Date();
                        const [year, month, day] = event.end_date.split('-').map(Number);
                        const [hours, minutes] = event.end_time.split(':').map(Number);
                        const eventEnd = new Date(year, month - 1, day, hours, minutes);
                        if (eventEnd < now && !isAdmin) {
                          toast.error("Não é possível excluir um evento que já finalizou.");
                          return;
                        }
                        handleDeleteEvent(event.id);
                      }}
                      className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl transition-colors"
                      title="Excluir Evento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase">{event.name}</h3>
            
            {eventScoresSummary[event.id] && eventScoresSummary[event.id].length > 0 && (
              <div className="mb-4 space-y-1">
                {eventScoresSummary[event.id].slice(0, 2).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 font-bold truncate max-w-[60px]">{m.team_a_name}</span>
                    <span className="text-theme-primary font-black">{m.score_a} x {m.score_b}</span>
                    <span className="text-zinc-500 font-bold truncate max-w-[60px]">{m.team_b_name}</span>
                  </div>
                ))}
                {eventScoresSummary[event.id].length > 2 && (
                  <p className="text-[8px] text-zinc-600 font-black uppercase text-center">+ {eventScoresSummary[event.id].length - 2} outros jogos</p>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-600" />
                {event.city}/{event.uf} - {event.neighborhood}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-600" />
                {event.start_date} às {event.start_time}
              </div>
              {lineupCounts[event.id] > 0 && (
                <div className="pt-3 border-t border-zinc-800/50 mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-theme-primary" />
                    <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">
                      {lineupCounts[event.id]} Atletas Escalados
                    </span>
                  </div>
                  {lineupSummaries[event.id] && (
                    <p className="text-[10px] text-zinc-500 line-clamp-1 italic">
                      {lineupSummaries[event.id].slice(0, 5).join(', ')}
                      {lineupSummaries[event.id].length > 5 ? '...' : ''}
                    </p>
                  )}
                </div>
              )}
              {isAdmin && (
                <button 
                  onClick={() => setActiveAttendanceEvent(event)}
                  className="w-full mt-4 py-3 bg-zinc-800 hover:bg-theme-primary hover:text-black text-white rounded-xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <CheckCircle2 size={16} />
                  Fazer Chamada
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => setActiveQRCodeEvent(event)}
                  className="w-full mt-2 py-3 bg-zinc-800 hover:bg-theme-primary hover:text-black text-white rounded-xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <QrCode size={16} />
                  QR Check-in
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => setActiveFlyerEvent(event)}
                  className="w-full mt-2 py-3 bg-zinc-800 hover:bg-theme-primary hover:text-black text-white rounded-xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <Instagram size={16} />
                  Gerar Encarte
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal */}
      {activeQRCodeEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-black border border-theme-primary/20 w-full max-w-md rounded-3xl shadow-2xl p-8 relative">
            <button 
              onClick={() => setActiveQRCodeEvent(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={24} />
            </button>
            <div className="text-center space-y-6">
              <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl">
                <QRCodeCanvas 
                  value={`${window.location.origin}/?checkin=true&eventId=${activeQRCodeEvent.id}`} 
                  size={256} 
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">QR Check-in</h3>
                <p className="text-theme-primary font-black uppercase tracking-widest text-sm mb-4 leading-none">
                  {activeQRCodeEvent.name}
                </p>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <AlertCircle size={14} className="text-theme-primary" />
                    <p className="font-bold uppercase tracking-widest leading-none">Como funciona?</p>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Apresente este QR Code para os atletas. Ao escanear, eles serão direcionados para o formulário de check-in oficial deste evento.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const canvas = document.querySelector('canvas');
                  if (canvas) {
                    const link = document.createElement('a');
                    link.download = `checkin-qr-${activeQRCodeEvent.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  }
                }}
                className="w-full py-4 bg-theme-primary text-black font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-tighter shadow-lg shadow-theme-primary/20"
              >
                Baixar QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Flyer Modal */}
      {activeFlyerEvent && (
        <EventFlyer 
          event={activeFlyerEvent}
          athletes={athletes}
          onClose={() => setActiveFlyerEvent(null)}
        />
      )}

      {/* Event Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black border border-theme-primary/20 w-full max-w-2xl rounded-3xl shadow-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">
                {formData.id ? 'Editar Evento' : 'Novo Evento'}
              </h2>
              <button 
                onClick={() => {
                  setIsFormOpen(false);
                  setFormData({ name: '', street: '', number: '', neighborhood: '', city: '', uf: '', start_date: '', end_date: '', start_time: '', end_time: '' });
                }} 
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Evento</label>
                  <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data Início</label>
                    <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Horário Início</label>
                    <input required type="time" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data Fim</label>
                    <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Horário Fim</label>
                    <input required type="time" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Rua</label>
                    <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nº</label>
                    <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                    <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                    <input type="text" maxLength={2} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase" value={formData.uf} onChange={e => setFormData({...formData, uf: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Link do Grupo WhatsApp (Comunicação)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" 
                    value={formData.whatsapp_group_id || ''} 
                    onChange={e => setFormData({...formData, whatsapp_group_id: e.target.value})} 
                    placeholder="https://chat.whatsapp.com/..."
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold italic">Facilita a comunicação com os atletas e comissão escalados.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20">Salvar Evento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lineup Modal */}
      {isLineupOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black border border-theme-primary/20 w-full max-w-5xl rounded-3xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 no-print">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white uppercase">
                  Evento: {selectedEvent.name}
                  {activeMatchId && eventMatches.find(m => m.id === activeMatchId) && (
                    <span className="ml-2 text-theme-primary block sm:inline text-sm">
                      — JOGO: {eventMatches.find(m => m.id === activeMatchId)?.team_a_name} VS {eventMatches.find(m => m.id === activeMatchId)?.team_b_name}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => {
                      setModalTab('lineup');
                      setActiveMatchId(null);
                      handleOpenLineup(selectedEvent, 0);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2",
                      modalTab === 'lineup' && !activeMatchId
                        ? "bg-theme-primary border-theme-primary text-black"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    <Users size={14} />
                    LISTAS GERAIS
                  </button>
                  <button
                    onClick={() => setModalTab('scores')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2",
                      modalTab === 'scores' || activeMatchId
                        ? "bg-theme-primary border-theme-primary text-black"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    <Trophy size={14} />
                    JOGOS E ESCALAÇÕES
                  </button>
                </div>
                {modalTab === 'lineup' && !activeMatchId && (
                  <div className="flex flex-wrap gap-1 items-end">
                    {/* Always show Index 0 or ones with data */}
                    {Array.from({ length: 40 }).map((_, i) => {
                       const hasData = lineupIndicesWithData[i] || i === 0 || i === activeLineupIndex;
                       if (!hasData) return null;
                       
                       return (
                        <button
                          key={i}
                          onClick={() => handleOpenLineup(selectedEvent, i)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black transition-all border flex flex-col items-center min-w-[70px] relative group",
                            activeLineupIndex === i 
                              ? "bg-theme-primary border-theme-primary text-black scale-105 z-10 shadow-lg shadow-theme-primary/20" 
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                          )}
                        >
                          <span className="truncate max-w-[100px]">{lineupIndicesWithNames[i] || `LISTA ${i + 1}`}</span>
                          {lineupIndicesWithData[i] && (
                            <span className={cn(
                              "text-[7px] uppercase mt-0.5 font-bold truncate max-w-[60px]",
                              activeLineupIndex === i ? "text-black/60" : "text-theme-primary"
                            )}>
                              {lineupIndicesWithData[i]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {isAdmin && !isEventFinished && (
                      <button
                        onClick={() => {
                          // Find next available index that doesn't have data
                          let nextIdx = 0;
                          while(lineupIndicesWithData[nextIdx]) {
                            nextIdx++;
                          }
                          // Also ensure it's not the current active if it was just cleared
                          if (nextIdx === activeLineupIndex && !lineupIndicesWithData[activeLineupIndex]) {
                             // This case is handled (staying on same index)
                          }
                          
                          setMaxLineupIndex(Math.max(nextIdx, maxLineupIndex));
                          handleOpenLineup(selectedEvent, nextIdx);
                        }}
                        className="px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 hover:border-theme-primary transition-all flex items-center gap-1 shadow-lg"
                        title="Adicionar Nova Lista"
                      >
                        <Plus size={16} />
                        <span className="text-[10px] font-black uppercase">Nova</span>
                      </button>
                    )}
                  </div>
                )}
                {isAdmin && !isEventFinished && modalTab === 'lineup' && !activeMatchId && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome da Lista:</label>
                      <input 
                        type="text" 
                        placeholder={lineupIndicesWithNames[activeLineupIndex] || `LISTA ${activeLineupIndex + 1}`}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-theme-primary uppercase font-bold"
                        value={lineupName}
                        onChange={(e) => setLineupName(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categorias Vinculadas:</label>
                      <div className="flex flex-wrap gap-1">
                        {categories.map(c => {
                          const isSelected = lineupCategory.split(',').includes(c);
                          return (
                            <button
                              key={c}
                              onClick={() => {
                                const activeCategories = lineupCategory ? lineupCategory.split(',') : [];
                                if (isSelected) {
                                  setLineupCategory(activeCategories.filter(cat => cat !== c).join(','));
                                } else {
                                  setLineupCategory([...activeCategories, c].join(','));
                                }
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-bold transition-all border",
                                isSelected 
                                  ? "bg-theme-primary border-theme-primary text-black" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                              )}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"><Printer size={20} /></button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={handleRemoveLineup}
                      className="p-2 bg-red-900/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20"
                      title="Excluir TODOS os dados desta lista (Atletas e Comissão)"
                    >
                      <Trash2 size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={handleSyncWhatsAppGroup}
                          disabled={isWhatsAppGroupLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-900/20 hover:bg-green-900/40 text-green-500 text-xs font-black rounded-xl transition-all border border-green-900/30"
                          title="Criar/Sincronizar Grupo do WhatsApp"
                        >
                          <MessageCircle size={16} />
                          {selectedEvent.whatsapp_group_id ? 'Sincronizar Grupo' : 'Criar Grupo Viagem'}
                        </button>
                        {selectedEvent.whatsapp_group_id && (
                          <button 
                            onClick={handleClearWhatsAppGroup}
                            disabled={isWhatsAppGroupLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 text-xs font-black rounded-xl transition-all border border-red-900/30"
                            title="Remover todos os membros do grupo"
                          >
                            <Trash2 size={16} />
                            Limpar Grupo
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  <button onClick={() => setIsLineupOpen(false)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
                    <X size={18} className="group-hover:rotate-90 transition-transform" />
                    <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
                  </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-print">
              {isEventFinished && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                  <AlertCircle size={20} />
                  <p className="text-sm font-bold uppercase tracking-widest">Este evento já foi finalizado. A escalação está bloqueada para edições.</p>
                </div>
              )}

              {modalTab === 'scores' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Gerenciamento de Jogos</h3>
                      <p className="text-[10px] text-zinc-500 font-medium">Adicione jogos, defina locais, datas e faça a escalação individual por jogo.</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingMatch({ 
                            team_a_name: settings?.schoolName || 'Minha Equipe', 
                            team_b_name: '', 
                            score_a: 0, 
                            score_b: 0, 
                            category: lineupCategory,
                            date: selectedEvent.start_date,
                            time: selectedEvent.start_time,
                            location: `${selectedEvent.street}, ${selectedEvent.number}`
                          });
                          setIsMatchFormOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black font-bold rounded-xl text-xs"
                      >
                        <Plus size={14} />
                        Adicionar Jogo
                      </button>
                    )}
                  </div>

                  {eventMatches.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-900/30 border border-zinc-800 rounded-[2rem]">
                      <Trophy size={48} className="mx-auto text-zinc-700 mb-4" />
                      <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Nenhum jogo registrado para este evento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {eventMatches.map(match => (
                        <div key={match.id} className={cn(
                          "bg-zinc-900/50 border p-6 rounded-[2rem] space-y-4 group relative transition-all",
                          activeMatchId === match.id ? "border-theme-primary ring-1 ring-theme-primary/20 bg-theme-primary/5" : "border-zinc-800"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">{match.category || 'Geral'}</span>
                              {activeMatchId === match.id && (
                                <span className="bg-theme-primary text-black text-[8px] font-black px-2 py-0.5 rounded-full">ESCALAÇÃO ATIVA</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <>
                                  <button onClick={() => { setEditingMatch(match); setIsMatchFormOpen(true); }} className="text-zinc-500 hover:text-white p-1"><Edit size={14} /></button>
                                  <button onClick={() => handleDeleteMatch(match.id)} className="text-zinc-500 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-around gap-4 text-center">
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Mandante</p>
                              <p className="font-black text-white uppercase text-sm truncate">{match.team_a_name}</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-zinc-800">
                                <span className="text-xl font-black text-white">{match.score_a}</span>
                                <span className="text-zinc-700 font-black text-xs">X</span>
                                <span className="text-xl font-black text-white">{match.score_b}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Visitante</p>
                              <p className="font-black text-white uppercase text-sm truncate">{match.team_b_name}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Calendar size={12} className="text-theme-primary" />
                              <span className="text-[10px] font-bold">{match.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                              <Clock size={12} className="text-theme-primary" />
                              <span className="text-[10px] font-bold">{match.time}</span>
                            </div>
                            {match.location && (
                              <div className="flex items-center gap-2 text-zinc-400 col-span-2">
                                <MapPin size={12} className="text-theme-primary" />
                                <span className="text-[10px] font-bold truncate">{match.location}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-4 flex gap-2">
                            <button
                              onClick={() => handleOpenLineup(selectedEvent, 0, match.id)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all border",
                                activeMatchId === match.id
                                  ? "bg-theme-primary border-theme-primary text-black"
                                  : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                              )}
                            >
                              <Users size={14} />
                              {activeMatchId === match.id ? 'GERENCIAR ESCALAÇÃO' : 'ESCALAR PARA ESTE JOGO'}
                            </button>
                            {isAdmin && (
                               <button
                               onClick={() => {
                                 setEditingMatch(match);
                                 setIsMatchFormOpen(true);
                               }}
                               className="px-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                               title="Editar Placar e Detalhes"
                             >
                               <Trophy size={14} />
                             </button>
                            )}
                          </div>

                          {match.observations && (
                            <p className="text-[10px] text-zinc-500 italic text-center pt-2">{match.observations}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Match Form Modal */}
                  {isMatchFormOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Detalhes do Jogo</h3>
                          <button onClick={() => setIsMatchFormOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSaveMatch} className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Categoria (ex: Sub-15)</label>
                              <input 
                                type="text" 
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-xs focus:ring-1 focus:ring-theme-primary"
                                value={editingMatch?.category || ''}
                                onChange={e => setEditingMatch({...editingMatch!, category: e.target.value})}
                                placeholder="Geral"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Data</label>
                              <input 
                                required
                                type="date" 
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-xs"
                                value={editingMatch?.date || ''}
                                onChange={e => setEditingMatch({...editingMatch!, date: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Horário</label>
                              <input 
                                required
                                type="time" 
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-xs"
                                value={editingMatch?.time || ''}
                                onChange={e => setEditingMatch({...editingMatch!, time: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Local</label>
                              <input 
                                type="text" 
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-xs focus:ring-1 focus:ring-theme-primary"
                                value={editingMatch?.location || ''}
                                onChange={e => setEditingMatch({...editingMatch!, location: e.target.value})}
                                placeholder="Nome do Campo / Ginásio"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-800/50">
                            <div className="space-y-4">
                              <div className="text-center">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Time Local</label>
                                <input 
                                  required
                                  type="text" 
                                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center font-black uppercase text-sm focus:ring-2 focus:ring-theme-primary"
                                  value={editingMatch?.team_a_name || ''}
                                  onChange={e => setEditingMatch({...editingMatch!, team_a_name: e.target.value})}
                                  placeholder="TIME A"
                                />
                              </div>
                              <div className="text-center">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Gols</label>
                                <input 
                                  required
                                  type="number" 
                                  min="0"
                                  className="w-full px-4 py-6 bg-zinc-800 border border-zinc-700 rounded-2xl text-white text-center font-black text-4xl focus:ring-2 focus:ring-theme-primary"
                                  value={editingMatch?.score_a ?? 0}
                                  onChange={e => setEditingMatch({...editingMatch!, score_a: parseInt(e.target.value) || 0})}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Quem marcou os gols?</label>
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-[10px]"
                                  value={editingMatch?.scorers_a || ''}
                                  onChange={e => setEditingMatch({...editingMatch!, scorers_a: e.target.value})}
                                  placeholder="Ex: João, Maria (2)"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="text-center">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Adversário</label>
                                <input 
                                  required
                                  type="text" 
                                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center font-black uppercase text-sm focus:ring-2 focus:ring-theme-primary"
                                  value={editingMatch?.team_b_name || ''}
                                  onChange={e => setEditingMatch({...editingMatch!, team_b_name: e.target.value})}
                                  placeholder="TIME B"
                                />
                              </div>
                              <div className="text-center">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Gols</label>
                                <input 
                                  required
                                  type="number" 
                                  min="0"
                                  className="w-full px-4 py-6 bg-zinc-800 border border-zinc-700 rounded-2xl text-white text-center font-black text-4xl focus:ring-2 focus:ring-theme-primary"
                                  value={editingMatch?.score_b ?? 0}
                                  onChange={e => setEditingMatch({...editingMatch!, score_b: parseInt(e.target.value) || 0})}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Quem marcou os gols?</label>
                                <input 
                                  type="text" 
                                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-[10px]"
                                  value={editingMatch?.scorers_b || ''}
                                  onChange={e => setEditingMatch({...editingMatch!, scorers_b: e.target.value})}
                                  placeholder="Ex: Pedro, Lucas"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Categoria</label>
                              <select 
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold text-xs"
                                value={editingMatch?.category || ''}
                                onChange={e => setEditingMatch({...editingMatch!, category: e.target.value})}
                              >
                                <option value="">Geral</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Data</label>
                              <input 
                                type="date" 
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold text-xs"
                                value={editingMatch?.date || ''}
                                onChange={e => setEditingMatch({...editingMatch!, date: e.target.value})}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Observações</label>
                            <textarea 
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-medium text-xs h-24 resize-none"
                              value={editingMatch?.observations || ''}
                              onChange={e => setEditingMatch({...editingMatch!, observations: e.target.value})}
                              placeholder="Detalhes da partida, artilheiros, etc..."
                            />
                          </div>

                          <button 
                            type="submit"
                            className="w-full py-4 bg-theme-primary text-black font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
                          >
                            Salvar Placar
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Summary Section */}
                  {(selectedAthletes.length > 0 || selectedStaff.length > 0) && (
                    <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] space-y-4">
                      <div className="flex items-center gap-2 text-theme-primary">
                        <Users size={18} />
                        <h3 className="text-sm font-black uppercase tracking-widest">Resumo do SUB</h3>
                      </div>
                      
                      {selectedStaff.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Comissão Técnica ({selectedStaff.length}/4):</p>
                          <p className="text-xs text-zinc-300 font-medium">
                            {professors.filter(p => selectedStaff.includes(p.id)).map(s => s.name).join(' • ')}
                          </p>
                        </div>
                      )}

                      {selectedAthletes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Atletas no SUB ({selectedAthletes.length}/22):</p>
                          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                            {athletes.filter(a => selectedAthletes.includes(a.id)).map(a => a.name).join(' • ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isAdmin && !isEventFinished ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Selection Area */}
                      <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Selecionar Atletas ({selectedAthletes.length}/22)</h3>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                <input 
                                  type="text"
                                  placeholder="PESQUISAR..."
                                  className="pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-theme-primary/50 uppercase font-bold"
                                  value={athleteSearch}
                                  onChange={(e) => setAthleteSearch(e.target.value)}
                                />
                              </div>
                              <select 
                                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none"
                                value={filterSub}
                                onChange={(e) => setFilterSub(e.target.value)}
                              >
                                <option value="Todos">Todas as Categorias</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredAthletes.map(a => (
                              <button
                                key={a.id}
                                onClick={() => toggleAthlete(a.id)}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                  selectedAthletes.includes(a.id) 
                                    ? "bg-theme-primary/10 border-theme-primary text-theme-primary" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                )}
                              >
                                <div className="w-10 h-10 bg-zinc-700 rounded-full overflow-hidden flex-shrink-0">
                                  {a.photo && a.photo.trim() !== "" ? (
                                    <img src={a.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                      <User size={20} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate text-sm uppercase">{a.name}</p>
                                  <p className="text-[10px] opacity-70">#{a.jersey_number} - {getSubCategory(a.birth_date)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-zinc-800">
                          <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Selecionar Comissão Técnica ({selectedStaff.length}/4)</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {professors.map(p => (
                              <button
                                key={p.id}
                                onClick={() => toggleStaff(p.id)}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                  selectedStaff.includes(p.id) 
                                    ? "bg-theme-primary/10 border-theme-primary text-theme-primary" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                )}
                              >
                                <div className="w-10 h-10 bg-zinc-700 rounded-full overflow-hidden flex-shrink-0">
                                  {p.photo && p.photo.trim() !== "" ? (
                                    <img src={p.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                      <User size={20} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate text-sm uppercase">{p.name}</p>
                                  <p className="text-[10px] opacity-70">{p.doc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Confirmation Area */}
                      <div className="space-y-6 lg:border-l lg:border-zinc-800 lg:pl-8 pt-8 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Confirmação</h3>
                            <div className="flex gap-2">
                              <button 
                                onClick={handleNotifyAllLineup}
                                className="p-1 px-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 flex items-center gap-1 text-[8px] font-bold uppercase transition-all"
                                title="Notificar todos por WhatsApp"
                              >
                                <MessageCircle size={10} />
                                Notificar Todos
                              </button>
                              <button 
                                onClick={() => {
                                  setManualReceiptData({ 
                                    name: '', 
                                    event: selectedEvent?.name || '', 
                                    date: selectedEvent?.start_date || '' 
                                  });
                                  setIsManualReceiptModalOpen(true);
                                }}
                                className="p-1 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center gap-1 text-[8px] font-bold uppercase transition-all"
                                title="Gerar comprovante avulso"
                              >
                                <Plus size={10} />
                                Avulso
                              </button>
                            </div>
                          </div>
                          
                          {/* Athlete Selection Counter Badge */}
                          <div className="bg-theme-primary/10 border border-theme-primary/30 p-2 px-3 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-black text-theme-primary uppercase">Total Escalados:</span>
                            <span className="text-sm font-black text-white">{selectedAthletes.length + selectedStaff.length}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {(selectedAthletes.length === 0 && selectedStaff.length === 0) ? (
                            <p className="text-zinc-500 text-xs italic">Selecione atletas e comissão para gerenciar confirmações.</p>
                          ) : (
                            <>
                              {selectedStaff.map(sid => {
                                const s = professors.find(p => p.id === sid);
                                if (!s) return null;
                                const savedStaff = lineupStaff.find(ls => ls.id === sid);
                                return (
                                  <div key={s.id} className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-zinc-700 rounded-full overflow-hidden">
                                        {s.photo && s.photo.trim() !== "" ? (
                                          <img src={s.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                            <User size={16} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="font-bold truncate text-xs uppercase">{s.name}</p>
                                          {s.phone && (
                                            <a 
                                              href={`https://wa.me/55${s.phone.replace(/\D/g, '')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-500 hover:text-green-400 transition-colors"
                                              title="Conversar no WhatsApp"
                                            >
                                              <MessageCircle size={12} />
                                            </a>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-theme-primary font-bold">COMISSÃO</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      {savedStaff ? (
                                        <div className="flex-1 flex gap-1">
                                          <div className="flex-1 flex flex-col gap-1">
                                            <div className="flex gap-1">
                                              <button 
                                                onClick={() => handleConfirmAthlete(s.id, 'staff', 'Confirmado')}
                                                className={cn(
                                                  "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                  savedStaff.confirmation === 'Confirmado' ? "bg-green-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                                )}
                                              >
                                                Sim
                                              </button>
                                              <button 
                                                onClick={() => handleConfirmAthlete(s.id, 'staff', 'Recusado')}
                                                className={cn(
                                                  "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                  savedStaff.confirmation === 'Recusado' ? "bg-red-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                                )}
                                              >
                                                Não
                                              </button>
                                            </div>
                                          </div>
                                          <button 
                                            onClick={() => handleGenerateReceiptPDF({
                                              name: s.name,
                                              event: selectedEvent?.name || '',
                                              date: selectedEvent?.start_date || '',
                                              type: 'Comissão Técnica'
                                            })}
                                            className="p-2 rounded-lg bg-zinc-800 text-zinc-500 hover:text-theme-primary hover:bg-zinc-700 transition-all flex items-center justify-center flex-shrink-0"
                                            title="Gerar Comprovante PDF"
                                          >
                                            <FileText size={14} />
                                          </button>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-zinc-500 italic">Salve para gerenciar confirmação</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {selectedAthletes.map(aid => {
                                const a = athletes.find(ath => ath.id === aid);
                                if (!a) return null;
                                const savedAthlete = lineupAthletes.find(la => la.id === aid);
                                return (
                                  <div key={a.id} className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-zinc-700 rounded-full overflow-hidden">
                                        {a.photo && a.photo.trim() !== "" ? (
                                          <img src={a.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                            <User size={16} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate text-xs uppercase">{a.name}</p>
                                        <p className="text-[10px] text-zinc-500">#{a.jersey_number}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      {savedAthlete ? (
                                        <div className="flex-1 flex min-w-0">
                                          <button 
                                            onClick={() => {
                                              const phone = (a as any).contact || (a as any).phone || '';
                                              const msg = encodeURIComponent(`Olá ${a.name}! Você foi escalado para o evento *${selectedEvent?.name}*. Por favor, confirme sua presença no portal: ${window.location.origin}`);
                                              window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                            }}
                                            className="p-1.5 mr-1 rounded-lg bg-zinc-900 border border-zinc-800 text-green-500 hover:bg-green-500/10 transition-all flex items-center justify-center flex-shrink-0"
                                            title="Notificar por WhatsApp"
                                          >
                                            <MessageCircle size={14} />
                                          </button>
                                          <div className="flex-1 flex flex-col gap-1">
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={() => handleUpdateAthleteStatus(a.id, 'Titular')}
                                              className={cn(
                                                "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                                (savedAthlete as any).lineup_status === 'Titular' ? "bg-theme-primary text-black" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-700"
                                              )}
                                            >
                                              Titular
                                            </button>
                                            <button 
                                              onClick={() => handleUpdateAthleteStatus(a.id, 'Reserva')}
                                              className={cn(
                                                "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                                (savedAthlete as any).lineup_status === 'Reserva' ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-700"
                                              )}
                                            >
                                              Reserva
                                            </button>
                                          </div>
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={() => handleConfirmAthlete(a.id, 'athlete', 'Confirmado')}
                                              className={cn(
                                                "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                savedAthlete.confirmation === 'Confirmado' ? "bg-green-500 text-black" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-700"
                                              )}
                                            >
                                              Confirmar
                                            </button>
                                            <button 
                                              onClick={() => handleConfirmAthlete(a.id, 'athlete', 'Recusado')}
                                              className={cn(
                                                "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                savedAthlete.confirmation === 'Recusado' ? "bg-red-500 text-black" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-700"
                                              )}
                                            >
                                              Recusar
                                            </button>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => handleGenerateReceiptPDF({
                                            name: a.name,
                                            event: selectedEvent?.name || '',
                                            date: selectedEvent?.start_date || '',
                                            type: `Atleta (${(savedAthlete as any).lineup_status || 'Não definido'})`
                                          })}
                                          className="p-2 ml-1 rounded-lg bg-zinc-900 text-zinc-500 hover:text-theme-primary hover:bg-zinc-700 transition-all flex items-center justify-center flex-shrink-0"
                                          title="Gerar Comprovante PDF"
                                        >
                                          <FileText size={14} />
                                        </button>
                                      </div>
                                      ) : (
                                        <p className="text-[10px] text-zinc-500 italic">Salve para gerenciar confirmação</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lineupStaff.map(s => {
                          const isSelf = loggedInUserId === s.id;
                          return (
                            <div key={s.id} className={cn(
                              "bg-zinc-800/50 border p-4 rounded-2xl flex flex-col gap-4",
                              isSelf ? "border-theme-primary ring-1 ring-theme-primary/20" : "border-zinc-800"
                            )}>
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-zinc-700 rounded-full overflow-hidden">
                                  {s.photo && s.photo.trim() !== "" ? (
                                    <img src={s.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                      <User size={24} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-white uppercase">{s.name}</p>
                                    {isSelf && <span className="bg-theme-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase">VOCÊ</span>}
                                  </div>
                                  <p className="text-[10px] text-theme-primary font-bold uppercase tracking-widest">Comissão Técnica</p>
                                </div>
                              </div>
                              <div className="pt-3 border-t border-zinc-700 flex items-center justify-between">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  s.confirmation === 'Confirmado' ? "text-green-500" : s.confirmation === 'Recusado' ? "text-red-500" : "text-zinc-500"
                                )}>
                                  Status: {s.confirmation || 'Pendente'}
                                </span>
                                {isSelf && s.confirmation === 'Pendente' && (
                                   <div className="flex gap-2">
                                     <button 
                                       onClick={() => handleConfirmAthlete(s.id, 'staff', 'Confirmado')}
                                       className="px-3 py-1 bg-green-500 text-black text-[10px] font-black rounded-lg uppercase"
                                     >Confirmar</button>
                                     <button 
                                       onClick={() => handleConfirmAthlete(s.id, 'staff', 'Recusado')}
                                       className="px-3 py-1 bg-red-500 text-black text-[10px] font-black rounded-lg uppercase"
                                     >Recusar</button>
                                   </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {lineupAthletes.map(a => {
                          const isSelf = loggedInUserId === a.id;
                          return (
                            <div key={a.id} className={cn(
                              "bg-zinc-800/50 border p-4 rounded-2xl flex flex-col gap-4",
                              isSelf ? "border-theme-primary ring-1 ring-theme-primary/20" : "border-zinc-800"
                            )}>
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-zinc-700 rounded-full overflow-hidden">
                                  {a.photo && a.photo.trim() !== "" ? (
                                    <img src={a.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                      <User size={24} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-white uppercase">{a.name}</p>
                                    {isSelf && <span className="bg-theme-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase">VOCÊ</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">#{a.jersey_number} - {getSubCategory(a.birth_date)}</p>
                                    {(a as any).lineup_status && (
                                      <span className={cn(
                                        "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                                        (a as any).lineup_status === 'Titular' ? "bg-theme-primary/20 text-theme-primary" : "bg-zinc-700 text-zinc-400"
                                      )}>
                                        {(a as any).lineup_status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="pt-3 border-t border-zinc-700 flex items-center justify-between">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  a.confirmation === 'Confirmado' ? "text-green-500" : a.confirmation === 'Recusado' ? "text-red-500" : "text-zinc-500"
                                )}>
                                  Status: {a.confirmation || 'Pendente'}
                                </span>
                                {isSelf && a.confirmation === 'Pendente' && (
                                   <div className="flex gap-2">
                                     <button 
                                       onClick={() => handleConfirmAthlete(a.id, 'athlete', 'Confirmado')}
                                       className="px-3 py-1 bg-green-500 text-black text-[10px] font-black rounded-lg uppercase"
                                     >Confirmar</button>
                                     <button 
                                       onClick={() => handleConfirmAthlete(a.id, 'athlete', 'Recusado')}
                                       className="px-3 py-1 bg-red-500 text-black text-[10px] font-black rounded-lg uppercase"
                                     >Recusar</button>
                                   </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-between items-center no-print">
              {isAdmin && <p className="text-xs text-zinc-500 italic">Dica: Salve a escalação antes de gerenciar as confirmações.</p>}
              <div className="flex gap-3 ml-auto">
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
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl hover:bg-zinc-100 transition-all font-bold"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button onClick={() => setIsLineupOpen(false)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Fechar</button>
                {isAdmin && !isEventFinished && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleResetLineup}
                      className="px-6 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl font-black transition-all border border-red-900/30 flex items-center gap-2 text-xs uppercase"
                    >
                      <Trash2 size={16} />
                      Limpar
                    </button>
                    <button 
                      onClick={handleSaveLineup} 
                      disabled={isSavingLineup}
                      className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingLineup ? <span className="animate-pulse">Salvando...</span> : <><Save size={20} /> Salvar SUB</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Save Template Modal */}
            {isSaveTemplateOpen && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4 uppercase">Salvar como Modelo</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome do Modelo</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-bold text-sm"
                        placeholder="EX: TIME PRINCIPAL SUB-15"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsSaveTemplateOpen(false)}
                        className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveAsTemplate}
                        className="flex-1 px-4 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Load Template Modal */}
            {isLoadTemplateOpen && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white uppercase">Carregar Modelo</h3>
                    <button onClick={() => setIsLoadTemplateOpen(false)} className="text-zinc-500 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {namedLineups.length === 0 ? (
                      <p className="text-zinc-500 text-center py-8 italic text-sm">Nenhum modelo salvo encontrado.</p>
                    ) : (
                      namedLineups.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleLoadTemplate(template)}
                          className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl transition-all text-left group"
                        >
                          <div>
                            <p className="font-bold text-white uppercase text-sm">{template.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">
                              {template.athlete_ids?.length || 0} Atletas • {template.staff_ids?.length || 0} Comissão
                            </p>
                          </div>
                          <ChevronRight size={18} className="text-zinc-600 group-hover:text-theme-primary transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={() => setIsLoadTemplateOpen(false)}
                    className="mt-6 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* Print View */}
            <div className="hidden print-only p-6 text-black bg-white min-h-screen" ref={lineupRef}>
              <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                <div className="flex items-center gap-4">
                  {settings?.schoolCrest && settings.schoolCrest.trim() !== "" ? (
                    <img src={settings.schoolCrest} alt="Crest" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                  ) : null}
                  <div className="text-left">
                    <h1 className="text-xl font-black uppercase leading-tight">Piruá Esporte Clube</h1>
                    <h2 className="text-sm font-bold uppercase text-zinc-600">Folha de SUB Oficial - {activeLineupIndex + 1}</h2>
                    {lineupCategory && <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Categorias: {lineupCategory}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-zinc-500">Data e Horário:</p>
                  <p className="text-sm font-bold">{selectedEvent.start_date} às {selectedEvent.start_time}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="font-black uppercase text-[10px] text-zinc-500">Evento:</p>
                <p className="text-lg font-bold uppercase leading-tight">{selectedEvent.name}</p>
                <p className="text-xs text-zinc-600">{selectedEvent.city}/{selectedEvent.uf} - {selectedEvent.neighborhood}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-black uppercase mb-1 border-b border-black pb-0.5">Comissão Técnica</h3>
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-zinc-100">
                        <th className="border border-black p-1 text-center w-8">Nº</th>
                        <th className="border border-black p-1 text-left">Nome Completo</th>
                        <th className="border border-black p-1 text-center w-24">Nasc.</th>
                        <th className="border border-black p-1 text-center w-32">RG/CPF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineupStaff.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="border border-black p-1 text-center">{idx + 1}</td>
                          <td className="border border-black p-1 font-bold uppercase">{s.name}</td>
                          <td className="border border-black p-1 text-center">{s.birth_date}</td>
                          <td className="border border-black p-1 text-center">{s.doc}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 3 - lineupStaff.length) }).map((_, i) => (
                        <tr key={`empty-staff-${i}`} className="h-6">
                          <td className="border border-black p-1 text-center">{lineupStaff.length + i + 1}</td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase mb-1 border-b border-black pb-0.5">Atletas Escalados</h3>
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-zinc-100">
                        <th className="border border-black p-1 text-center w-8">Nº</th>
                        <th className="border border-black p-1 text-left">Nome Completo</th>
                        <th className="border border-black p-1 text-center w-24">Nasc.</th>
                        <th className="border border-black p-1 text-center w-32">RG/CPF</th>
                        <th className="border border-black p-1 text-center w-16">Uniforme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineupAthletes.map((a, idx) => (
                        <tr key={a.id}>
                          <td className="border border-black p-1 text-center">{idx + 1}</td>
                          <td className="border border-black p-1 font-bold uppercase">{a.name}</td>
                          <td className="border border-black p-1 text-center">{a.birth_date}</td>
                          <td className="border border-black p-1 text-center">{a.doc}</td>
                          <td className="border border-black p-1 text-center font-bold">#{a.jersey_number}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 22 - lineupAthletes.length) }).map((_, i) => (
                        <tr key={`empty-athlete-${i}`} className="h-6">
                          <td className="border border-black p-1 text-center">{lineupAthletes.length + i + 1}</td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-t border-black pt-1 font-bold uppercase text-[8px]">Assinatura do Responsável Técnico</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black pt-1 font-bold uppercase text-[8px]">Assinatura da Diretoria</div>
                </div>
              </div>
              <div className="mt-4 text-[8px] text-zinc-400 text-center uppercase tracking-widest">
                Documento gerado eletronicamente pelo Sistema de Gestão Piruá E.C.
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-black border border-red-900/30 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Excluir Evento</h3>
            <p className="text-zinc-400 mb-8">Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteEvent}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Batch Modal */}
      {isNotificationModalOpen && notificationBatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Enviar Notificações</h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Clique nos nomes para enviar via WhatsApp</p>
              </div>
              <button 
                onClick={() => setIsNotificationModalOpen(false)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700 mb-6">
                <p className="text-[10px] font-black text-theme-primary uppercase mb-2">Mensagem a ser enviada:</p>
                <p className="text-xs text-zinc-300 italic whitespace-pre-wrap">{notificationBatch.message}</p>
              </div>
              
              {notificationBatch.recipients.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const msg = encodeURIComponent(notificationBatch.message);
                    window.open(`https://wa.me/55${r.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                  }}
                  className="w-full p-4 bg-zinc-800 hover:bg-theme-primary/10 border border-zinc-700 hover:border-theme-primary/30 rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="text-left">
                    <p className="font-bold text-white group-hover:text-theme-primary transition-colors uppercase text-sm">{r.name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">{r.type} • {r.phone}</p>
                  </div>
                  <MessageCircle className="text-green-500 group-hover:scale-125 transition-transform" />
                </button>
              ))}
            </div>
            
            <div className="p-6 border-t border-zinc-800 bg-black/20">
              <button 
                onClick={() => setIsNotificationModalOpen(false)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl uppercase text-xs tracking-widest transition-all"
              >
                Concluir Notificações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Receipt Modal */}
      {isManualReceiptModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Comprovante Avulso</h3>
              <button onClick={() => setIsManualReceiptModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome do Atleta/Membro:</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold uppercase"
                  value={manualReceiptData.name}
                  onChange={e => setManualReceiptData({...manualReceiptData, name: e.target.value})}
                  placeholder="Ex: JOÃO SILVA"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Evento:</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold uppercase"
                  value={manualReceiptData.event}
                  onChange={e => setManualReceiptData({...manualReceiptData, event: e.target.value})}
                  placeholder="Ex: CAMPEONATO REGIONAL"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data:</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold uppercase"
                  value={manualReceiptData.date}
                  onChange={e => setManualReceiptData({...manualReceiptData, date: e.target.value})}
                  placeholder="Ex: 01/01/2026"
                />
              </div>

              <button 
                onClick={() => {
                  handleGenerateReceiptPDF(manualReceiptData);
                  setIsManualReceiptModalOpen(false);
                }}
                disabled={!manualReceiptData.name || !manualReceiptData.event || !manualReceiptData.date || isGeneratingReceipt}
                className="w-full py-4 bg-theme-primary text-black font-black uppercase text-sm rounded-2xl shadow-lg shadow-theme-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                <FileText size={18} />
                {isGeneratingReceipt ? 'Gerando...' : 'Gerar PDF agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Lineup Confirmation Modal */}
      {showLineupResetConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Limpar Escalação?</h3>
              <p className="text-zinc-400 text-sm font-medium">Esta ação irá remover todos os atletas e comissão técnica selecionados localmente.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowLineupResetConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all uppercase text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmResetLineup}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all uppercase text-xs shadow-lg shadow-red-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
