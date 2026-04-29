import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, UniformRequest, getSubCategory, SponsorBlock, Sponsor, categories, UniformModel, UniformGroup } from '../types';
import { Shirt, Search, CheckCircle, Clock, XCircle, Info, Filter, Plus, Save, Trash2, Package, Users, Layers, AlertTriangle, ExternalLink, Download, FileText, Image as ImageIcon, Camera } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';
import { toast } from 'react-hot-toast';
import AthleteSearchSelect from './AthleteSearchSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UniformManagementProps {
  user: any;
  athletes: Athlete[];
}

export default function UniformManagement({ user, athletes }: UniformManagementProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'blocks' | 'catalog'>('requests');
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [sponsorBlocks, setSponsorBlocks] = useState<SponsorBlock[]>([]);
  const [uniformModels, setUniformModels] = useState<UniformModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([]);
  
  // New block state
  const [newBlock, setNewBlock] = useState<Partial<SponsorBlock>>({
    name: '',
    sponsors: [],
    min_sets: 40
  });

  // New model state
  const [newModel, setNewModel] = useState<Partial<UniformModel>>({
    name: '',
    image: '',
    group: 'Jogo',
    description: ''
  });

  // New request state
  const [newRequest, setNewRequest] = useState<Partial<UniformRequest>>({
    type: 'Conjunto Completo',
    uniform_group: 'Jogo',
    size: 'M',
    jersey_number: '',
    status: 'Pendente',
    observations: '',
    sponsor_block_id: ''
  });

  const { settings } = useTheme();
  const isAdmin = user?.role === 'admin' || user?.role === 'professor';

  useEffect(() => {
    loadData();
  }, [user, athletes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsData, blocksData, sponsorsData, modelsData] = await Promise.all([
          api.getUniformRequests(),
          api.getSponsorBlocks(),
          api.getSponsors(),
          api.getUniformModels()
      ]);
      
      let filteredRequests = requestsData;
      if (!isAdmin && user?.athlete_id) {
          filteredRequests = requestsData.filter(r => r.athlete_id === user.athlete_id);
      }
      setRequests(filteredRequests);
      setSponsorBlocks(blocksData);
      setAllSponsors(sponsorsData);
      setUniformModels(modelsData);

      if (user?.role === 'student' && user?.athlete_id) {
          const studentAthlete = athletes.find(a => a.id === user.athlete_id);
          if (studentAthlete) {
              setSelectedAthlete(studentAthlete);
              setNewRequest(prev => ({
                  ...prev,
                  athlete_id: studentAthlete.id,
                  athlete_name: studentAthlete.name,
                  category: getSubCategory(studentAthlete.birth_date),
                  jersey_number: studentAthlete.jersey_number || ''
              }));
          }
      }
    } catch (error) {
      console.error("Error loading uniform data:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlock = async () => {
    if (!newBlock.name || !newBlock.sponsors || newBlock.sponsors.length === 0) {
      toast.error("Por favor, preencha o nome e selecione pelo menos um patrocinador.");
      return;
    }

    if (newBlock.sponsors.length > 7) {
      toast.error("Cada bloco pode ter no máximo 7 patrocinadores.");
      return;
    }

    if (!newBlock.min_sets || newBlock.min_sets < 40) {
        toast.error("O número mínimo de conjuntos por bloco é 40.");
        return;
    }

    setLoading(true);
    try {
      await api.saveSponsorBlock(newBlock);
      toast.success("Bloco de patrocinadores salvo com sucesso!");
      setIsBlockModalOpen(false);
      setNewBlock({ name: '', sponsors: [], min_sets: 40 });
      loadData();
    } catch (error) {
      console.error("Error saving block:", error);
      toast.error("Erro ao salvar bloco.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este bloco?")) return;
    try {
      await api.deleteSponsorBlock(id);
      toast.success("Bloco excluído.");
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir bloco.");
    }
  };

  const handleSaveRequest = async () => {
    if (!newRequest.athlete_id || !newRequest.jersey_number || !newRequest.size) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      // Check number availability
      const isAvailable = await api.checkNumberAvailability(
        newRequest.category!, 
        newRequest.jersey_number!, 
        newRequest.athlete_id
      );

      if (!isAvailable) {
        toast.error(`O número ${newRequest.jersey_number} já está ocupado na categoria ${newRequest.category}.`);
        setLoading(false);
        return;
      }

      await api.saveUniformRequest({
          ...newRequest,
          athlete_name: selectedAthlete?.name || newRequest.athlete_name,
          status: isAdmin ? 'Aprovado' : 'Pendente'
      } as UniformRequest);
      
      toast.success(isAdmin ? "Solicitação criada com sucesso!" : "Solicitação enviada com sucesso!");
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving request:", error);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    
    // Header
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DE PEDIDO - UNIFORMES', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`GERADO EM: ${format(now, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, 105, 30, { align: 'center' });
    
    // Filters info
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    let filterText = `FILTROS: Status: ${statusFilter === 'all' ? 'Todos' : statusFilter} | `;
    filterText += `Categoria: ${categoryFilter === 'all' ? 'Todas' : categoryFilter} | `;
    filterText += `Finalidade: ${groupFilter === 'all' ? 'Todas' : groupFilter} | `;
    if (blockFilter !== 'all') {
        const block = sponsorBlocks.find(b => b.id === blockFilter);
        filterText += `Bloco: ${block?.name || 'N/A'}`;
    }
    doc.text(filterText, 14, 50);

    // Table
    const tableData = filteredData.map(req => [
        req.athlete_name,
        req.category,
        req.size,
        `#${req.jersey_number}`,
        req.uniform_group || 'N/A',
        req.type || 'N/A',
        req.status
    ]);

    autoTable(doc, {
        startY: 55,
        head: [['ATLETA', 'CAT.', 'TAM.', 'Nº', 'FINALIDADE', 'TIPO', 'STATUS']],
        body: tableData,
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const stats = {
        total: filteredData.length,
        completos: filteredData.filter(r => r.type === 'Conjunto Completo').length,
        camisas: filteredData.filter(r => r.type === 'Camisa Avulsa').length,
        jogo: filteredData.filter(r => r.uniform_group === 'Jogo').length,
        viagem: filteredData.filter(r => r.uniform_group === 'Viagem').length,
        torcedor: filteredData.filter(r => r.uniform_group === 'Torcedor').length,
        comissao: filteredData.filter(r => r.uniform_group === 'Comissão Técnica').length
    };

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL DE PEDIDOS: ${stats.total}`, 14, finalY);
    doc.text(`CONJUNTOS COMPLETOS: ${stats.completos} | CAMISAS AVULSAS: ${stats.camisas}`, 14, finalY + 5);
    doc.text(`POR FINALIDADE: JOGO: ${stats.jogo} | VIAGEM: ${stats.viagem} | TORCEDOR: ${stats.torcedor} | COMISSÃO: ${stats.comissao}`, 14, finalY + 10);

    doc.save(`pedidos-uniforme-${format(now, 'dd-MM-yyyy')}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleSaveModel = async () => {
    if (!newModel.name || !newModel.image || !newModel.group) {
        toast.error("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    setLoading(true);
    try {
        await api.saveUniformModel(newModel);
        toast.success("Modelo de uniforme salvo!");
        setIsModelModalOpen(false);
        setNewModel({ name: '', image: '', group: 'Jogo', description: '' });
        loadData();
    } catch (error) {
        toast.error("Erro ao salvar modelo.");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm("Deseja excluir este modelo do catálogo?")) return;
    try {
        await api.deleteUniformModel(id);
        toast.success("Modelo removido.");
        loadData();
    } catch (error) {
        toast.error("Erro ao excluir modelo.");
    }
  };

  const handleUpdateStatus = async (request: UniformRequest, newStatus: UniformRequest['status']) => {
    try {
      await api.saveUniformRequest({ ...request, status: newStatus });
      toast.success(`Status atualizado para: ${newStatus}`);
      
      // If Delivered, update the athlete's jersey number automatically
      if (newStatus === 'Entregue') {
          const athlete = athletes.find(a => a.id === request.athlete_id);
          if (athlete) {
              await api.saveAthlete({
                  ...athlete,
                  jersey_number: request.jersey_number
              });
          }
      }
      
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta solicitação?")) return;
    try {
      await api.deleteUniformRequest(id);
      toast.success("Solicitação excluída.");
      loadData();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Erro ao excluir solicitação.");
    }
  };

  const filteredData = requests.filter(r => {
    const matchesSearch = r.athlete_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.jersey_number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesBlock = blockFilter === 'all' || r.sponsor_block_id === blockFilter;
    const matchesGroup = groupFilter === 'all' || (r as any).uniform_group === groupFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesBlock && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 p-6 rounded-3xl border border-zinc-800 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-theme-primary/10 rounded-xl">
              <Shirt className="text-theme-primary" size={24} />
            </div>
            UNIFORMES
          </h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            {isAdmin ? 'Gestão de pedidos, blocos de patrocínio e numeração' : 'Solicite seu uniforme e acompanhe o status'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
                <button 
                    onClick={() => setActiveTab('requests')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'requests' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                    )}
                >
                    Solicitações
                </button>
                {isAdmin && (
                    <button 
                        onClick={() => setActiveTab('blocks')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'blocks' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        Blocos
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('catalog')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'catalog' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                    )}
                >
                    Catálogo
                </button>
            </div>
            <button 
                onClick={() => {
                    if (isAdmin) {
                        setSelectedAthlete(null);
                        setNewRequest({
                            size: 'M',
                            jersey_number: '',
                            status: 'Aprovado',
                            observations: '',
                            sponsor_block_id: ''
                        });
                    }
                    setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-theme-primary/20 active:scale-95"
            >
                <Plus size={18} />
                SOLICITAR NOVO UNIFORME
            </button>
            {isAdmin && filteredData.length > 0 && (
                <button 
                    onClick={generatePDF}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                    <Download size={18} />
                    Exportar PDF
                </button>
            )}
        </div>
      </div>

      {activeTab === 'requests' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative md:col-span-2 lg:col-span-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="text"
                    placeholder="PESQUISAR POR NOME OU NÚMERO..."
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all font-bold text-[10px] uppercase tracking-widest"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                
                <select 
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">TODAS CATEGORIAS</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select 
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                >
                    <option value="all">TODOS TIPOS</option>
                    {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(g => (
                        <option key={g} value={g}>{g.toUpperCase()}</option>
                    ))}
                </select>

                <select 
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={blockFilter}
                    onChange={(e) => setBlockFilter(e.target.value)}
                >
                    <option value="all">TODOS BLOCOS</option>
                    {sponsorBlocks.map(block => (
                        <option key={block.id} value={block.id}>{block.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Filter size={16} className="text-zinc-500 shrink-0" />
                {['all', 'Pendente', 'Aprovado', 'Entregue', 'Recusado'].map((status) => (
                    <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        statusFilter === status 
                        ? "bg-theme-primary text-black" 
                        : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                    )}
                    >
                    {status === 'all' ? 'TODOS STATUS' : status}
                    </button>
                ))}
            </div>

            {loading && requests.length === 0 ? (
                <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                <Package className="mx-auto mb-4 text-zinc-600" size={48} />
                <h3 className="text-white font-black uppercase mb-1">Nenhuma solicitação encontrada</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Ajuste os filtros ou crie uma nova solicitação.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map((req) => {
                    const block = sponsorBlocks.find(b => b.id === req.sponsor_block_id);
                    return (
                        <div 
                        key={req.id}
                        className="bg-black border border-zinc-800 rounded-3xl overflow-hidden hover:border-theme-primary/50 transition-all group flex flex-col"
                        >
                        <div className="p-6 space-y-4 flex-1">
                            <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-theme-primary group-hover:scale-110 transition-transform">
                                <Shirt size={28} />
                                </div>
                                <div>
                                <h3 className="text-white font-black uppercase text-sm truncate max-w-[150px]">{req.athlete_name}</h3>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none block mb-0.5">{req.category}</span>
                                <div className="flex flex-wrap gap-1">
                                    <span className={cn(
                                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border leading-none inline-block",
                                        req.type === 'Camisa Avulsa' ? "border-amber-500/50 text-amber-500 bg-amber-500/5" : "border-theme-primary/50 text-theme-primary bg-theme-primary/5"
                                    )}>
                                        {req.type || 'Conjunto'}
                                    </span>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border leading-none inline-block",
                                        req.uniform_group === 'Jogo' ? "border-theme-primary/50 text-theme-primary bg-theme-primary/5" :
                                        req.uniform_group === 'Viagem' ? "border-purple-500/50 text-purple-500 bg-purple-500/5" :
                                        req.uniform_group === 'Comissão Técnica' ? "border-sky-500/50 text-sky-500 bg-sky-500/5" :
                                        "border-pink-500/50 text-pink-500 bg-pink-500/5"
                                    )}>
                                        {req.uniform_group || 'Jogo'}
                                    </span>
                                </div>
                                </div>
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                req.status === 'Pendente' ? "bg-yellow-500/10 text-yellow-500" :
                                req.status === 'Aprovado' ? "bg-blue-500/10 text-blue-500" :
                                req.status === 'Entregue' ? "bg-green-500/10 text-green-500" :
                                "bg-red-500/10 text-red-500"
                            )}>
                                {req.status}
                            </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 text-center">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tamanho</p>
                                <p className="text-white font-black text-lg">{req.size}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 text-center">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Número</p>
                                <p className="text-white font-black text-lg">#{req.jersey_number}</p>
                            </div>
                            </div>

                            {block && (
                                <div className="p-3 bg-theme-primary/5 rounded-xl border border-theme-primary/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Layers className="text-theme-primary" size={12} />
                                        <span className="text-[10px] font-black text-white uppercase">{block.name}</span>
                                    </div>
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {block.sponsors.map((s, i) => (
                                            <img 
                                                key={i}
                                                src={s.logo}
                                                alt={s.name}
                                                className="w-6 h-6 rounded-full border-2 border-zinc-900 object-contain bg-white"
                                                title={s.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {req.observations && (
                            <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">OBSERVAÇÕES:</p>
                                <p className="text-zinc-400 text-[11px] leading-relaxed italic">"{req.observations}"</p>
                            </div>
                            )}
                        </div>

                        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between gap-2">
                            <div className="flex gap-2">
                            {isAdmin && req.status === 'Pendente' && (
                                <>
                                <button 
                                    onClick={() => handleUpdateStatus(req, 'Aprovado')}
                                    className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                    title="Aprovar"
                                >
                                    <CheckCircle size={18} />
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatus(req, 'Recusado')}
                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                    title="Recusar"
                                >
                                    <XCircle size={18} />
                                </button>
                                </>
                            )}
                            {isAdmin && req.status === 'Aprovado' && (
                                <button 
                                onClick={() => handleUpdateStatus(req, 'Entregue')}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                <Package size={14} />
                                Marcar como Entregue
                                </button>
                            )}
                            </div>
                            
                            {(isAdmin || req.status === 'Pendente') && (
                                <button 
                                onClick={() => handleDeleteRequest(req.id)}
                                className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                title="Excluir"
                                >
                                <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        </div>
                    );
                })}
                </div>
            )}
        </>
      ) : activeTab === 'blocks' ? (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                      <Layers className="text-theme-primary" size={20} />
                      GERENCIAR BLOCOS DE PATROCINADORES
                  </h3>
                  <button 
                    onClick={() => {
                        setNewBlock({ name: '', sponsors: [], min_sets: 40 });
                        setIsBlockModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                      <Plus size={16} />
                      Novo Bloco
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sponsorBlocks.map(block => {
                      const setsCount = requests.filter(r => r.sponsor_block_id === block.id).length;
                      const progress = Math.min((setsCount / block.min_sets) * 100, 100);

                      return (
                          <div key={block.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-theme-primary/30 transition-all group">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h4 className="text-white font-black uppercase">{block.name}</h4>
                                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Min. {block.min_sets} conjuntos</span>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                      <button 
                                        onClick={() => {
                                            setNewBlock(block);
                                            setIsBlockModalOpen(true);
                                        }}
                                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-blue-500 rounded-xl transition-all"
                                      >
                                          <Filter size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteBlock(block.id)}
                                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2">
                                  {block.sponsors.map((s, i) => (
                                      <div key={i} className="p-3 bg-zinc-800 rounded-2xl border border-zinc-700 flex items-center justify-between group/sponsor hover:border-theme-primary/30 transition-all">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-lg p-1">
                                              <img src={s.logo} alt={s.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-black text-white uppercase block leading-none">{s.name}</span>
                                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{s.segment || 'Segmento não informado'}</span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-[8px] font-bold text-zinc-400 block uppercase">{s.responsible_name || 'Resp. não inf.'}</span>
                                            <span className="text-[9px] font-black text-theme-primary">{s.phone || 'S/ Telefone'}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="pt-2">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-[9px] font-black text-zinc-500 uppercase">Preenchimento: {setsCount}/{block.min_sets}</span>
                                      <span className="text-[9px] font-black text-theme-primary uppercase">{Math.round(progress)}%</span>
                                  </div>
                                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-theme-primary transition-all duration-500" 
                                        style={{ width: `${progress}%` }}
                                      />
                                  </div>
                                  {setsCount < block.min_sets && (
                                      <p className="mt-2 text-[9px] text-yellow-500 flex items-center gap-1 font-bold">
                                          <AlertTriangle size={10} />
                                          FALTAM {block.min_sets - setsCount} CONJUNTOS PARA FECHAR O BLOCO
                                      </p>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      ) : (
          <div className="space-y-8">
              <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon className="text-theme-primary" size={20} />
                        CATÁLOGO DE UNIFORMES DO CLUBE
                  </h3>
                  {isAdmin && (
                    <button 
                        onClick={() => {
                            setNewModel({ name: '', image: '', group: 'Jogo', description: '' });
                            setIsModelModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        <Plus size={16} />
                        Adicionar Modelo
                    </button>
                  )}
              </div>

              {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(group => {
                  const groupModels = uniformModels.filter(m => m.group === group);
                  if (groupModels.length === 0) return null;

                  return (
                      <div key={group} className="space-y-4">
                          <div className="flex items-center gap-4">
                              <h4 className="text-white font-black uppercase tracking-[0.2em] text-sm flex items-center gap-2">
                                  <div className={cn(
                                      "w-8 h-[2px]",
                                      group === 'Jogo' ? "bg-theme-primary" :
                                      group === 'Viagem' ? "bg-purple-500" :
                                      group === 'Comissão Técnica' ? "bg-sky-500" :
                                      "bg-pink-500"
                                  )}></div>
                                  UNIFORME DE {group.toUpperCase()}
                              </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {groupModels.map(model => (
                                  <div key={model.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-theme-primary/30 transition-all">
                                      <div className="aspect-[4/5] bg-zinc-800 relative overflow-hidden">
                                          <img 
                                            src={model.image} 
                                            alt={model.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                          />
                                          {isAdmin && (
                                              <button 
                                                onClick={() => handleDeleteModel(model.id)}
                                                className="absolute top-4 right-4 p-2 bg-black/50 text-white hover:bg-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          )}
                                      </div>
                                      <div className="p-4">
                                          <h5 className="text-white font-black uppercase text-xs mb-1">{model.name}</h5>
                                          {model.description && (
                                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{model.description}</p>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}

              {uniformModels.length === 0 && (
                <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                    <ImageIcon className="mx-auto mb-4 text-zinc-600" size={48} />
                    <h3 className="text-white font-black uppercase mb-1">Nenhum modelo cadastrado</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Adicione modelos para que os atletas possam visualizar.</p>
                </div>
              )}
          </div>
      )}

      {/* Modal Nova Solicitação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                <Shirt className="text-theme-primary" size={18} />
                {isAdmin ? 'SOLICITAÇÃO MANUAL (ADM)' : 'SOLICITAR MEU UNIFORME'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">O que deseja pedir?</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setNewRequest({...newRequest, type: 'Conjunto Completo'})}
                            className={cn(
                                "py-3 px-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                                newRequest.type === 'Conjunto Completo' 
                                    ? "bg-theme-primary border-theme-primary text-black" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                            )}
                        >
                            Kit Completo
                        </button>
                        <button 
                            onClick={() => setNewRequest({...newRequest, type: 'Camisa Avulsa'})}
                            className={cn(
                                "py-3 px-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                                newRequest.type === 'Camisa Avulsa' 
                                    ? "bg-theme-primary border-theme-primary text-black shadow-[0_0_15px_rgba(var(--color-theme-primary),0.2)]" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                            )}
                        >
                            Camisa Avulsa
                        </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Finalidade do Uniforme</label>
                    <select 
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                        value={newRequest.uniform_group}
                        onChange={(e) => setNewRequest({...newRequest, uniform_group: e.target.value as any})}
                    >
                        {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                  </div>
              </div>

              {isAdmin && (
                  <div>
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Selecione o Atleta</label>
                      <AthleteSearchSelect 
                        athletes={athletes}
                        onSelect={(athlete) => {
                            setSelectedAthlete(athlete);
                            setNewRequest({
                                ...newRequest,
                                athlete_id: athlete.id,
                                athlete_name: athlete.name,
                                category: getSubCategory(athlete.birth_date),
                                jersey_number: athlete.jersey_number || ''
                            });
                        }}
                      />
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Tamanho</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={newRequest.size}
                    onChange={(e) => setNewRequest({...newRequest, size: e.target.value as any})}
                  >
                    {['PP', 'P', 'M', 'G', 'GG', 'XG'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Número Desejado</label>
                  <input 
                    type="text"
                    maxLength={3}
                    placeholder="EX: 10"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black"
                    value={newRequest.jersey_number}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setNewRequest({...newRequest, jersey_number: val});
                    }}
                  />
                  <p className="text-[9px] text-zinc-500 mt-2 flex items-center gap-1 font-bold">
                    <Info size={10} />
                    Sujeito a disponibilidade técnica.
                  </p>
                </div>
              </div>

              <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Bloco de Patrocinadores</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={newRequest.sponsor_block_id}
                    onChange={(e) => setNewRequest({...newRequest, sponsor_block_id: e.target.value})}
                  >
                    <option value="">NENHUM (OU AGUARDAR DEFINIÇÃO)</option>
                    {sponsorBlocks.map(block => (
                        <option key={block.id} value={block.id}>{block.name}</option>
                    ))}
                  </select>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Observações</label>
                <textarea 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold h-20 uppercase resize-none"
                  placeholder="EX: NOME NAS COSTAS, MODELO MANGA LONGA..."
                  value={newRequest.observations}
                  onChange={(e) => setNewRequest({...newRequest, observations: e.target.value})}
                />
              </div>

              {selectedAthlete && (
                <div className="bg-theme-primary/5 border border-theme-primary/10 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-theme-primary" size={16} />
                        <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Resumo do Atleta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase">Nome:</span>
                        <span className="text-[10px] text-white font-bold uppercase truncate">{selectedAthlete.name}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">Categoria:</span>
                        <span className="text-[10px] text-white font-bold uppercase">{getSubCategory(selectedAthlete.birth_date)}</span>
                    </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveRequest}
                disabled={loading || !selectedAthlete}
                className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                ) : <Save size={18} />}
                {isAdmin ? 'Salvar Solicitação' : 'Enviar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloco de Patrocinadores */}
      {isBlockModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                          <Layers className="text-theme-primary" size={18} />
                          {newBlock.id ? 'Editar Bloco' : 'Novo Bloco de Patrocínio'}
                      </h3>
                      <button 
                        onClick={() => setIsBlockModalOpen(false)}
                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                      >
                          <XCircle size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div>
                          <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Bloco</label>
                          <input 
                            type="text"
                            placeholder="EX: BLOCO VERÃO 2024 / PATROCINADORES OURO"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold uppercase"
                            value={newBlock.name}
                            onChange={(e) => setNewBlock({...newBlock, name: e.target.value.toUpperCase()})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Mínimo de Conjuntos</label>
                              <input 
                                type="number"
                                min={40}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold"
                                value={newBlock.min_sets}
                                onChange={(e) => setNewBlock({...newBlock, min_sets: parseInt(e.target.value)})}
                              />
                              <p className="mt-1 text-[8px] text-zinc-500 uppercase font-black tracking-widest">Mínimo de 40 unidades por bloco</p>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                              Patrocinadores (Máx 7) - Selecionados: {newBlock.sponsors?.length || 0}/7
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                              {allSponsors.map(sponsor => {
                                  const isSelected = newBlock.sponsors?.some(s => s.id === sponsor.id);
                                  return (
                                      <button 
                                        key={sponsor.id}
                                        onClick={() => {
                                            const current = newBlock.sponsors || [];
                                            if (isSelected) {
                                                setNewBlock({...newBlock, sponsors: current.filter(s => s.id !== sponsor.id)});
                                            } else {
                                                if (current.length < 7) {
                                                    setNewBlock({...newBlock, sponsors: [...current, sponsor]});
                                                } else {
                                                    toast.error("Máximo de 7 patrocinadores por bloco.");
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                            isSelected 
                                                ? "bg-theme-primary/10 border-theme-primary border-2 shadow-[0_0_15px_rgba(var(--color-theme-primary),0.2)]" 
                                                : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                                        )}
                                      >
                                          <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0">
                                            <img src={sponsor.logo} alt={sponsor.name} className="w-full h-full object-contain" />
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-[10px] font-black text-white uppercase block truncate">{sponsor.name}</span>
                                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block truncate">{sponsor.segment || 'S/ Segmento'}</span>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsBlockModalOpen(false)}
                        className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleSaveBlock}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                          {loading ? (
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                          ) : <Save size={18} />}
                          Salvar Bloco
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Novo Modelo de Uniforme */}
      {isModelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon className="text-theme-primary" size={18} />
                          {newModel.id ? 'Editar Modelo' : 'Adicionar Novo Modelo'}
                      </h3>
                      <button 
                        onClick={() => setIsModelModalOpen(false)}
                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                      >
                          <XCircle size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-6">
                      <div className="flex justify-center">
                          <div className="w-full aspect-[4/5] bg-zinc-800 rounded-3xl border-2 border-dashed border-zinc-700 overflow-hidden relative group">
                              {newModel.image ? (
                                  <>
                                    <img src={newModel.image} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setNewModel({...newModel, image: ''})}
                                        className="absolute top-4 right-4 p-2 bg-black/50 text-white hover:bg-red-500 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                  </>
                              ) : (
                                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700/50 transition-colors">
                                      <Camera className="text-zinc-500 mb-2" size={32} />
                                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Colar URL da Imagem</span>
                                      <input 
                                        type="text" 
                                        placeholder="https://..."
                                        className="mt-4 w-3/4 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-[10px] font-bold"
                                        onBlur={(e) => setNewModel({...newModel, image: e.target.value})}
                                      />
                                  </label>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Modelo</label>
                              <input 
                                type="text"
                                placeholder="EX: CAMISA DE JOGO 1 2024"
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold uppercase"
                                value={newModel.name}
                                onChange={(e) => setNewModel({...newModel, name: e.target.value.toUpperCase()})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Categoria/Grupo</label>
                              <select 
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                                value={newModel.group}
                                onChange={(e) => setNewModel({...newModel, group: e.target.value as any})}
                              >
                                {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Descrição Breve</label>
                            <input 
                                type="text"
                                placeholder="EX: MODELO TRADICIONAL LISTRADO"
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold uppercase"
                                value={newModel.description}
                                onChange={(e) => setNewModel({...newModel, description: e.target.value.toUpperCase()})}
                            />
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsModelModalOpen(false)}
                        className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleSaveModel}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                          {loading ? (
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                          ) : <Save size={18} />}
                          Salvar Modelo
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
