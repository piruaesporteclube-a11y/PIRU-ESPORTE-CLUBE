import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete } from '../types';
import { Search, UserMinus, AlertCircle, MessageCircle, Plus, X, Save } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';
import AthleteSearchSelect from './AthleteSearchSelect';
import { toast } from 'react-hot-toast';

interface SuspendedAthletesProps {
  athletes?: Athlete[];
}

export default function SuspendedAthletes({ athletes: athletesProp }: SuspendedAthletesProps) {
  const [suspendedAthletes, setSuspendedAthletes] = useState<Athlete[]>([]);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>(athletesProp || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { settings } = useTheme();

  useEffect(() => {
    if (athletesProp) {
        setAllAthletes(athletesProp);
        setSuspendedAthletes(athletesProp.filter(a => a.status === 'Suspenso'));
    } else {
        loadData();
    }
  }, [athletesProp]);

  const loadData = async () => {
    try {
      const data = await api.getAthletes();
      setAllAthletes(data);
      setSuspendedAthletes(data.filter(a => a.status === 'Suspenso'));
    } catch (error) {
      console.error("Erro ao carregar atletas suspensos:", error);
    }
  };

  const handleSuspend = async () => {
    if (!selectedAthlete) return;
    if (!suspensionReason.trim()) {
      toast.error("Por favor, informe o motivo da suspensão.");
      return;
    }

    setLoading(true);
    try {
      await api.saveAthlete({
        ...selectedAthlete,
        status: 'Suspenso',
        suspension_reason: suspensionReason.toUpperCase()
      });
      toast.success(`${selectedAthlete.name} foi suspenso com sucesso.`);
      setIsModalOpen(false);
      setSelectedAthlete(null);
      setSuspensionReason('');
      loadData();
    } catch (error) {
      toast.error("Erro ao suspender atleta.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (athlete: Athlete) => {
    if (!window.confirm(`Deseja realmente reativar o atleta ${athlete.name}?`)) return;

    try {
      await api.saveAthlete({
        ...athlete,
        status: 'Ativo',
        suspension_reason: ''
      });
      toast.success(`${athlete.name} reativado com sucesso.`);
      loadData();
    } catch (error) {
      toast.error("Erro ao reativar atleta.");
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

        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="PESQUISAR..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-bold text-xs uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            <Plus size={18} />
            Nova Suspensão
          </button>
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
                <button 
                  onClick={() => handleReactivate(athlete)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-green-600 text-zinc-400 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest no-print"
                >
                  Reativar
                </button>
                
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

      {/* Modal Nova Suspensão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                <UserMinus className="text-red-500" size={18} />
                Nova Suspensão
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Selecionar Atleta</label>
                <AthleteSearchSelect 
                  onSelect={(a) => setSelectedAthlete(a)}
                  selectedAthleteId={selectedAthlete?.id}
                  athletes={allAthletes.filter(a => a.status !== 'Suspenso')}
                  className="!bg-zinc-800"
                />
              </div>

              {selectedAthlete && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Motivo da Suspensão</label>
                  <textarea 
                    className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[120px] font-bold text-xs uppercase tracking-widest placeholder:text-zinc-600"
                    placeholder="DESCREVA O MOTIVO DA SUSPENSÃO..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSuspend}
                disabled={loading || !selectedAthlete || !suspensionReason.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {loading ? 'Salvando...' : (
                  <>
                    <Save size={18} />
                    Confirmar Suspensão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
