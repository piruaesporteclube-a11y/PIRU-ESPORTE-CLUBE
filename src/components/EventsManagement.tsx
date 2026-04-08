import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event, Athlete, Professor, getSubCategory, categories } from '../types';
import { Calendar, Plus, MapPin, Clock, Users, User, Save, Printer, X, ChevronRight, Trash2, MessageCircle, Search, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import { cn, fixHtml2CanvasColors } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';

interface EventsManagementProps {
  athletes?: Athlete[];
  events?: Event[];
  role?: 'admin' | 'student';
}

export default function EventsManagement({ athletes: athletesProp, events: eventsProp, role = 'admin' }: EventsManagementProps) {
  const { settings } = useTheme();
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const isAdmin = role === 'admin';
  const [events, setEvents] = useState<Event[]>(eventsProp || []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLineupOpen, setIsLineupOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeLineupIndex, setActiveLineupIndex] = useState(0);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [lineupAthletes, setLineupAthletes] = useState<Athlete[]>([]);
  const [lineupStaff, setLineupStaff] = useState<Professor[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [filterSub, setFilterSub] = useState('Todos');
  const [athleteSearch, setAthleteSearch] = useState('');

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
  }, [athletesProp, eventsProp]);

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

  const handleDownloadPDF = async () => {
    if (!lineupRef.current || !selectedEvent) return;
    
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF da escalação...');
    
    let container: HTMLDivElement | null = null;
    try {
      // Ensure images are loaded before capturing
      const images = lineupRef.current.getElementsByTagName('img');
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

      const clone = lineupRef.current.cloneNode(true) as HTMLElement;
      
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
      clone.classList.remove('hidden'); // Ensure it's visible for capture

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

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
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
      pdf.save(`escalacao_${selectedEvent.name.replace(/\s+/g, '_')}_lista_${activeLineupIndex + 1}.pdf`);
      
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveEvent(formData);
      toast.success("Evento salvo com sucesso!");
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

  const handleOpenLineup = async (event: Event, index: number = 0) => {
    try {
      setSelectedEvent(event);
      setActiveLineupIndex(index);
      const { athletes: lineup, staff } = await api.getLineup(event.id, index);
      setLineupAthletes(lineup);
      setLineupStaff(staff);
      setSelectedAthletes(lineup.map(a => a.id));
      setSelectedStaff(staff.map(s => s.id));
      setIsLineupOpen(true);
    } catch (err: any) {
      toast.error(`Erro ao carregar escalação: ${err.message}`);
    }
  };

  const handleConfirmAthlete = async (athleteId: string, type: 'athlete' | 'staff', status: string) => {
    if (selectedEvent) {
      try {
        await api.confirmLineup(selectedEvent.id, athleteId, type, status, activeLineupIndex);
        const { athletes: updatedLineup, staff: updatedStaff } = await api.getLineup(selectedEvent.id, activeLineupIndex);
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
    } else if (selectedStaff.length < 3) {
      setSelectedStaff([...selectedStaff, id]);
    } else {
      toast.warning('Limite máximo de 3 membros da comissão atingido.');
    }
  };

  const handleSaveLineup = async () => {
    if (selectedEvent) {
      try {
        await api.saveLineup(selectedEvent.id, selectedAthletes, selectedStaff, activeLineupIndex);
        const { athletes: updatedLineup, staff: updatedStaff } = await api.getLineup(selectedEvent.id, activeLineupIndex);
        setLineupAthletes(updatedLineup);
        setLineupStaff(updatedStaff);
        toast.success('Escalação salva com sucesso!');
      } catch (err: any) {
        toast.error(`Erro ao salvar escalação: ${err.message}`);
      }
    }
  };

  const filteredAthletes = athletes.filter(a => 
    (filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub) && 
    a.status === 'Ativo' &&
    (a.name.toLowerCase().includes(athleteSearch.toLowerCase()) || 
     (a.nickname && a.nickname.toLowerCase().includes(athleteSearch.toLowerCase())) ||
     a.doc.includes(athleteSearch))
  );

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
                  {isAdmin ? 'Escalação' : 'Ver Escalação'}
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl transition-colors"
                    title="Excluir Evento"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase">{event.name}</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-600" />
                {event.city}/{event.uf} - {event.neighborhood}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-600" />
                {event.start_date} às {event.start_time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black border border-theme-primary/20 w-full max-w-2xl rounded-3xl shadow-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Novo Evento</h2>
              <button onClick={() => setIsFormOpen(false)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
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
                <h2 className="text-xl font-bold text-white uppercase">Escalação: {selectedEvent.name}</h2>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleOpenLineup(selectedEvent, i)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black transition-all border",
                        activeLineupIndex === i 
                          ? "bg-theme-primary border-theme-primary text-black" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      LISTA {i + 1}
                    </button>
                  ))}
                </div>
                {isAdmin && <p className="text-xs text-zinc-500">Selecione até 22 atletas ({selectedAthletes.length}/22) para a LISTA {activeLineupIndex + 1}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"><Printer size={20} /></button>
                <button onClick={() => setIsLineupOpen(false)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
                  <X size={18} className="group-hover:rotate-90 transition-transform" />
                  <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-print">
              {isAdmin ? (
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
                      <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Selecionar Comissão Técnica ({selectedStaff.length}/3)</h3>
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
                    <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Confirmação</h3>
                    <div className="space-y-4">
                      {(lineupAthletes.length === 0 && lineupStaff.length === 0) ? (
                        <p className="text-zinc-500 text-xs italic">Salve a escalação para gerenciar as confirmações.</p>
                      ) : (
                        <>
                          {lineupStaff.map(s => (
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
                                    {s.phone && s.phone.replace(/\D/g, '') && (
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
                                <div className="flex-1 flex flex-col gap-1">
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleConfirmAthlete(s.id, 'staff', 'Confirmado')}
                                      className={cn(
                                        "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                        s.confirmation === 'Confirmado' ? "bg-green-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                      )}
                                    >
                                      Sim
                                    </button>
                                    <button 
                                      onClick={() => handleConfirmAthlete(s.id, 'staff', 'Recusado')}
                                      className={cn(
                                        "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                        s.confirmation === 'Recusado' ? "bg-red-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                      )}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {lineupAthletes.map(a => (
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
                                <div className="flex-1 flex flex-col gap-1">
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleConfirmAthlete(a.id, 'athlete', 'Confirmado')}
                                      className={cn(
                                        "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                        a.confirmation === 'Confirmado' ? "bg-green-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                      )}
                                    >
                                      Sim
                                    </button>
                                    <button 
                                      onClick={() => handleConfirmAthlete(a.id, 'athlete', 'Recusado')}
                                      className={cn(
                                        "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                        a.confirmation === 'Recusado' ? "bg-red-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                      )}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lineupStaff.map(s => (
                      <div key={s.id} className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-700 rounded-full overflow-hidden">
                          {s.photo && s.photo.trim() !== "" ? (
                            <img src={s.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase">{s.name}</p>
                          <p className="text-[10px] text-theme-primary font-bold uppercase tracking-widest">Comissão Técnica</p>
                        </div>
                      </div>
                    ))}
                    {lineupAthletes.map(a => (
                      <div key={a.id} className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-700 rounded-full overflow-hidden">
                          {a.photo && a.photo.trim() !== "" ? (
                            <img src={a.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase">{a.name}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">#{a.jersey_number} - {getSubCategory(a.birth_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                {isAdmin && (
                  <button onClick={handleSaveLineup} className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2">
                    <Save size={20} />
                    Salvar Escalação
                  </button>
                )}
              </div>
            </div>

            {/* Print View */}
            <div className="hidden print-only p-6 text-black bg-white min-h-screen" ref={lineupRef}>
              <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                <div className="flex items-center gap-4">
                  {settings?.schoolCrest && settings.schoolCrest.trim() !== "" ? (
                    <img src={settings.schoolCrest} alt="Crest" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                  ) : null}
                  <div className="text-left">
                    <h1 className="text-xl font-black uppercase leading-tight">Piruá Esporte Clube</h1>
                    <h2 className="text-sm font-bold uppercase text-zinc-600">Folha de Escalação Oficial - LISTA {activeLineupIndex + 1}</h2>
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
    </div>
  );
}
