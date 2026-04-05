import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search } from 'lucide-react';
import { api } from '../api';
import { Athlete, getSubCategory } from '../types';
import { motion } from 'motion/react';
import { cn } from '../utils';

export default function ModalityList() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getAthletes().then(data => {
      setAthletes(data);
      setLoading(false);
    });
  }, []);

  const modalities = [
    'FUTEBOL DE CAMPO',
    'FUTSAL',
    'VOLÊI',
    'CORRIDA DE RUA',
    'OUTROS'
  ];

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.doc.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Modalidades Esportivas</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Atletas por categoria</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-theme-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="BUSCAR ATLETA..."
            className="pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none w-full md:w-64 uppercase font-bold tracking-widest transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modalities.map((modality) => {
          const modalityAthletes = filteredAthletes.filter(a => (a.modality || 'OUTROS').toUpperCase() === modality);
          
          return (
            <motion.div
              key={modality}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-theme-primary/50 transition-all"
            >
              <div className="p-4 border-b border-zinc-800 bg-black/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-theme-primary/10 rounded-lg">
                    <Trophy className="text-theme-primary" size={18} />
                  </div>
                  <h3 className="font-black text-white text-sm tracking-tight uppercase italic">{modality}</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded-lg">
                  <Users size={12} className="text-zinc-500" />
                  <span className="text-[10px] font-black text-white">{modalityAthletes.length}</span>
                </div>
              </div>

              <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                {modalityAthletes.length > 0 ? (
                  <div className="space-y-1">
                    {modalityAthletes.map(athlete => (
                      <div 
                        key={athlete.id}
                        className="p-2 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-between group/item"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden">
                            {athlete.photo ? (
                              <img src={athlete.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <Users size={14} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{athlete.name}</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{getSubCategory(athlete.birth_date)}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                          athlete.status === 'Ativo' ? "bg-theme-primary/20 text-theme-primary" : "bg-red-500/20 text-red-500"
                        )}>
                          {athlete.status === 'Ativo' ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Nenhum atleta</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
