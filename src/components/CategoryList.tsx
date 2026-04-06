import React, { useState } from 'react';
import { Athlete, categories, getSubCategory } from '../types';
import { Users, ChevronRight, Search, Filter } from 'lucide-react';
import { cn } from '../utils';
import AthleteList from './AthleteList';

interface CategoryListProps {
  athletes: Athlete[];
  onEditAthlete: (athlete: Athlete) => void;
  onAddAthlete: () => void;
  onRefresh: () => void;
}

export default function CategoryList({ athletes, onEditAthlete, onAddAthlete, onRefresh }: CategoryListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const categoryStats = categories.map(cat => ({
    name: cat,
    count: athletes.filter(a => getSubCategory(a.birth_date) === cat).length,
    active: athletes.filter(a => getSubCategory(a.birth_date) === cat && a.status === 'Ativo').length
  }));

  if (selectedCategory) {
    const categoryAthletes = athletes.filter(a => getSubCategory(a.birth_date) === selectedCategory);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
          >
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedCategory}</h2>
            <p className="text-zinc-500 text-sm uppercase tracking-widest">Visualizando atletas desta categoria</p>
          </div>
        </div>

        <AthleteList 
          athletes={categoryAthletes}
          onAdd={onAddAthlete}
          onEdit={onEditAthlete}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  const filteredCategories = categoryStats.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Categorias (SUB)</h2>
        <p className="text-zinc-400 uppercase tracking-widest text-sm">Gerencie os atletas divididos por ano de nascimento</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" 
          placeholder="BUSCAR CATEGORIA..." 
          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-bold text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCategories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl hover:border-theme-primary/50 transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={80} />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <ChevronRight size={20} className="text-zinc-600 group-hover:text-theme-primary transition-colors" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{cat.name}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{cat.count} Atletas</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{cat.active} Ativos</span>
            </div>
          </button>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-12 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhuma categoria encontrada</p>
        </div>
      )}
    </div>
  );
}
