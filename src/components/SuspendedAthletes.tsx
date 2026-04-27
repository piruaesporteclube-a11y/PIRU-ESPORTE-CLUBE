import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete } from '../types';
import { Search, UserMinus, AlertCircle, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';

interface SuspendedAthletesProps {
  athletes?: Athlete[];
}

export default function SuspendedAthletes({ athletes: athletesProp }: SuspendedAthletesProps) {
  const [suspendedAthletes, setSuspendedAthletes] = useState<Athlete[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { settings } = useTheme();

  useEffect(() => {
    if (athletesProp) {
        setSuspendedAthletes(athletesProp.filter(a => a.status === 'Suspenso'));
    } else {
        loadData();
    }
  }, [athletesProp]);

  const loadData = async () => {
    try {
      const data = await api.getAthletes();
      setSuspendedAthletes(data.filter(a => a.status === 'Suspenso'));
    } catch (error) {
      console.error("Erro ao carregar atletas suspensos:", error);
    }
  };

  const filtered = suspendedAthletes.filter(athlete => 
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 p-6 rounded-3xl border border-zinc-800 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl">
              <UserMinus className="text-red-500" size={24} />
            </div>
            ATLETAS SUSPENSOS
          </h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de atletas com restrição de participação</p>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="PESQUISAR ATLETA SUSPENSO..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-bold text-xs uppercase tracking-widest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-600">
            <UserMinus size={32} />
          </div>
          <h3 className="text-white font-black uppercase mb-1">Nenhum atleta suspenso</h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Não existem atletas com status de suspensão no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((athlete) => (
            <div 
              key={athlete.id}
              className="bg-black border border-zinc-800 rounded-3xl overflow-hidden hover:border-red-500/50 transition-all group flex flex-col"
            >
              <div className="p-6 flex items-start gap-4 flex-1">
                <div className="relative shrink-0">
                  <img 
                    src={athlete.photo} 
                    alt={athlete.name}
                    className="w-20 h-24 object-cover rounded-xl border border-zinc-800 grayscale group-hover:grayscale-0 transition-all"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-black rounded-lg flex items-center justify-center font-black text-xs shadow-lg">
                    <AlertCircle size={16} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-sm uppercase truncate leading-tight">{athlete.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                       {athlete.nickname || 'SEM APELIDO'}
                    </span>
                  </div>
                  
                  <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Motivo da Suspensão:</p>
                    <p className="text-white text-xs font-bold leading-relaxed">
                      {athlete.suspension_reason || 'MOTIVO NÃO INFORMADO'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Responsável</span>
                  <span className="text-[11px] font-bold text-white uppercase">{athlete.guardian_name}</span>
                </div>
                
                {athlete.guardian_phone && (
                  <a 
                    href={`https://wa.me/55${athlete.guardian_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest no-print"
                  >
                    <MessageCircle size={14} />
                    Contatar
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
