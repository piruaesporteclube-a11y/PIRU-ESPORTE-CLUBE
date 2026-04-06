import React, { useState, useEffect } from 'react';
import { Athlete, getSubCategory, categories } from '../types';
import { Search, Filter, MessageCircle, User, Phone, UserCheck } from 'lucide-react';
import { cn } from '../utils';
import { useTheme } from '../contexts/ThemeContext';

interface ContactListProps {
  athletes: Athlete[];
}

export default function ContactList({ athletes }: ContactListProps) {
  const { settings } = useTheme();
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('Todos');

  const filteredAthletes = athletes
    .filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                           a.doc.includes(search) ||
                           (a.nickname && a.nickname.toLowerCase().includes(search.toLowerCase()));
      const matchesSub = filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
      return matchesSearch && matchesSub;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const openWhatsApp = (phone: string, message: string = "") => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const url = `https://wa.me/55${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Lista de Contatos</h2>
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Entre em contato rapidamente com atletas e responsáveis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOME OU CPF..." 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-bold text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none uppercase font-bold text-sm"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value)}
          >
            <option value="Todos">TODAS AS CATEGORIAS</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAthletes.map((athlete) => (
          <div key={athlete.id} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 hover:border-theme-primary/30 transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
                {athlete.photo ? (
                  <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <User size={24} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-white uppercase text-sm truncate leading-tight">
                  {athlete.nickname ? `${athlete.nickname} (${athlete.name})` : athlete.name}
                </h3>
                <p className="text-[10px] text-theme-primary font-bold uppercase tracking-widest mt-1">
                  {getSubCategory(athlete.birth_date)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {athlete.contact && (
                <button 
                  onClick={() => openWhatsApp(athlete.contact, `Olá ${athlete.name}, tudo bem?`)}
                  className="w-full flex items-center justify-between p-3 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl transition-all group/btn"
                >
                  <div className="flex items-center gap-3">
                    <Phone size={16} />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tighter opacity-70">Atleta</p>
                      <p className="text-xs font-bold">{athlete.contact}</p>
                    </div>
                  </div>
                  <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              )}

              {athlete.guardian_phone && (
                <button 
                  onClick={() => openWhatsApp(athlete.guardian_phone, `Olá ${athlete.guardian_name}, tudo bem? Falamos do Piruá E.C. sobre o atleta ${athlete.name}.`)}
                  className="w-full flex items-center justify-between p-3 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary rounded-xl transition-all group/btn"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck size={16} />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-tighter opacity-70">Responsável: {athlete.guardian_name}</p>
                      <p className="text-xs font-bold">{athlete.guardian_phone}</p>
                    </div>
                  </div>
                  <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              )}

              {!athlete.contact && !athlete.guardian_phone && (
                <div className="p-4 text-center text-zinc-600 italic text-xs">
                  Nenhum contato cadastrado
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAthletes.length === 0 && (
        <div className="p-12 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhum contato encontrado</p>
        </div>
      )}
    </div>
  );
}
