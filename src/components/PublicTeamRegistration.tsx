import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Championship, ChampionshipTeam, categories } from '../types';
import { Trophy, Upload, Plus, Trash2, Save, User, UserPlus, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils';

export default function PublicTeamRegistration() {
  const { championshipId } = useParams<{ championshipId: string }>();
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  
  const [teamData, setTeamData] = useState<Partial<ChampionshipTeam>>({
    championship_id: championshipId,
    name: '',
    logo: '',
    category: '',
    responsible_name: '',
    responsible_phone: '',
    players: [],
    staff: [],
    status: 'Pendente'
  });

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState('');

  useEffect(() => {
    if (championshipId) {
      api.getChampionships().then(all => {
        const found = all.find(c => c.id === championshipId);
        if (found) {
          setChampionship(found);
          setTeamData(prev => ({ ...prev, category: found.categories[0] }));

          // Check registration period
          const now = new Date();
          if (found.registration_start) {
            const start = new Date(found.registration_start);
            if (now < start) {
              setIsRegistrationOpen(false);
              setRegistrationMessage(`As inscrições para este campeonato ainda não começaram. Elas abrem em ${new Date(found.registration_start).toLocaleDateString()}.`);
            }
          }
          if (found.registration_end) {
            const end = new Date(found.registration_end);
            // Set end to end of day
            end.setHours(23, 59, 59, 999);
            if (now > end) {
              setIsRegistrationOpen(false);
              setRegistrationMessage(`As inscrições para este campeonato foram encerradas em ${new Date(found.registration_end).toLocaleDateString()}.`);
            }
          }
          
          if (found.status !== 'Inscrições Abertas') {
            setIsRegistrationOpen(false);
            setRegistrationMessage('As inscrições para este campeonato não estão abertas no momento.');
          }
        }
        setLoading(false);
      });
    }
  }, [championshipId]);

  const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64, 400, 400, 0.7);
        setTeamData(prev => ({ ...prev, logo: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addPlayer = () => {
    if ((teamData.players?.length || 0) < 22) {
      setTeamData({
        ...teamData,
        players: [...(teamData.players || []), { name: '', doc: '', birth_date: '', photo: '', jersey_number: '' }]
      });
    } else {
      toast.warning("Limite de 22 jogadores atingido");
    }
  };

  const removePlayer = (index: number) => {
    const newPlayers = [...(teamData.players || [])];
    newPlayers.splice(index, 1);
    setTeamData({ ...teamData, players: newPlayers });
  };

  const updatePlayer = (index: number, field: string, value: string) => {
    const newPlayers = [...(teamData.players || [])];
    (newPlayers[index] as any)[field] = value;
    setTeamData({ ...teamData, players: newPlayers });
  };

  const handlePlayerPhoto = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64, 300, 400, 0.6);
        updatePlayer(index, 'photo', compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const addStaff = () => {
    if ((teamData.staff?.length || 0) < 3) {
      setTeamData({
        ...teamData,
        staff: [...(teamData.staff || []), { name: '', role: 'Técnico', doc: '', phone: '' }]
      });
    } else {
      toast.warning("Limite de 3 membros da comissão atingido");
    }
  };

  const removeStaff = (index: number) => {
    const newStaff = [...(teamData.staff || [])];
    newStaff.splice(index, 1);
    setTeamData({ ...teamData, staff: newStaff });
  };

  const updateStaff = (index: number, field: string, value: string) => {
    const newStaff = [...(teamData.staff || [])];
    (newStaff[index] as any)[field] = value;
    setTeamData({ ...teamData, staff: newStaff });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamData.name || !teamData.category) {
      toast.error("Preencha o nome do time e a categoria");
      return;
    }
    if ((teamData.players?.length || 0) === 0) {
      toast.error("Adicione pelo menos um jogador");
      return;
    }

    setLoading(true);
    try {
      // Final validation of data sizes
      const logoSize = teamData.logo?.length || 0;
      const playersSize = teamData.players?.reduce((acc, p) => acc + (p.photo?.length || 0), 0) || 0;
      
      if (logoSize + playersSize > 800000) {
        toast.error("O volume total de fotos é muito grande. Tente usar fotos menores ou com menos resolução.");
        setLoading(false);
        return;
      }

      await api.saveChampionshipTeam(teamData);
      setSubmitted(true);
      toast.success("Inscrição enviada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar inscrição:", err);
      toast.error(err.message || "Erro ao enviar inscrição. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !championship) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-theme-primary"></div>
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Trophy size={64} className="mx-auto text-zinc-800" />
          <h1 className="text-2xl font-bold text-white">Campeonato não encontrado</h1>
          <p className="text-zinc-500">O link que você acessou pode estar incorreto ou o campeonato foi removido.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Inscrição Enviada!</h1>
          <p className="text-zinc-400">
            A inscrição do time <span className="text-theme-primary font-bold">{teamData.name}</span> foi recebida com sucesso.
          </p>
          <p className="text-sm text-zinc-500">
            Agora ela passará por uma análise da organização. Você será informado assim que for aprovada.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-widest hover:opacity-90 transition-all"
          >
            Fazer outra inscrição
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={48} />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Inscrições Encerradas</h1>
          <p className="text-zinc-400">
            {registrationMessage}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="w-full py-4 bg-zinc-800 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-zinc-700 transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-theme-primary/10 text-theme-primary rounded-3xl mb-4">
            <Trophy size={48} />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{championship.name}</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">{championship.description}</p>
          <div className="flex justify-center gap-4">
            <span className="px-4 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold rounded-full uppercase tracking-widest">
              {championship.dispute_format}
            </span>
            <span className="px-4 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full uppercase tracking-widest">
              Inscrições Abertas
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Team Info */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8 space-y-8">
            <div className="flex items-center gap-4 border-l-4 border-theme-primary pl-4">
              <Shield className="text-theme-primary" size={24} />
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Informações do Time</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-32 h-32 bg-zinc-800 rounded-3xl border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden group-hover:border-theme-primary transition-all">
                    {teamData.logo ? (
                      <img src={teamData.logo} className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-zinc-600" size={32} />
                    )}
                  </div>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Escudo do Time</p>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Time</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all uppercase font-bold"
                    placeholder="EX: PIRUÁ FC"
                    value={teamData.name}
                    onChange={e => setTeamData({...teamData, name: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Responsável</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all uppercase font-bold"
                    placeholder="NOME DO RESPONSÁVEL"
                    value={teamData.responsible_name}
                    onChange={e => setTeamData({...teamData, responsible_name: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">WhatsApp do Responsável</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all uppercase font-bold"
                    placeholder="(00) 00000-0000"
                    value={teamData.responsible_phone}
                    onChange={e => setTeamData({...teamData, responsible_phone: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Categoria</label>
                  <select 
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all uppercase font-bold"
                    value={teamData.category}
                    onChange={e => setTeamData({...teamData, category: e.target.value})}
                  >
                    {championship.categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Players Section */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8 space-y-8">
            <div className="flex items-center justify-between border-l-4 border-theme-primary pl-4">
              <div className="flex items-center gap-4">
                <UserPlus className="text-theme-primary" size={24} />
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Jogadores ({teamData.players?.length || 0}/22)</h2>
              </div>
              <button 
                type="button" 
                onClick={addPlayer}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black text-xs font-black rounded-xl uppercase tracking-widest hover:opacity-90 transition-all"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {teamData.players?.map((player, index) => (
                <div key={index} className="bg-zinc-800/30 border border-zinc-800 rounded-3xl p-6 relative group">
                  <button 
                    type="button" 
                    onClick={() => removePlayer(index)}
                    className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-20 h-24 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center overflow-hidden">
                        {player.photo ? (
                          <img src={player.photo} className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-zinc-700" size={24} />
                        )}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handlePlayerPhoto(index, e)} />
                      </div>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase">Foto 3x4</p>
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Nome Completo</label>
                        <input 
                          required 
                          type="text" 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                          value={player.name}
                          onChange={e => updatePlayer(index, 'name', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">CPF/RG</label>
                        <input 
                          required 
                          type="text" 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                          value={player.doc}
                          onChange={e => updatePlayer(index, 'doc', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Data de Nascimento</label>
                        <input 
                          required 
                          type="date" 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all"
                          value={player.birth_date}
                          onChange={e => updatePlayer(index, 'birth_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Nº Camisa</label>
                        <input 
                          required 
                          type="text" 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                          value={player.jersey_number}
                          onChange={e => updatePlayer(index, 'jersey_number', e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(teamData.players?.length || 0) === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                  <p className="text-zinc-600 uppercase font-black text-xs tracking-widest">Nenhum jogador adicionado</p>
                </div>
              )}
            </div>
          </section>

          {/* Staff Section */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8 space-y-8">
            <div className="flex items-center justify-between border-l-4 border-theme-primary pl-4">
              <div className="flex items-center gap-4">
                <Shield className="text-theme-primary" size={24} />
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Comissão Técnica ({teamData.staff?.length || 0}/3)</h2>
              </div>
              <button 
                type="button" 
                onClick={addStaff}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black text-xs font-black rounded-xl uppercase tracking-widest hover:opacity-90 transition-all"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {teamData.staff?.map((s, index) => (
                <div key={index} className="bg-zinc-800/30 border border-zinc-800 rounded-3xl p-6 relative">
                  <button 
                    type="button" 
                    onClick={() => removeStaff(index)}
                    className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Nome Completo</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                        value={s.name}
                        onChange={e => updateStaff(index, 'name', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Cargo</label>
                      <select 
                        required 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                        value={s.role}
                        onChange={e => updateStaff(index, 'role', e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Auxiliar">Auxiliar</option>
                        <option value="Massagista">Massagista</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">CPF/RG</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                        value={s.doc}
                        onChange={e => updateStaff(index, 'doc', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">WhatsApp</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-theme-primary transition-all uppercase font-bold"
                        value={s.phone}
                        onChange={e => updateStaff(index, 'phone', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 bg-theme-primary text-black font-black rounded-3xl uppercase tracking-widest hover:opacity-90 transition-all shadow-2xl shadow-theme-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-black"></div>
            ) : (
              <>
                <Save size={24} />
                Finalizar Inscrição do Time
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
