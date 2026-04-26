import React, { useState } from 'react';
import { Professor } from '../types';
import { api } from '../api';
import { UserPlus, CheckCircle2, QrCode, ClipboardList, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicProfessorRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Professor>>({
    name: '',
    doc: '',
    birth_date: '',
    phone: '',
    role: 'treinador',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    photo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.name || !formData.doc || !formData.phone) {
        throw new Error("Por favor, preencha nome, CPF e telefone.");
      }

      const professorData: Professor = {
        ...formData as Professor,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };

      await api.saveProfessor(professorData);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Cadastro Realizado!</h2>
          <p className="text-zinc-400 mb-8 font-medium">Seja bem-vindo à Comissão Técnica do Piruá E.C. Seu acesso será liberado em breve.</p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 bg-theme-primary text-black font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_4px_20px_rgba(234,179,8,0.3)]"
            >
              Ir para o Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center p-4 py-12 md:py-20 lg:py-32 font-sans">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="w-16 h-16 bg-theme-primary rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            <ShieldCheck className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic leading-none mb-4">
            Comissão <span className="text-theme-primary">Técnica</span>
          </h1>
          <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm max-w-md">Cadastro de novos membros e líderes</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-8">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm font-bold flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          {/* Seção 1: Função */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Cargo e Responsabilidade</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Função que desempenha</label>
                <select 
                  required
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold appearance-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="treinador">Treinador</option>
                  <option value="auxiliar">Auxiliar</option>
                  <option value="medico">Médico</option>
                  <option value="presidente">Presidente</option>
                  <option value="diretor">Diretor</option>
                  <option value="massagista">Massagista</option>
                  <option value="fisioterapeuta">Fisioterapeuta</option>
                  <option value="preparador_fisico">Preparador Físico</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Pessoais */}
          <div className="space-y-6 pt-8 border-t border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-theme-primary/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-theme-primary" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Dados Pessoais</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  required
                  type="text"
                  placeholder="EX: JOÃO DA SILVA"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold uppercase"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF (Apenas números)</label>
                <input 
                  required
                  type="text"
                  maxLength={11}
                  placeholder="00000000000"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold"
                  value={formData.doc}
                  onChange={e => setFormData({...formData, doc: e.target.value.replace(/\D/g, '')})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Nascimento</label>
                <input 
                  required
                  type="date"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold"
                  value={formData.birth_date}
                  onChange={e => setFormData({...formData, birth_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                <input 
                  required
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">URL da Foto (Perfil)</label>
                <input 
                  type="url"
                  placeholder="Link da sua foto"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold"
                  value={formData.photo}
                  onChange={e => setFormData({...formData, photo: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Localização */}
          <div className="space-y-6 pt-8 border-t border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Endereço</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="space-y-2 md:col-span-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Logradouro</label>
                <input 
                  type="text"
                  placeholder="EX: RUA DAS FLORES"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold uppercase"
                  value={formData.street}
                  onChange={e => setFormData({...formData, street: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nº</label>
                <input 
                  type="text"
                  placeholder="123"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold uppercase"
                  value={formData.number}
                  onChange={e => setFormData({...formData, number: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bairro</label>
                <input 
                  type="text"
                  placeholder="CENTRO"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold uppercase"
                  value={formData.neighborhood}
                  onChange={e => setFormData({...formData, neighborhood: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cidade</label>
                <input 
                  type="text"
                  placeholder="CIDADE"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold uppercase"
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">UF</label>
                <input 
                  type="text"
                  maxLength={2}
                  placeholder="PE"
                  className="w-full h-14 bg-zinc-800 border-2 border-zinc-700 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all font-bold uppercase text-center"
                  value={formData.uf}
                  onChange={e => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 bg-theme-primary disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-black uppercase tracking-widest text-lg rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_8px_30px_rgba(234,179,8,0.2)] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Enviando Dados...</span>
                </div>
              ) : "Finalizar Cadastro de Líder"}
            </button>
            <p className="text-center text-[10px] text-zinc-600 font-bold uppercase mt-4 tracking-tighter">Ao clicar você declara que todas as informações acima são verdadeiras e pertencem à sua identidade física.</p>
          </div>
        </form>

        <p className="text-center text-zinc-600 font-bold uppercase text-xs mt-12 tracking-widest opacity-40">Piruá Esporte Clube © 2026 - Gestão de Elite</p>
      </div>
    </div>
  );
}
