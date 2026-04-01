import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Attendance, getSubCategory, categories } from '../types';
import { BarChart3, PieChart, Users, UserMinus, UserCheck, Calendar, Filter, Printer } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

export default function Reports() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const { settings } = useTheme();
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterSub, setFilterSub] = useState('Todos');

  useEffect(() => {
    api.getAthletes().then(setAthletes);
    api.getAttendance().then(setAttendance);
  }, []);

  const activeCount = athletes.filter(a => a.status === 'Ativo').length;
  const inactiveCount = athletes.filter(a => a.status === 'Inativo').length;

  const filteredAttendance = attendance.filter(att => {
    const attDate = parseISO(att.date);
    const start = startOfMonth(parseISO(`${filterMonth}-01`));
    const end = endOfMonth(start);
    const matchesMonth = isWithinInterval(attDate, { start, end });
    
    const athlete = athletes.find(a => a.id === att.athlete_id);
    const matchesSub = filterSub === 'Todos' || (athlete && getSubCategory(athlete.birth_date) === filterSub);
    
    return matchesMonth && matchesSub;
  });

  const absencesWithJustification = filteredAttendance.filter(att => att.status === 'Faltou' && att.justification);

  return (
    <div className="space-y-8">
      {/* Print Header */}
      <div className="hidden print-only mb-8 border-b-2 border-black pb-4">
        <div className="flex items-center gap-4">
          {settings?.schoolCrest && (
            <img src={settings.schoolCrest} alt="Crest" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
            <p className="text-sm font-bold text-zinc-600">Relatórios e Estatísticas</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">Relatórios e Estatísticas</h2>
          <p className="text-zinc-400 text-sm">Acompanhe o desempenho e frequência da escolinha</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
        >
          <Printer size={18} />
          Imprimir Relatório
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
              <Users size={24} />
            </div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Total de Alunos</h3>
          </div>
          <p className="text-4xl font-black text-white">{athletes.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
              <UserCheck size={24} />
            </div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Ativos</h3>
          </div>
          <p className="text-4xl font-black text-green-500">{activeCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
              <UserMinus size={24} />
            </div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Inativos</h3>
          </div>
          <p className="text-4xl font-black text-red-500">{inactiveCount}</p>
        </div>
      </div>

      {/* Attendance Justifications */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2">
            <BarChart3 size={20} className="text-theme-primary" />
            Justificativas de Faltas
          </h3>
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
            <select 
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
              value={filterSub}
              onChange={(e) => setFilterSub(e.target.value)}
            >
              <option value="Todos">Todas Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atleta</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {absencesWithJustification.map((att) => {
                const athlete = athletes.find(a => a.id === att.athlete_id);
                return (
                  <tr key={att.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-300 font-mono">{att.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white uppercase">{athlete?.name || 'Desconhecido'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400 italic">"{att.justification}"</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-800">
          {absencesWithJustification.map((att) => {
            const athlete = athletes.find(a => a.id === att.athlete_id);
            return (
              <div key={att.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-zinc-500">{att.date}</span>
                  <span className="text-[10px] font-bold text-theme-primary uppercase tracking-widest">
                    {athlete ? getSubCategory(athlete.birth_date) : ''}
                  </span>
                </div>
                <div className="font-bold text-white uppercase text-sm">{athlete?.name || 'Desconhecido'}</div>
                <div className="text-xs text-zinc-400 italic bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
                  "{att.justification}"
                </div>
              </div>
            );
          })}
        </div>

        {absencesWithJustification.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500 italic">
            Nenhuma justificativa encontrada para este período.
          </div>
        )}
      </div>

      {/* Print View */}
      <div className="hidden print-only p-12 text-black bg-white">
        <div className="flex items-center justify-between mb-8 border-b-4 border-black pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase">Piruá Esporte Clube</h1>
            <h2 className="text-xl font-bold uppercase">Relatório de Frequência e Justificativas</h2>
          </div>
          {settings.schoolCrest && (
            <img src={settings.schoolCrest} className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="border-2 border-black p-4 text-center">
            <p className="text-xs font-bold uppercase">Total Alunos</p>
            <p className="text-3xl font-black">{athletes.length}</p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-xs font-bold uppercase">Ativos</p>
            <p className="text-3xl font-black">{activeCount}</p>
          </div>
          <div className="border-2 border-black p-4 text-center">
            <p className="text-xs font-bold uppercase">Inativos</p>
            <p className="text-3xl font-black">{inactiveCount}</p>
          </div>
        </div>

        <h3 className="text-lg font-bold uppercase mb-4">Justificativas de Faltas</h3>
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border-2 border-black p-2 text-left">Data</th>
              <th className="border-2 border-black p-2 text-left">Atleta</th>
              <th className="border-2 border-black p-2 text-left">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {absencesWithJustification.map(att => (
              <tr key={att.id}>
                <td className="border-2 border-black p-2">{att.date}</td>
                <td className="border-2 border-black p-2 font-bold uppercase">{athletes.find(a => a.id === att.athlete_id)?.name}</td>
                <td className="border-2 border-black p-2 italic">"{att.justification}"</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
