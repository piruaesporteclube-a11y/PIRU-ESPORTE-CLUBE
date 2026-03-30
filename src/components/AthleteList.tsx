import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, getSubCategory, categories } from '../types';
import { Search, Filter, Plus, Trash2, Edit2, FileDown, Printer, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';

interface AthleteListProps {
  onEdit: (athlete: Athlete) => void;
  onAdd: () => void;
}

export default function AthleteList({ onEdit, onAdd }: AthleteListProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    const data = await api.getAthletes();
    setAthletes(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este atleta?')) {
      await api.deleteAthlete(id);
      loadAthletes();
    }
  };

  const filteredAthletes = athletes.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.doc.includes(search);
    const matchesSub = filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
    const matchesStatus = filterStatus === 'Todos' || a.status === filterStatus;
    return matchesSearch && matchesSub && matchesStatus;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">Lista Geral de Alunos</h2>
          <p className="text-zinc-400 text-sm">Gerencie todos os atletas da escolinha</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors shadow-lg shadow-theme-primary/20"
          >
            <Plus size={18} />
            Novo Atleta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou documento..." 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value)}
          >
            <option value="Todos">Todas as Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="Todos">Todos os Status</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
      </div>

      <div className="bg-black border border-theme-primary/20 rounded-2xl overflow-hidden shadow-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atleta</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Jersey</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredAthletes.map((athlete) => (
                <tr key={athlete.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {athlete.photo ? (
                        <img src={athlete.photo} className="w-10 h-10 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                          <UserCircle size={24} />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white">{athlete.name}</div>
                        <div className="text-xs text-zinc-500">{athlete.doc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-theme-primary/10 text-theme-primary text-xs font-bold rounded-md">
                      {getSubCategory(athlete.birth_date)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300 font-mono">
                    #{athlete.jersey_number || '--'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold uppercase",
                      athlete.status === 'Ativo' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {athlete.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right no-print">
                    <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(athlete)}
                        className="p-2 hover:bg-theme-primary/10 text-theme-primary rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(athlete.id)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-800">
          {filteredAthletes.map((athlete) => (
            <div key={athlete.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {athlete.photo ? (
                    <img src={athlete.photo} className="w-12 h-12 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                      <UserCircle size={28} />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white">{athlete.name}</div>
                    <div className="text-xs text-zinc-500">{athlete.doc}</div>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  athlete.status === 'Ativo' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {athlete.status}
                </span>
              </div>
              
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-black tracking-wider">Categoria:</span>
                    <span className="text-theme-primary font-bold">{getSubCategory(athlete.birth_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-black tracking-wider">Camisa:</span>
                    <span className="text-theme-primary font-mono font-bold">#{athlete.jersey_number || '--'}</span>
                  </div>
                </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  onClick={() => onEdit(athlete)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors text-xs font-bold"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(athlete.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredAthletes.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            Nenhum atleta encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Print Header (Visible only when printing) */}
      <div className="hidden print-only p-8 text-black bg-white">
        <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase">Piruá Esporte Clube</h1>
          <div className="text-right">
            <p className="font-bold">Lista Geral de Atletas</p>
            <p className="text-sm">Data: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-black p-2 text-left">Nome</th>
              <th className="border border-black p-2 text-left">Doc</th>
              <th className="border border-black p-2 text-left">Nasc.</th>
              <th className="border border-black p-2 text-left">Cat.</th>
              <th className="border border-black p-2 text-left">Jersey</th>
              <th className="border border-black p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAthletes.map(a => (
              <tr key={a.id}>
                <td className="border border-black p-2">{a.name}</td>
                <td className="border border-black p-2">{a.doc}</td>
                <td className="border border-black p-2">{a.birth_date}</td>
                <td className="border border-black p-2">{getSubCategory(a.birth_date)}</td>
                <td className="border border-black p-2">#{a.jersey_number}</td>
                <td className="border border-black p-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
