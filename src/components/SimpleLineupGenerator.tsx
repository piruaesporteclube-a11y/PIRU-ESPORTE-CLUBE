import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Event, Athlete, Professor, getSubCategory } from '../types';
import { Clipboard, Check, Printer, Users, Calendar, MapPin, Clock, Award, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface SimpleLineupGeneratorProps {
  event: Event;
  allLineups: {
    athletes: Athlete[];
    staff: Professor[];
    lineup_index: number;
    category?: string;
    lineup_name?: string;
  }[];
}

export default function SimpleLineupGenerator({ event, allLineups }: SimpleLineupGeneratorProps) {
  const { settings } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'by_list' | 'by_age_group' | 'general'>('by_list');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const primaryColor = settings?.primaryColor || '#fbbf24';
  const schoolName = settings?.schoolName || 'Piruá Esporte Clube';

  // 1. Lineups active in this event (indexes that have data)
  const activeEventLineups = allLineups.filter(
    (l) => l.athletes.length > 0 || l.staff.length > 0 || (l.lineup_name && l.lineup_name.trim() !== '')
  );

  // 2. All unique athletes across ALL lineups
  const allSummonedAthletes: Athlete[] = [];
  const athleteIdsSeen = new Set<string>();

  activeEventLineups.forEach((lineup) => {
    lineup.athletes.forEach((athlete) => {
      if (!athleteIdsSeen.has(athlete.id)) {
        athleteIdsSeen.add(athlete.id);
        allSummonedAthletes.push(athlete);
      }
    });
  });

  // Sort athletes by name
  allSummonedAthletes.sort((a, b) => a.name.localeCompare(b.name));

  // 3. All unique staff across ALL lineups
  const allSummonedStaff: Professor[] = [];
  const staffIdsSeen = new Set<string>();

  activeEventLineups.forEach((lineup) => {
    lineup.staff.forEach((s) => {
      if (!staffIdsSeen.has(s.id)) {
        staffIdsSeen.add(s.id);
        allSummonedStaff.push(s);
      }
    });
  });

  allSummonedStaff.sort((a, b) => a.name.localeCompare(b.name));

  // 4. Group unique athletes by absolute Age Category (SUB) from birth date
  const ageGroups: Record<string, Athlete[]> = {};
  allSummonedAthletes.forEach((athlete) => {
    const sub = getSubCategory(athlete.birth_date);
    if (!ageGroups[sub]) {
      ageGroups[sub] = [];
    }
    ageGroups[sub].push(athlete);
  });

  // Sort athletes within each group
  Object.keys(ageGroups).forEach((sub) => {
    ageGroups[sub].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Copy helper
  const handleCopyToClipboard = (textId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(textId);
    toast.success('Lista copiada com sucesso!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Plain text formatting functions for WhatsApp
  const formatListText = (lineup: typeof activeEventLineups[0]) => {
    const listName = lineup.lineup_name || `Lista ${lineup.lineup_index + 1}`;
    const categoriesText = lineup.category ? ` (${lineup.category})` : '';
    
    let text = `🏆 *${schoolName.toUpperCase()}* 🏆\n`;
    text += `*ESCALAÇÃO OFICIAL – ${listName.toUpperCase()}${categoriesText.toUpperCase()}*\n\n`;
    text += `📅 *EVENTO:* ${event.name}\n`;
    text += `📆 *DATA:* ${event.start_date} às ${event.start_time}\n`;
    text += `📍 *LOCAL:* ${event.city}/${event.uf} - ${event.neighborhood || ''}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (lineup.athletes.length > 0) {
      text += `👤 *ATLETAS CONVOCADOS (${lineup.athletes.length}):*\n`;
      lineup.athletes.sort((a, b) => a.name.localeCompare(b.name)).forEach((a, idx) => {
        const num = (idx + 1).toString().padStart(2, '0');
        const nickname = a.nickname ? ` "${a.nickname.toUpperCase()}"` : '';
        const position = a.position ? ` - ${a.position}` : '';
        text += `${num}. *${a.name}${nickname}* (#${a.jersey_number || 'S/N'}${position})\n`;
      });
      text += `\n`;
    } else {
      text += `❌ NENHUM ATLETA ADICIONADO\n\n`;
    }

    if (lineup.staff.length > 0) {
      text += `💼 *COMISSÃO TÉCNICA:*\n`;
      lineup.staff.forEach((s) => {
        text += `• *${s.name}* (${s.role || 'Professor'})\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🍀 *União, Força e Glória!* 🍀`;
    return text;
  };

  const formatAgeGroupText = (subName: string, athletesList: Athlete[]) => {
    let text = `🏆 *${schoolName.toUpperCase()}* 🏆\n`;
    text += `*ESCALAÇÃO OFICIAL – ${subName.toUpperCase()}*\n\n`;
    text += `📅 *EVENTO:* ${event.name}\n`;
    text += `📆 *DATA:* ${event.start_date} às ${event.start_time}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *ATLETAS CONVOCADOS (${athletesList.length}):*\n`;
    athletesList.forEach((a, idx) => {
      const num = (idx + 1).toString().padStart(2, '0');
      const nickname = a.nickname ? ` "${a.nickname.toUpperCase()}"` : '';
      const position = a.position ? ` - ${a.position}` : '';
      text += `${num}. *${a.name}${nickname}* (#${a.jersey_number || 'S/N'}${position})\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🍀 *União, Força e Glória!* 🍀`;
    return text;
  };

  const formatGeneralText = () => {
    let text = `🏆 *${schoolName.toUpperCase()}* 🏆\n`;
    text += `*CONVOCAÇÃO EXTRA OFICIAL GERAL*\n\n`;
    text += `📅 *EVENTO:* ${event.name}\n`;
    text += `📆 *DATA:* ${event.start_date} às ${event.start_time}\n`;
    text += `📍 *LOCAL:* ${event.city}/${event.uf}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👥 *TODOS OS ATLETAS INTEGRADOS (${allSummonedAthletes.length}):*\n`;
    allSummonedAthletes.forEach((a, idx) => {
      const num = (idx + 1).toString().padStart(2, '0');
      const nickname = a.nickname ? ` "${a.nickname.toUpperCase()}"` : '';
      const sub = getSubCategory(a.birth_date);
      text += `${num}. *${a.name}${nickname}* - #${a.jersey_number || 'S/N'} (${sub})\n`;
    });
    text += `\n`;

    if (allSummonedStaff.length > 0) {
      text += `💼 *COMISSÃO TÉCNICA COMPLETA:*\n`;
      allSummonedStaff.forEach((s) => {
        text += `• *${s.name}* (${s.role || 'Staff'})\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🍀 *União, Força e Glória!* 🍀`;
    return text;
  };

  const triggerPrintArea = (elementId: string) => {
    const printContents = document.getElementById(elementId)?.innerHTML;
    if (!printContents) return;
    
    const originalContents = document.body.innerHTML;
    const style = `
      <style>
        body { background: white; color: black; font-family: sans-serif; padding: 20px; }
        .no-print { display: none !important; }
        .print-card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid; }
        .print-header { border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }
        .print-title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
        .print-subtitle { font-size: 14px; color: #555; text-transform: uppercase; margin-top: 5px; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 5px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid black; padding: 6px; text-align: left; font-size: 12px; }
        th { background-color: #f2f2f2; }
      </style>
    `;
    
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
        <html>
          <head>
            <title>Impressão de Escalação Simples</title>
            ${style}
          </head>
          <body onload="window.print();window.close()">
            ${printContents}
          </body>
        </html>
      `);
      popupWin.document.close();
    }
  };

  return (
    <div className="space-y-6 flex-1 min-h-[50vh] flex flex-col no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Clipboard size={18} className="text-theme-primary" />
            Emissão de Lista Simples
          </h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Gere formatos limpos para copypasta ou comunicação direta por grupos
          </p>
        </div>
        
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('by_list')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
              activeSubTab === 'by_list' ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Por Lista de SUBs
          </button>
          <button
            onClick={() => setActiveSubTab('by_age_group')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
              activeSubTab === 'by_age_group' ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Por Idade (Sub)
          </button>
          <button
            onClick={() => setActiveSubTab('general')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
              activeSubTab === 'general' ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Lista Geral
          </button>
        </div>
      </div>

      {activeEventLineups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 bg-zinc-950/20 border border-zinc-800/80 border-dashed rounded-[2.5rem] p-8 text-center text-zinc-500">
          <ShieldAlert size={48} className="text-zinc-700 mb-4" />
          <p className="font-black uppercase text-sm tracking-wider">Nenhuma lista ou atleta escalado</p>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mt-2 max-w-sm leading-relaxed">
            Adicione atletas e comissões técnicas nas Listas Gerais para que os relatórios limpos sejam calculados aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 overflow-y-auto max-h-[55vh] pr-2">
          
          {/* Sub Tab: Grouped by the created lists/SUB indices */}
          {activeSubTab === 'by_list' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest bg-theme-primary/10 px-3 py-1.5 rounded-xl">
                  {activeEventLineups.length} listas categorizadas encontradas
                </span>
                <button
                  onClick={() => triggerPrintArea('print-all-by-list')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-theme-primary text-zinc-350 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  <Printer size={12} />
                  Imprimir Todas
                </button>
              </div>

              <div id="print-all-by-list" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeEventLineups.map((lineup) => {
                  const listName = lineup.lineup_name || `Lista ${lineup.lineup_index + 1}`;
                  const keyText = formatListText(lineup);
                  const innerElementId = `print-list-${lineup.lineup_index}`;

                  return (
                    <div
                      key={lineup.lineup_index}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-all group"
                    >
                      <div id={innerElementId} className="print-card">
                        <div className="print-header hidden">
                          <h1 className="print-title">{schoolName}</h1>
                          <h2 className="print-subtitle">{listName} {lineup.category ? `(${lineup.category})` : ''}</h2>
                          <p style={{ fontSize: '10px', color: '#555' }}>Evento: {event.name} - {event.start_date}</p>
                        </div>

                        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4 mb-4 no-print">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">CONVOCAÇÃO COMPACTA</span>
                            <h4 className="text-base font-black text-white uppercase truncate mt-0.5 tracking-tight">
                              {listName}
                            </h4>
                            {lineup.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-[8px] font-black uppercase tracking-wider rounded">
                                Vínculo: {lineup.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => triggerPrintArea(innerElementId)}
                              title="Imprimir esta lista"
                              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                            >
                              <Printer size={13} />
                            </button>
                            <button
                              onClick={() => handleCopyToClipboard(`list-${lineup.lineup_index}`, keyText)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-theme-primary text-black hover:opacity-90 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider"
                            >
                              {copiedId === `list-${lineup.lineup_index}` ? (
                                <>
                                  <Check size={11} />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Clipboard size={11} />
                                  COPIAR ZIP
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {lineup.athletes.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Users size={11} />
                                Atletas ({lineup.athletes.length})
                              </p>
                              <ul className="space-y-1 bg-black/40 border border-zinc-850 rounded-2xl p-3 max-h-[180px] overflow-y-auto">
                                {lineup.athletes
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((a, idx) => (
                                    <li key={a.id} className="flex justify-between items-center text-xs text-zinc-350 hover:text-white py-0.5 border-b border-zinc-900/45 last:border-0">
                                      <span className="font-bold truncate max-w-[200px] uppercase">
                                        <span className="text-[10px] text-zinc-600 font-medium mr-1.5">
                                          {(idx + 1).toString().padStart(2, '0')}
                                        </span>
                                        {a.name} {a.nickname ? `"${a.nickname}"` : ''}
                                      </span>
                                      <span className="font-mono text-[10px] text-zinc-500 font-extrabold bg-zinc-900 px-1.5 py-0.5 rounded">
                                        #{a.jersey_number || 'S/N'}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-600 italic">Sem convocados</p>
                          )}

                          {lineup.staff.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                                Comissão Técnica
                              </p>
                              <div className="bg-zinc-950/40 rounded-xl p-2 px-3 border border-zinc-900">
                                {lineup.staff.map((s) => (
                                  <p key={s.id} className="text-[10px] font-bold text-zinc-400 uppercase">
                                    • {s.name} <span className="text-[8px] text-zinc-600 font-black">({s.role || 'Professor'})</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub Tab: Grouped strictly by Age Categories based on physical athletes */}
          {activeSubTab === 'by_age_group' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest bg-theme-primary/10 px-3 py-1.5 rounded-xl">
                  {Object.keys(ageGroups).length} categorias de idade convocadas
                </span>
                <button
                  onClick={() => triggerPrintArea('print-all-by-age')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-theme-primary text-zinc-350 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  <Printer size={12} />
                  Imprimir Todas
                </button>
              </div>

              <div id="print-all-by-age" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(ageGroups)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([subName, list]) => {
                    const keyText = formatAgeGroupText(subName, list);
                    const innerElementId = `print-age-${subName.replace(/\s+/g, '-')}`;

                    return (
                      <div
                        key={subName}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-all"
                      >
                        <div id={innerElementId} className="print-card">
                          <div className="print-header hidden">
                            <h1 className="print-title">{schoolName}</h1>
                            <h2 className="print-subtitle">{subName}</h2>
                            <p style={{ fontSize: '10px', color: '#555' }}>Evento: {event.name} - {event.start_date}</p>
                          </div>

                          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4 mb-4 no-print">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">DADO INTEGRADO DOS NASCIMENTOS</span>
                              <h4 className="text-base font-black text-white uppercase truncate mt-0.5 tracking-tight flex items-center gap-2">
                                <Award size={15} className="text-theme-primary" />
                                {subName}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => triggerPrintArea(innerElementId)}
                                title="Imprimir"
                                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                onClick={() => handleCopyToClipboard(`age-${subName}`, keyText)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-theme-primary text-black hover:opacity-90 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider"
                              >
                                {copiedId === `age-${subName}` ? (
                                  <>
                                    <Check size={11} />
                                    Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Clipboard size={11} />
                                    COPIAR ZIP
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Users size={11} />
                              Atletas Inscritos ({list.length})
                            </p>
                            <ul className="space-y-1 bg-black/40 border border-zinc-850 rounded-2xl p-3 max-h-[180px] overflow-y-auto">
                              {list.map((a, idx) => (
                                <li key={a.id} className="flex justify-between items-center text-xs text-zinc-350 hover:text-white py-0.5 border-b border-zinc-900/45 last:border-0">
                                  <span className="font-bold truncate max-w-[200px] uppercase">
                                    <span className="text-[10px] text-zinc-600 font-medium mr-1.5">
                                      {(idx + 1).toString().padStart(2, '0')}
                                    </span>
                                    {a.name} {a.nickname ? `"${a.nickname}"` : ''}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {a.position && <span className="text-[8px] text-zinc-500 font-black bg-zinc-900 border border-zinc-800/40 px-1 py-0.5 rounded uppercase">{a.position.split(',')[0]}</span>}
                                    <span className="font-mono text-[10px] text-zinc-500 font-extrabold bg-zinc-900 px-1.5 py-0.5 rounded">
                                      #{a.jersey_number || 'S/N'}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Sub Tab: General Consolidated List */}
          {activeSubTab === 'general' && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-6 lg:p-8 hover:border-zinc-700 transition-all">
              <div id="print-general-complete" className="print-card">
                <div className="print-header hidden">
                  <h1 className="print-title">{schoolName}</h1>
                  <h2 className="print-subtitle">Sumário / Convocação Geral</h2>
                  <p style={{ fontSize: '10px', color: '#555' }}>Evento: {event.name} - Data: {event.start_date}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 mb-6 no-print">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">CONVOCADOS TOTAIS SEM REPETIÇÕES</span>
                    <h4 className="text-xl font-black text-white uppercase tracking-tighter mt-0.5 flex items-center gap-2">
                      <Users size={20} className="text-theme-primary" />
                      Lista Geral Consolidada
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => triggerPrintArea('print-general-complete')}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <Printer size={14} />
                      Imprimir
                    </button>
                    <button
                      onClick={() => handleCopyToClipboard('general-all', formatGeneralText())}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-theme-primary text-black hover:opacity-90 rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-theme-primary/10"
                    >
                      {copiedId === 'general-all' ? (
                        <>
                          <Check size={14} />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Clipboard size={14} />
                          COPIAR WHATSAPP GERAL
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Brief details */}
                  <div className="lg:col-span-1 space-y-4 no-print">
                    <div className="bg-black/40 border border-zinc-850 p-5 rounded-3xl space-y-4">
                      <h5 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2.5">
                        <Calendar size={14} className="text-theme-primary" />
                        Sumário do Evento
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">EVENTO</p>
                          <p className="text-sm font-bold text-zinc-200 mt-0.5">{event.name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">LARGADA</p>
                          <p className="text-xs font-semibold text-zinc-350 mt-0.5">{event.start_date} às {event.start_time}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">LOCAL</p>
                          <p className="text-xs font-semibold text-zinc-350 mt-0.5">{event.city}/{event.uf} - {event.neighborhood || ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-theme-primary/5 border border-theme-primary/20 p-5 rounded-3xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-theme-primary uppercase">Total Atletas</span>
                        <span className="text-base font-black text-white">{allSummonedAthletes.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase">Total Comissão</span>
                        <span className="text-sm font-bold text-zinc-300">{allSummonedStaff.length}</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-zinc-500 text-[9px] font-black uppercase">
                        <span>Único e Consolidado</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (spanning 2 columns in large): Table of Convocados */}
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <p className="text-xs font-black text-theme-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Users size={14} />
                        ATLETAS CONVOCADOS COMPLETO ({allSummonedAthletes.length})
                      </p>
                      
                      <div className="bg-black/30 border border-zinc-850 rounded-[2rem] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-950/70 border-b border-zinc-850">
                              <th className="px-4 py-3 text-[9px] font-black tracking-widest text-zinc-500 uppercase w-12 text-center">Nº</th>
                              <th className="px-4 py-3 text-[9px] font-black tracking-widest text-zinc-500 uppercase">Aspirante / Convocado</th>
                              <th className="px-4 py-3 text-[9px] font-black tracking-widest text-zinc-500 uppercase w-20 text-center">Camisa</th>
                              <th className="px-4 py-3 text-[9px] font-black tracking-widest text-zinc-500 uppercase w-28 text-right">Idade (Sub)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/60">
                            {allSummonedAthletes.map((a, idx) => {
                              const sub = getSubCategory(a.birth_date);
                              return (
                                <tr key={a.id} className="hover:bg-zinc-900/20 transition-colors">
                                  <td className="px-4 py-2.5 text-center text-xs font-medium text-zinc-600">
                                    {(idx + 1).toString().padStart(2, '0')}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-zinc-250 uppercase">
                                        {a.name}
                                      </span>
                                      {a.nickname && (
                                        <span className="text-[9px] font-black text-theme-primary uppercase px-1.5 py-0.5 rounded bg-theme-primary/10">
                                          "{a.nickname}"
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className="font-mono text-xs font-black text-zinc-400 bg-zinc-900/50 p-1 px-2 border border-zinc-800/60 rounded">
                                      #{a.jersey_number || 'S/N'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase">
                                      {sub}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {allSummonedStaff.length > 0 && (
                      <div className="pt-4 border-t border-zinc-800/60">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">
                          COMISSÃO TÉCNICA REUNIDA ({allSummonedStaff.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {allSummonedStaff.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-3.5">
                              <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary shrink-0">
                                <Users size={14} />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-black text-zinc-200 uppercase truncate">
                                  {p.name}
                                </p>
                                <p className="text-[8px] text-zinc-500 font-extrabold uppercase mt-0.5 tracking-wider">
                                  {p.role || 'Professor responsável'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
