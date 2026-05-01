import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UniformModel, UniformGroup } from '../types';
import { Plus, Trash2, Upload, Save, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function UniformManager() {
  const [models, setModels] = useState<UniformModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<Partial<UniformModel> | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    const data = await api.getUniformModels();
    setModels(data);
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingModel(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editingModel?.name || !editingModel?.image) {
      toast.error('Nome e Imagem são obrigatórios');
      return;
    }

    try {
      // Ensure group is present
      const modelToSave = { ...editingModel, group: editingModel.group || 'Jogo' };
      await api.saveUniformModel(modelToSave);
      toast.success('Modelo salvo!');
      setEditingModel(null);
      loadModels();
    } catch (error) {
      toast.error('Erro ao salvar modelo');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este modelo?')) {
      await api.deleteUniformModel(id);
      toast.success('Modelo excluído');
      loadModels();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white uppercase tracking-widest">Modelos de Uniforme</h3>
        <button 
          onClick={() => setEditingModel({ name: '', image: '', group: 'Jogo', description: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black rounded-xl font-bold hover:opacity-90 transition-all"
        >
          <Plus size={18} />
          Novo Modelo
        </button>
      </div>

      {editingModel && (
        <div className="bg-zinc-900 border border-theme-primary/30 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white uppercase text-xs tracking-widest">
              {editingModel.id ? 'Editar Modelo' : 'Novo Modelo'}
            </h4>
            <button onClick={() => setEditingModel(null)} className="text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome do Modelo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                  value={editingModel.name}
                  onChange={e => setEditingModel({ ...editingModel, name: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Descrição (Opcional)</label>
                <textarea 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase min-h-[100px]"
                  value={editingModel.description}
                  onChange={e => setEditingModel({ ...editingModel, description: e.target.value.toUpperCase() })}
                  placeholder="EX: UNIFORME DE TREINO 2024..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Categoria/Finalidade</label>
                <select 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs"
                  value={editingModel.group || 'Jogo'}
                  onChange={e => setEditingModel({ ...editingModel, group: e.target.value as UniformGroup })}
                >
                  {["Viagem", "Jogo", "Torcedor", "Comissão Técnica"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-4 bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-theme-primary transition-colors relative group">
              {editingModel.image ? (
                <img src={editingModel.image} className="h-48 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-zinc-600">
                  <ImageIcon size={48} />
                  <span className="text-[10px] mt-2 font-bold">Imagem do Uniforme</span>
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                <Upload size={24} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => (
          <div key={model.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 group relative hover:border-theme-primary/50 transition-all">
            <div className="h-48 flex items-center justify-center mb-4 bg-black/50 rounded-xl overflow-hidden">
              <img src={model.image} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">{model.name}</h4>
              <span className="inline-block px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-[8px] font-black uppercase rounded-md mb-1">
                {model.group || 'Jogo'}
              </span>
              {model.description && (
                <p className="text-[10px] text-zinc-500 uppercase leading-relaxed line-clamp-2">{model.description}</p>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setEditingModel(model)}
                className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <Plus size={12} />
              </button>
              <button 
                onClick={() => handleDelete(model.id)}
                className="p-1.5 bg-zinc-800 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {models.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Nenhum modelo de uniforme cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
