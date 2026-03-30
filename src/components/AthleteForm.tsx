import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete } from '../types';
import { X, Upload, Save, UserCircle } from 'lucide-react';

interface AthleteFormProps {
  athlete?: Athlete | null;
  onClose: () => void;
  onSave: () => void;
  isRegistration?: boolean;
  onRegisterSuccess?: () => void;
}

export default function AthleteForm({ athlete, onClose, onSave, isRegistration, onRegisterSuccess }: AthleteFormProps) {
  const [formData, setFormData] = useState<Partial<Athlete>>({
    name: '',
    birth_date: '',
    doc: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    jersey_number: '',
    photo: '',
    contact: '',
    guardian_name: '',
    guardian_doc: '',
    guardian_phone: '',
    status: 'Ativo'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (athlete) setFormData(athlete);
  }, [athlete]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        alert("A foto é muito grande. Por favor, escolha uma imagem com menos de 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.onerror = () => {
        alert("Erro ao ler o arquivo da foto.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistration) {
        await api.register(formData);
        onRegisterSuccess?.();
      } else {
        await api.saveAthlete(formData);
        onSave();
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-start justify-center p-4 overflow-y-auto py-8">
      <div className="bg-black border border-zinc-800 w-full max-w-4xl rounded-3xl shadow-2xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 md:hidden">
              <X size={20} />
            </button>
            {isRegistration ? 'Novo Cadastro de Aluno' : (athlete ? 'Editar Atleta' : 'Novo Cadastro de Atleta')}
          </h2>
          <button onClick={onClose} className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
            <X size={18} className="group-hover:rotate-90 transition-transform" />
            <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              {formData.photo ? (
                <img src={formData.photo} className="w-[120px] h-[160px] object-cover rounded-xl border-2 border-theme-primary shadow-lg shadow-theme-primary/20" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-[120px] h-[160px] bg-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700 group-hover:border-theme-primary transition-colors">
                  <UserCircle size={48} />
                  <span className="text-[10px] mt-2 font-bold uppercase">Foto 3x4</span>
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                <Upload className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <p className="text-xs text-zinc-500">Clique para fazer upload da foto (3x4)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Informações Pessoais</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data de Nascimento</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.birth_date}
                      onChange={e => setFormData({...formData, birth_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF/RG</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.doc}
                      onChange={e => setFormData({...formData, doc: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nº Camisa</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.jersey_number}
                      onChange={e => setFormData({...formData, jersey_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Contato Aluno</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.contact}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Endereço</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Rua</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.street}
                      onChange={e => setFormData({...formData, street: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nº</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.number}
                      onChange={e => setFormData({...formData, number: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Bairro</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.neighborhood}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.city}
                      onChange={e => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                    <input 
                      type="text" 
                      maxLength={2}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.uf}
                      onChange={e => setFormData({...formData, uf: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Guardian Info */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Responsável Legal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Responsável</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.guardian_name}
                    onChange={e => setFormData({...formData, guardian_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">RG/CPF Responsável</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.guardian_doc}
                    onChange={e => setFormData({...formData, guardian_doc: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Telefone Responsável</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.guardian_phone}
                    onChange={e => setFormData({...formData, guardian_phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status</label>
              <select 
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (
                <>
                  <Save size={20} />
                  {isRegistration ? 'Finalizar Cadastro' : 'Salvar Atleta'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
