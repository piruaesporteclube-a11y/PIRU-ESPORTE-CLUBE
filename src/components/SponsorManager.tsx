import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sponsor, SponsorBlock } from '../types';
import { Plus, Trash2, Link as LinkIcon, Upload, Save, X, Image as ImageIcon, Download, Edit2, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SponsorFlyer from './SponsorFlyer';

export default function SponsorManager() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorBlocks, setSponsorBlocks] = useState<SponsorBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor> | null>(null);
  const [flyerSponsor, setFlyerSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [sponsorsData, blocksData] = await Promise.all([
            api.getSponsors(),
            api.getSponsorBlocks()
        ]);
        setSponsors(sponsorsData);
        setSponsorBlocks(blocksData);
    } catch (error) {
        toast.error('Erro ao carregar dados');
    } finally {
        setLoading(false);
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
    if (!editingSponsor?.name) {
      toast.error('O nome do patrocinador é obrigatório');
      return;
    }

    setLoading(true);
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

      toast.success('Patrocinador salvo!');
      setEditingSponsor(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar patrocinador');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir este patrocinador?')) return;
    
    setLoading(true);
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

        toast.success('Patrocinador excluído');
        loadData();
    } catch (error) {
        toast.error('Erro ao excluir patrocinador');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white uppercase tracking-widest">Patrocinadores</h3>
        <button 
          onClick={() => setEditingSponsor({ name: '', logo: '', link: '', logo_scale: 1 })}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black rounded-xl font-bold hover:opacity-90 transition-all"
        >
          <Plus size={18} />
          Novo Patrocinador
        </button>
      </div>

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
          <div className="col-span-full py-12 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Nenhum patrocinador cadastrado</p>
          </div>
        )}
      </div>
      {flyerSponsor && (
        <SponsorFlyer 
          sponsor={flyerSponsor} 
          onClose={() => setFlyerSponsor(null)} 
        />
      )}
    </div>
  );
}
