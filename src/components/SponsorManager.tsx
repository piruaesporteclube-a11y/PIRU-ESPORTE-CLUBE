import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sponsor } from '../types';
import { Plus, Trash2, Link as LinkIcon, Upload, Save, X, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import SponsorFlyer from './SponsorFlyer';

export default function SponsorManager() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor> | null>(null);
  const [flyerSponsor, setFlyerSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    const data = await api.getSponsors();
    setSponsors(data);
    setLoading(false);
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
    if (!editingSponsor?.name || !editingSponsor?.logo) {
      toast.error('Nome e Logo são obrigatórios');
      return;
    }

    try {
      await api.saveSponsor(editingSponsor);
      toast.success('Patrocinador salvo!');
      setEditingSponsor(null);
      loadSponsors();
    } catch (error) {
      toast.error('Erro ao salvar patrocinador');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este patrocinador?')) {
      await api.deleteSponsor(id);
      toast.success('Patrocinador excluído');
      loadSponsors();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white uppercase tracking-widest">Patrocinadores</h3>
        <button 
          onClick={() => setEditingSponsor({ name: '', logo: '', link: '' })}
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
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                  value={editingSponsor.name}
                  onChange={e => setEditingSponsor({ ...editingSponsor, name: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Link (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  placeholder="https://..."
                  value={editingSponsor.link}
                  onChange={e => setEditingSponsor({ ...editingSponsor, link: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-4 bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-theme-primary transition-colors relative group">
              {editingSponsor.logo ? (
                <img src={editingSponsor.logo} className="h-24 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-24 flex flex-col items-center justify-center text-zinc-600">
                  <ImageIcon size={32} />
                  <span className="text-[10px] mt-2 font-bold">Logo</span>
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                <Upload size={20} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
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
        {sponsors.map(sponsor => (
          <div key={sponsor.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 group relative hover:border-theme-primary/50 transition-all">
            <div className="h-20 flex items-center justify-center mb-3">
              <img src={sponsor.logo} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-white uppercase truncate">{sponsor.name}</p>
              {sponsor.link && (
                <a href={sponsor.link} target="_blank" rel="noopener noreferrer" className="text-theme-primary hover:underline text-[8px] flex items-center justify-center gap-1 mt-1">
                  <LinkIcon size={8} />
                  VISITAR
                </a>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setFlyerSponsor(sponsor)}
                className="p-1.5 bg-theme-primary text-black hover:bg-white rounded-lg transition-colors shadow-lg"
                title="Gerar Encarte Story"
              >
                <Download size={12} />
              </button>
              <button 
                onClick={() => setEditingSponsor(sponsor)}
                className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                title="Editar"
              >
                <Plus size={12} />
              </button>
              <button 
                onClick={() => handleDelete(sponsor.id)}
                className="p-1.5 bg-zinc-800 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
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
