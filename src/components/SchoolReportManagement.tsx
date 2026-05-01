import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../api';
import { SchoolReport, User, Athlete } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn, compressImage } from '../utils';

interface SchoolReportManagementProps {
  user: User;
  athletes: Athlete[];
}

export default function SchoolReportManagement({ user, athletes }: SchoolReportManagementProps) {
  const [reports, setReports] = useState<SchoolReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<SchoolReport> | null>(null);
  const [selectedReport, setSelectedReport] = useState<SchoolReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getSchoolReports();
      if (isAdmin) {
        setReports(data);
      } else if (user.athlete_id) {
        setReports(data.filter(r => r.athlete_id === user.athlete_id));
      } else {
        setReports([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar boletins');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport?.report_card_image) {
      toast.error('A foto do boletim é obrigatória');
      return;
    }

    try {
      const athleteId = isAdmin ? editingReport.athlete_id : user.athlete_id;
      const currentAthlete = athletes.find(a => a.id === athleteId);
      
      const newReport: Partial<SchoolReport> = {
        ...editingReport,
        athlete_id: athleteId,
        athlete_name: currentAthlete?.name || 'Atleta não identificado',
        category: currentAthlete ? (currentAthlete as any).category || '' : '',
        status: editingReport.status || 'Pendente',
      };

      await api.saveSchoolReport(newReport);
      toast.success('Boletim enviado com sucesso!');
      setIsFormOpen(false);
      setEditingReport(null);
      loadReports();
    } catch (error) {
      toast.error('Erro ao salvar boletim');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir este boletim?')) return;
    try {
      await api.deleteSchoolReport(id);
      toast.success('Boletim excluído');
      loadReports();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleStatusUpdate = async (report: SchoolReport, status: "Visto" | "Recusado") => {
    try {
      await api.saveSchoolReport({ ...report, status });
      toast.success(`Boletim marcado como ${status}`);
      loadReports();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = r.athlete_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.period.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Boletins Escolares</h2>
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
            {isAdmin ? 'Gerenciamento de notas escolares dos atletas' : 'Acompanhamento do seu rendimento escolar'}
          </p>
        </div>
        
        {!isAdmin && (
          <button 
            onClick={() => {
              setEditingReport({
                period: '',
                year: new Date().getFullYear(),
                status: 'Pendente'
              });
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
          >
            <Plus size={18} />
            Enviar Boletim
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-3xl">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text"
              placeholder="Buscar por atleta ou período..."
              className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-zinc-300 focus:border-theme-primary outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-2xl px-4 py-2">
            <Filter className="text-zinc-500 w-4 h-4" />
            <select 
              className="bg-transparent text-xs font-black text-zinc-400 uppercase tracking-widest outline-none cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Visto">Vistos</option>
              <option value="Recusado">Recusados</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
            <FileText className="text-zinc-600 w-8 h-8" />
          </div>
          <p className="text-zinc-400 font-black uppercase tracking-widest text-sm">
            Nenhum boletim encontrado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <motion.div 
              layout
              key={report.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-theme-primary/30 transition-all flex flex-col h-full"
            >
              <div className="aspect-[4/3] relative bg-zinc-800 group-hover:opacity-90 transition-opacity flex items-center justify-center overflow-hidden">
                {report.report_card_image ? (
                  <img 
                    src={report.report_card_image} 
                    alt={report.period} 
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => window.open(report.report_card_image, '_blank')}
                  />
                ) : (
                  <FileText className="text-zinc-700 w-12 h-12" />
                )}
                <div className="absolute top-4 right-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                    report.status === 'Pendente' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                    report.status === 'Visto' && "bg-green-500/10 text-green-500 border-green-500/20",
                    report.status === 'Recusado' && "bg-red-500/10 text-red-500 border-red-500/20"
                  )}>
                    {report.status}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{report.period}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{report.year}</span>
                    {isAdmin && (
                      <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest truncate max-w-[150px]">
                        • {report.athlete_name}
                      </span>
                    )}
                  </div>
                </div>

                {report.observations && (
                  <div className="mb-4 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <p className="text-[10px] text-zinc-400 italic font-medium leading-relaxed">"{report.observations}"</p>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                  {isAdmin ? (
                    <>
                      <div className="flex gap-2 flex-1">
                        <button 
                          onClick={() => {
                            setSelectedReport(report);
                            setIsReviewModalOpen(true);
                          }}
                          className="flex-1 py-3 bg-theme-primary/10 hover:bg-theme-primary text-theme-primary hover:text-black rounded-xl font-black text-[8px] uppercase tracking-widest transition-all border border-theme-primary/20 flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={12} />
                          Revisar
                        </button>
                      </div>
                      <button 
                         onClick={() => handleDelete(report.id)}
                         className="p-3 bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all border border-zinc-700 hover:border-red-500/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    report.status === 'Pendente' && (
                      <button 
                        onClick={() => handleDelete(report.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all border border-zinc-700"
                      >
                        <Trash2 size={12} />
                        Remover
                      </button>
                    )
                  )}
                  <button 
                    onClick={() => window.open(report.report_card_image, '_blank')}
                    className="p-3 bg-zinc-800 text-zinc-400 hover:text-theme-primary rounded-xl transition-all border border-zinc-700 ml-auto"
                    title="Ver Foto"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-2xl"
            >
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
                type="button"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Enviar Boletim</h3>
                  <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">Siga as instruções para o envio</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Ano Letivo</label>
                    <input 
                      required
                      type="number"
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-theme-primary outline-none transition-all font-bold"
                      value={editingReport?.year}
                      onChange={e => setEditingReport({ ...editingReport, year: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Período</label>
                    <select 
                      required
                      className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-theme-primary outline-none transition-all font-bold"
                      value={editingReport?.period}
                      onChange={e => setEditingReport({ ...editingReport, period: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      <option value="1º Bimestre">1º Bimestre</option>
                      <option value="2º Bimestre">2º Bimestre</option>
                      <option value="3º Bimestre">3º Bimestre</option>
                      <option value="4º Bimestre">4º Bimestre</option>
                      <option value="Anual">Fechamento Anual</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Foto do Boletim</label>
                  <label className="flex flex-col items-center justify-center w-full h-48 bg-black border-2 border-dashed border-zinc-800 rounded-[2rem] cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative">
                    {editingReport?.report_card_image ? (
                      <>
                        <img src={editingReport.report_card_image} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Clique para trocar</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-zinc-600 mb-3" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Clique ou arraste a imagem</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result as string, 1000, 1000, 0.7);
                            setEditingReport({ ...editingReport, report_card_image: compressed });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Observações (Opcional)</label>
                  <textarea 
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-theme-primary outline-none transition-all resize-none h-24 text-sm font-medium"
                    placeholder="Algum comentário para a secretaria?"
                    value={editingReport?.observations}
                    onChange={e => setEditingReport({ ...editingReport, observations: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-theme-primary text-black font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-theme-primary/20 hover:opacity-90 active:scale-95"
                  >
                    Enviar Agora
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Revisão Admin */}
      <AnimatePresence>
        {isReviewModalOpen && selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-2xl"
            >
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
                type="button"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Revisar Boletim</h3>
                  <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">Atleta: {selectedReport.athlete_name}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Observações / Feedback</label>
                  <textarea 
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-theme-primary outline-none transition-all resize-none h-32 text-sm font-medium"
                    placeholder="Adicione um comentário ou motivo de recusa..."
                    value={selectedReport.observations}
                    onChange={e => setSelectedReport({ ...selectedReport, observations: e.target.value })}
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={async () => {
                      try {
                        await api.saveSchoolReport({ ...selectedReport, status: 'Recusado' });
                        toast.success('Boletim recusado');
                        setIsReviewModalOpen(false);
                        loadReports();
                      } catch (error) {
                        toast.error('Erro ao recusar');
                      }
                    }}
                    className="flex-1 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] border border-red-500/20"
                  >
                    Recusar
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await api.saveSchoolReport({ ...selectedReport, status: 'Visto' });
                        toast.success('Boletim aprovado');
                        setIsReviewModalOpen(false);
                        loadReports();
                      } catch (error) {
                        toast.error('Erro ao aprovar');
                      }
                    }}
                    className="flex-2 py-4 bg-green-500 text-black font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-green-500/20"
                  >
                    Aprovar (Visto)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
