import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sponsor, SponsorBlock, User } from '../types';
import { Plus, Trash2, Link as LinkIcon, Upload, Save, X, Image as ImageIcon, Download, Edit2, Layers, Grid, FileImage, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SponsorFlyer from './SponsorFlyer';
import { cn } from '../utils';

interface SponsorManagerProps {
  user?: User | null;
}

export default function SponsorManager({ user }: SponsorManagerProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'flyers'>('list');
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorBlocks, setSponsorBlocks] = useState<SponsorBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor> | null>(null);
  const [flyerSponsor, setFlyerSponsor] = useState<Sponsor | null>(null);

  const isAdmin = user?.role === 'admin' || user?.email === 'piruaesporteclube@gmail.com';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
        const [sponsorsData, blocksData] = await Promise.all([
            api.getSponsors(),
            api.getSponsorBlocks()
        ]);
        setSponsors(Array.isArray(sponsorsData) ? sponsorsData : []);
        setSponsorBlocks(Array.isArray(blocksData) ? blocksData : []);
        if (isRefresh) toast.success('Dados atualizados');
    } catch (error) {
        console.error('Erro ao carregar patrocinadores:', error);
        toast.error('Erro ao carregar patrocinadores');
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingSponsor(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem gerenciar patrocinadores');
      return;
    }
    if (!editingSponsor?.name) {
      toast.error('O nome do patrocinador é obrigatório');
      return;
    }
    if (!editingSponsor?.logo) {
      toast.error('O logo é obrigatório para as artes de divulgação');
      return;
    }

    const loadingToast = toast.loading('Salvando patrocinador...');
    try {
      // Save sponsor in main collection
      await api.saveSponsor(editingSponsor);
      
      // Update sponsor in all blocks where it appears
      const updatedBlocks = sponsorBlocks.filter(block => 
        block.sponsors.some(s => s.id === editingSponsor.id)
      );

      if (updatedBlocks.length > 0) {
        await Promise.all(updatedBlocks.map(block => {
            const newSponsors = block.sponsors.map(s => 
                s.id === editingSponsor.id ? { ...s, ...editingSponsor } : s
            );
            return api.saveSponsorBlock({ ...block, sponsors: newSponsors });
        }));
      }

      toast.success('Patrocinador salvo!', { id: loadingToast });
      setEditingSponsor(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar patrocinador', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir patrocinadores');
      return;
    }
    if (!window.confirm('Deseja excluir este patrocinador? Ele será removido de todos os blocos de uniformes.')) return;
    
    const loadingToast = toast.loading('Excluindo patrocinador...');
    try {
        await api.deleteSponsor(id);

        // Remove sponsor from all blocks
        const blocksWithSponsor = sponsorBlocks.filter(block => 
            block.sponsors.some(s => s.id === id)
        );

        if (blocksWithSponsor.length > 0) {
            await Promise.all(blocksWithSponsor.map(block => {
                const newSponsors = block.sponsors.filter(s => s.id !== id);
                return api.saveSponsorBlock({ ...block, sponsors: newSponsors });
            }));
        }

        toast.success('Patrocinador excluído', { id: loadingToast });
        loadData();
    } catch (error) {
        toast.error('Erro ao excluir patrocinador', { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Patrocinadores</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Gestão de parceiros e artes para redes sociais</p>
        </div>

        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest",
              activeTab === 'list' ? "bg-theme-primary text-black shadow-lg shadow-theme-primary/20" : "text-zinc-500 hover:text-white"
            )}
          >
            <Grid size={14} />
            Gestão
          </button>
          <button 
            onClick={() => setActiveTab('flyers')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest",
              activeTab === 'flyers' ? "bg-theme-primary text-black shadow-lg shadow-theme-primary/20" : "text-zinc-500 hover:text-white"
            )}
          >
            <FileImage size={14} />
            Gerador de Encarte
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
          </button>

          {activeTab === 'list' && isAdmin && (
            <button 
              onClick={() => setEditingSponsor({ name: '', logo: '', link: '', logo_scale: 1 })}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
            >
              <Plus size={18} />
              Novo Patrocinador
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-6">
          {editingSponsor && (
        <div className="bg-zinc-900 border border-theme-primary/30 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white uppercase text-xs tracking-widest">
              {editingSponsor.id ? 'Editar Patrocinador' : 'Novo Patrocinador'}
            </h4>
            <button onClick={() => setEditingSponsor(null)} className="text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome do Patrocinador</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-black text-xs"
                  value={editingSponsor.name}
                  onChange={e => setEditingSponsor({ ...editingSponsor, name: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Responsável</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-black text-xs"
                    value={editingSponsor.responsible_name || ''}
                    onChange={e => setEditingSponsor({ ...editingSponsor, responsible_name: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Segmento</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-black text-xs"
                    placeholder="EX: ALIMENTAÇÃO"
                    value={editingSponsor.segment || ''}
                    onChange={e => setEditingSponsor({ ...editingSponsor, segment: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Telefone</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-black text-xs"
                    placeholder="(00) 00000-0000"
                    value={editingSponsor.phone || ''}
                    onChange={e => setEditingSponsor({ ...editingSponsor, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Link (Opcional)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs"
                    placeholder="https://..."
                    value={editingSponsor.link}
                    onChange={e => setEditingSponsor({ ...editingSponsor, link: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center justify-center gap-4 p-4 bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-theme-primary transition-colors relative group min-h-[200px]">
                {editingSponsor.logo ? (
                  <img 
                    src={editingSponsor.logo} 
                    className="max-h-32 object-contain transition-transform" 
                    style={{ transform: `scale(${editingSponsor.logo_scale || 1})` }}
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-600">
                    <ImageIcon size={48} />
                    <span className="text-[10px] mt-2 font-bold uppercase tracking-widest">Logo do Patrocinador</span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className="text-white" />
                    <span className="text-[10px] text-white font-black uppercase">Alterar Logo</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              {editingSponsor.logo && (
                <div className="bg-black/20 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Tamanho do Logo</label>
                    <span className="text-[10px] font-mono text-theme-primary">{Math.round((editingSponsor.logo_scale || 1) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.3" 
                    max="2" 
                    step="0.05"
                    value={editingSponsor.logo_scale || 1}
                    onChange={e => setEditingSponsor({ ...editingSponsor, logo_scale: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-black rounded-xl font-bold hover:opacity-90 transition-all"
            >
              <Save size={18} />
              Salvar
            </button>
          </div>
        </div>
      )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sponsors.map(sponsor => {
              const blocks = sponsorBlocks.filter(b => b.sponsors.some(s => s.id === sponsor.id));
              
              return (
                <div key={sponsor.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 group relative hover:border-theme-primary/50 transition-all flex flex-col h-full shadow-lg">
                    <div className="h-24 flex items-center justify-center mb-4 bg-white/5 rounded-2xl overflow-hidden p-2">
                    {sponsor.logo ? (
                      <div className="flex items-center justify-center w-full h-full overflow-hidden">
                        <img 
                            src={sponsor.logo} 
                            style={{ transform: `scale(${sponsor.logo_scale || 1})` }}
                            className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110" 
                            referrerPolicy="no-referrer" 
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-700">
                        <ImageIcon size={32} />
                        <span className="text-[8px] font-black uppercase mt-1">S/ Logo</span>
                      </div>
                    )}
                    </div>
                    <div className="text-center flex-1">
                    <p className="text-[11px] font-black text-white uppercase truncate tracking-wider">{sponsor.name}</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase truncate mt-1 tracking-widest">{sponsor.segment || 'S/ SEGMENTO'}</p>
                    
                    {blocks.length > 0 && (
                        <div className="mt-3 py-1.5 px-2 bg-theme-primary/10 rounded-xl flex items-center justify-center gap-1.5 border border-theme-primary/20">
                            <Layers size={10} className="text-theme-primary shrink-0" />
                            <span className="text-[8px] font-black text-theme-primary uppercase truncate tracking-[0.05em]" title={blocks.map(b => b.name).join(', ')}>
                                {blocks.length === 1 ? blocks[0].name : `${blocks.length} BLOCOS`}
                            </span>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-1 mt-3 pt-3 border-t border-white/5">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase leading-none tracking-widest">{sponsor.responsible_name || 'RESP. NÃO INF.'}</span>
                        <span className="text-[10px] font-black text-theme-primary leading-none tracking-widest">{sponsor.phone || 'S/ TELEFONE'}</span>
                    </div>
                    {sponsor.link && (
                        <a href={sponsor.link} target="_blank" rel="noopener noreferrer" className="text-theme-primary hover:text-white transition-colors text-[9px] flex items-center justify-center gap-1.5 mt-3 font-black uppercase tracking-widest">
                        <LinkIcon size={10} />
                        VISITAR
                        </a>
                    )}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                    <button 
                        onClick={() => setFlyerSponsor(sponsor)}
                        className="p-2 bg-theme-primary text-black hover:bg-white rounded-xl transition-all shadow-xl hover:scale-110 active:scale-90"
                        title="Gerar Encarte Story"
                    >
                        <Download size={14} />
                    </button>
                    <button 
                        onClick={() => setEditingSponsor(sponsor)}
                        className="p-2 bg-white/10 backdrop-blur-md text-white hover:bg-theme-primary hover:text-black rounded-xl transition-all shadow-xl hover:scale-110 active:scale-90"
                        title="Editar"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        onClick={() => handleDelete(sponsor.id)}
                        className="p-2 bg-white/10 backdrop-blur-md text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-xl hover:scale-110 active:scale-90"
                        title="Excluir"
                    >
                        <Trash2 size={14} />
                    </button>
                    </div>
                </div>
              );
            })}
          {sponsors.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-[3rem] space-y-4">
              <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600">
                <AlertCircle size={32} />
              </div>
              <div>
                <p className="text-white font-bold uppercase tracking-widest mb-1">Nenhum patrocinador cadastrado</p>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest max-w-xs mx-auto">
                  {isAdmin ? "Comece adicionando seus parceiros para usá-los nos uniformes e gerar materiais de divulgação." : "Nenhum parceiro registrado pela administração até o momento."}
                </p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => setEditingSponsor({ name: '', logo: '', link: '', logo_scale: 1 })}
                  className="px-6 py-2 bg-theme-primary/10 text-theme-primary border border-theme-primary/30 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-theme-primary hover:text-black transition-all"
                >
                  Adicionar Primeiro Patrocinador
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-theme-primary/5 border border-theme-primary/20 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-theme-primary/20 rounded-2xl flex items-center justify-center">
                <FileImage className="text-theme-primary" size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Estúdio de Artes</h4>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Clique em um patrocinador para gerar o encarte oficial do clube para Instagram Stories (9:16)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sponsors.map(sponsor => (
              <button 
                key={`flyer-${sponsor.id}`}
                onClick={() => setFlyerSponsor(sponsor)}
                className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex items-center gap-4 hover:border-theme-primary group transition-all text-left"
              >
                <div className="w-16 h-16 bg-white/5 rounded-2xl p-2 flex items-center justify-center shrink-0">
                  {sponsor.logo ? (
                    <img src={sponsor.logo} className="max-h-full max-w-full object-contain grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="text-zinc-700" size={24} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-white uppercase truncate tracking-widest">{sponsor.name}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase truncate tracking-widest">Gerar Encarte Profissional</p>
                </div>
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-theme-primary group-hover:bg-theme-primary group-hover:text-black transition-all">
                  <Download size={18} />
                </div>
              </button>
            ))}
          </div>

          {sponsors.length === 0 && (
            <div className="py-12 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Crie patrocinadores primeiro para gerar artes</p>
            </div>
          )}
        </div>
      )}
      {flyerSponsor && (
        <SponsorFlyer 
          sponsor={flyerSponsor} 
          onClose={() => setFlyerSponsor(null)} 
        />
      )}
    </div>
  );
}
