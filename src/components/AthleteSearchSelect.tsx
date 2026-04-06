import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete } from '../types';
import { Search, User, ChevronDown, X, Filter } from 'lucide-react';
import { cn } from '../utils';
import { getSubCategory, categories } from '../types';

interface AthleteSearchSelectProps {
  onSelect: (athlete: Athlete) => void;
  placeholder?: string;
  className?: string;
  selectedAthleteId?: string;
}

export default function AthleteSearchSelect({ onSelect, placeholder = "PESQUISAR ATLETA...", className, selectedAthleteId }: AthleteSearchSelectProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSub, setFilterSub] = useState('Todos');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAthletes = async () => {
      setLoading(true);
      try {
        const data = await api.getAthletes();
        setAthletes(data);
      } catch (err) {
        console.error("Erro ao carregar atletas:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAthletes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAthletes = athletes
    .filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (a.nickname && a.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           a.doc.includes(searchTerm);
      const matchesSub = filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
      return matchesSearch && matchesSub;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-zinc-800 border border-zinc-700 rounded-2xl text-white flex items-center justify-between cursor-pointer hover:border-theme-primary/50 transition-all group"
      >
        <div className="flex items-center gap-3 truncate">
          <User size={20} className="text-zinc-500 group-hover:text-theme-primary transition-colors" />
          <span className={cn("font-bold uppercase truncate", !selectedAthlete && "text-zinc-500")}>
            {selectedAthlete ? selectedAthlete.name : placeholder}
          </span>
        </div>
        <ChevronDown size={20} className={cn("text-zinc-500 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-zinc-800 bg-black/20 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                autoFocus
                type="text"
                placeholder="DIGITE O NOME OU CPF..."
                className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm uppercase font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs uppercase font-bold appearance-none"
                value={filterSub}
                onChange={(e) => setFilterSub(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="Todos">TODAS AS CATEGORIAS</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                Carregando atletas...
              </div>
            ) : filteredAthletes.length > 0 ? (
              filteredAthletes.map((athlete) => (
                <div 
                  key={athlete.id}
                  onClick={() => {
                    onSelect(athlete);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "px-6 py-4 hover:bg-theme-primary hover:text-black cursor-pointer transition-colors flex items-center gap-4 border-b border-zinc-800/50 last:border-0",
                    selectedAthleteId === athlete.id && "bg-theme-primary/10 text-theme-primary"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                    {athlete.photo ? (
                      <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase text-sm truncate">{athlete.name}</p>
                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
                      {athlete.nickname ? `${athlete.nickname} • ` : ''} CPF: {athlete.doc}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-600">
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum atleta encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
