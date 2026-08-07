import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';
import { Settings } from '../types';
import { 
  Palette, 
  Check, 
  Sparkles, 
  Shield, 
  Trophy, 
  Activity, 
  Users, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  LayoutGrid, 
  Sliders, 
  Eye, 
  Zap, 
  Flame, 
  Crown, 
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils';

export type SystemLayoutPreset = {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  icon: any;
  primaryColor: string;
  secondaryColor: string;
  layoutBgColor: string;
  layoutCardColor: string;
  layoutBorderColor: string;
  layoutBorderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  layoutBorderWidth: '1px' | '2px' | '3px';
  layoutShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'heavy' | 'neon';
  accentGradient: string;
  borderPreview: string;
};

export const SYSTEM_LAYOUT_PRESETS: SystemLayoutPreset[] = [
  {
    id: 'gold_classic',
    name: '1. Ouro Clássico (Elite Piruá E.C.)',
    badge: '🏆 Design Ouro Nobre',
    tagline: 'Grade Superior Dourada & Molduras Finas',
    description: 'Layout clássico e sofisticado com acentos dourados, cartões escuros obsidian de alto contraste, ícones retangulares estilizados e acabamento premium da Piruá E.C.',
    icon: Trophy,
    primaryColor: '#EAB308',
    secondaryColor: '#000000',
    layoutBgColor: '#000000',
    layoutCardColor: '#18181b',
    layoutBorderColor: '#eab308',
    layoutBorderRadius: '2xl',
    layoutBorderWidth: '1px',
    layoutShadow: 'xl',
    accentGradient: 'from-amber-500 via-yellow-400 to-amber-600',
    borderPreview: 'border-amber-500/50'
  },
  {
    id: 'tactical_cyan',
    name: '2. Tático Lateral Esquerdo (Coluna no Lado Esquerdo)',
    badge: '⚡ Coluna Lateral Fixa',
    tagline: 'Barra Lateral Esquerda + Lista Tática',
    description: 'Muda radicalmente a estrutura do app! Insere uma barra lateral em coluna no lado esquerdo com todos os botões e lista módulos em linhas táticas com ícones e chevrons.',
    icon: Zap,
    primaryColor: '#38bdf8',
    secondaryColor: '#09090b',
    layoutBgColor: '#09090b',
    layoutCardColor: '#121215',
    layoutBorderColor: '#1e293b',
    layoutBorderRadius: 'md',
    layoutBorderWidth: '2px',
    layoutShadow: 'md',
    accentGradient: 'from-sky-400 via-cyan-300 to-blue-600',
    borderPreview: 'border-sky-400/50'
  },
  {
    id: 'cyber_neon',
    name: '3. Vidro & Néon (Dock Flutuante Inferior)',
    badge: '💎 App Dock na Parte Inferior',
    tagline: 'Dock Flutuante + Vidro Glossy',
    description: 'Estrutura estilo app mobile com dock flutuante de atalhos fixo na parte inferior da tela, topo cápsula e cartões com transparência estilo vidro fosco.',
    icon: Sparkles,
    primaryColor: '#10b981',
    secondaryColor: '#020617',
    layoutBgColor: '#020617',
    layoutCardColor: '#0f172a',
    layoutBorderColor: '#1e293b',
    layoutBorderRadius: '2xl',
    layoutBorderWidth: '1px',
    layoutShadow: 'neon',
    accentGradient: 'from-emerald-400 via-teal-300 to-emerald-600',
    borderPreview: 'border-emerald-400/50'
  },
  {
    id: 'crimson_fire',
    name: '4. Fogo Carmim (Banner Ticker & Abas)',
    badge: '🔥 Ticker Esportivo + Banners',
    tagline: 'Letreiro Animado + Banners Esportivos',
    description: 'Layout para atmosfera de jogo decisivo! Letreiro em movimento na parte superior, abas de navegação contínuas e botões em formato de banners com bordas vermelhas.',
    icon: Flame,
    primaryColor: '#ef4444',
    secondaryColor: '#180808',
    layoutBgColor: '#180808',
    layoutCardColor: '#221010',
    layoutBorderColor: '#3f1515',
    layoutBorderRadius: 'xl',
    layoutBorderWidth: '2px',
    layoutShadow: 'heavy',
    accentGradient: 'from-red-500 via-rose-400 to-red-700',
    borderPreview: 'border-red-500/50'
  },
  {
    id: 'royal_purple',
    name: '5. Roxo Imperial (Pílulas de Gala)',
    badge: '👑 Carrossel de Pílulas',
    tagline: 'Pílulas Deslizantes + Cartões Púrpura',
    description: 'Layout de solenidade com barra de pílulas deslizantes de fácil toque, anel de prestígio ao redor do escudo e módulos sofisticados em tom púrpura veludo.',
    icon: Crown,
    primaryColor: '#a855f7',
    secondaryColor: '#0d0514',
    layoutBgColor: '#0d0514',
    layoutCardColor: '#180b24',
    layoutBorderColor: '#2e1047',
    layoutBorderRadius: '3xl',
    layoutBorderWidth: '1px',
    layoutShadow: '2xl',
    accentGradient: 'from-purple-500 via-fuchsia-400 to-purple-700',
    borderPreview: 'border-purple-500/50'
  }
];

export default function SystemLayouts() {
  const { settings: globalSettings, updateSettings, refreshSettings } = useTheme();
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    if (globalSettings.systemLayoutMode) return globalSettings.systemLayoutMode;
    const found = SYSTEM_LAYOUT_PRESETS.find(p => 
      p.primaryColor.toLowerCase() === (globalSettings.primaryColor || '').toLowerCase() &&
      p.layoutBgColor.toLowerCase() === (globalSettings.layoutBgColor || '').toLowerCase()
    );
    return found ? found.id : 'gold_classic';
  });

  useEffect(() => {
    if (globalSettings.systemLayoutMode) {
      setActivePresetId(globalSettings.systemLayoutMode);
      setPreviewSettings({ ...globalSettings });
    }
  }, [globalSettings.systemLayoutMode]);

  const [previewSettings, setPreviewSettings] = useState<Settings>({ ...globalSettings });
  const [isSaving, setIsSaving] = useState(false);

  const applyPresetToSystem = async (preset: SystemLayoutPreset) => {
    setActivePresetId(preset.id);
    const updated: Settings = {
      ...globalSettings,
      systemLayoutMode: preset.id as any,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      layoutBgColor: preset.layoutBgColor,
      layoutCardColor: preset.layoutCardColor,
      layoutBorderColor: preset.layoutBorderColor,
      layoutBorderRadius: preset.layoutBorderRadius,
      layoutBorderWidth: preset.layoutBorderWidth,
      layoutShadow: preset.layoutShadow
    };

    setPreviewSettings(updated);
    setIsSaving(true);
    try {
      await updateSettings(updated);
      await refreshSettings();
      toast.success(`Layout "${preset.name}" aplicado com sucesso em todo o sistema!`);
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      toast.error('Ocorreu um erro ao aplicar o layout.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    const defaultPreset = SYSTEM_LAYOUT_PRESETS[0];
    await applyPresetToSystem(defaultPreset);
  };

  const activePreset = SYSTEM_LAYOUT_PRESETS.find(p => p.id === activePresetId) || SYSTEM_LAYOUT_PRESETS[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-xs font-black uppercase tracking-widest">
              <LayoutGrid size={14} /> 5 Estilos Visuais para o Sistema
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              Layouts do Sistema
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Personalize a arquitetura visual completa do aplicativo Piruá E.C. Escolha entre 5 modos de alta performance visual — afetando cores, cartões, bordas e sombras em todas as telas.
            </p>
          </div>

          <button
            onClick={handleResetToDefault}
            disabled={isSaving}
            className="self-start md:self-center flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl border border-zinc-700/80 transition-all text-xs font-black uppercase tracking-widest shrink-0 cursor-pointer shadow-lg active:scale-95"
            title="Restaurar visual padrão"
          >
            <RotateCcw size={16} />
            Restaurar Padrão Piruá
          </button>
        </div>
      </div>

      {/* Grid of 5 System Layout Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Layers size={18} className="text-theme-primary" />
            Selecione o Modelo de Layout do Sistema
          </h3>
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
            5 Opções Disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SYSTEM_LAYOUT_PRESETS.map((preset) => {
            const isCurrent = activePresetId === preset.id;
            const Icon = preset.icon;

            return (
              <div
                key={preset.id}
                onClick={() => !isSaving && applyPresetToSystem(preset)}
                className={cn(
                  "group relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-300 flex flex-col justify-between gap-6 cursor-pointer select-none",
                  isCurrent 
                    ? "bg-zinc-900/90 border-2 ring-2 shadow-2xl scale-[1.02]" 
                    : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50 hover:scale-[1.01]"
                )}
                style={{
                  borderColor: isCurrent ? preset.primaryColor : undefined,
                  boxShadow: isCurrent ? `0 0 30px ${preset.primaryColor}30` : undefined
                }}
              >
                {/* Active Indicator Ribbon */}
                {isCurrent && (
                  <div 
                    className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest text-black flex items-center gap-1 shadow-md"
                    style={{ backgroundColor: preset.primaryColor }}
                  >
                    <Check size={12} className="stroke-[3]" /> Ativo
                  </div>
                )}

                {/* Card Header */}
                <div className="space-y-3 pr-12">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-full border border-zinc-700/50">
                    {preset.badge}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-2xl text-black shrink-0 shadow-lg"
                      style={{ backgroundColor: preset.primaryColor }}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        {preset.tagline}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed min-h-[3rem]">
                  {preset.description}
                </p>

                {/* Swatches & Specs */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                    <span>Amostra de Cores</span>
                    <span>Borda / Sombra</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-6 h-6 rounded-lg border border-white/20 shadow-md" 
                        style={{ backgroundColor: preset.primaryColor }} 
                        title={`Cor Primária: ${preset.primaryColor}`}
                      />
                      <div 
                        className="w-6 h-6 rounded-lg border border-white/20 shadow-md" 
                        style={{ backgroundColor: preset.layoutBgColor }} 
                        title={`Fundo do Sistema: ${preset.layoutBgColor}`}
                      />
                      <div 
                        className="w-6 h-6 rounded-lg border border-white/20 shadow-md" 
                        style={{ backgroundColor: preset.layoutCardColor }} 
                        title={`Fundo dos Cartões: ${preset.layoutCardColor}`}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                        R: {preset.layoutBorderRadius}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                        {preset.layoutShadow}
                      </span>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyPresetToSystem(preset);
                    }}
                    disabled={isSaving}
                    className={cn(
                      "w-full mt-2 py-3 px-4 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer",
                      isCurrent 
                        ? "bg-theme-primary text-black shadow-theme-primary/20" 
                        : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                    )}
                    style={isCurrent ? { backgroundColor: preset.primaryColor } : {}}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircle2 size={16} /> Layout Atual Ativado
                      </>
                    ) : (
                      <>
                        <Sliders size={16} /> Aplicar Este Layout
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live System Preview */}
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Eye size={20} className="text-theme-primary" />
              Demonstração em Tempo Real ({activePreset.name})
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Veja como os componentes da sua escola aparecem com o modelo selecionado.
            </p>
          </div>

          <span 
            className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-black shrink-0"
            style={{ backgroundColor: activePreset.primaryColor }}
          >
            Amostra Ao Vivo
          </span>
        </div>

        {/* Mock Interface Components */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mock Dashboard Stat Card */}
          <div 
            className="p-5 rounded-2xl border transition-all space-y-3"
            style={{
              backgroundColor: activePreset.layoutCardColor,
              borderColor: activePreset.layoutBorderColor,
              borderWidth: activePreset.layoutBorderWidth
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Atletas Totais</span>
              <span 
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: activePreset.primaryColor }}
              />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-white tracking-tight">148</p>
              <div 
                className="p-2.5 rounded-xl text-black"
                style={{ backgroundColor: activePreset.primaryColor }}
              >
                <Users size={18} />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              100% Sincronizado
            </p>
          </div>

          {/* Mock Athlete Card */}
          <div 
            className="p-5 rounded-2xl border transition-all space-y-3"
            style={{
              backgroundColor: activePreset.layoutCardColor,
              borderColor: activePreset.layoutBorderColor,
              borderWidth: activePreset.layoutBorderWidth
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-black shrink-0"
                style={{ backgroundColor: activePreset.primaryColor }}
              >
                PE
              </div>
              <div>
                <h5 className="text-sm font-black text-white uppercase tracking-tight">Lucas Piruá</h5>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">SUB-15 • Atacante Nº 10</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span 
                className="text-[9px] font-black uppercase px-2 py-0.5 rounded text-black"
                style={{ backgroundColor: activePreset.primaryColor }}
              >
                Ativo
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Frequência 98%</span>
            </div>
          </div>

          {/* Mock Action Controls */}
          <div 
            className="p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between"
            style={{
              backgroundColor: activePreset.layoutCardColor,
              borderColor: activePreset.layoutBorderColor,
              borderWidth: activePreset.layoutBorderWidth
            }}
          >
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-wider mb-1">Botões do Sistema</h5>
              <p className="text-[10px] text-zinc-400">Estilo de interação principal.</p>
            </div>

            <div className="space-y-2">
              <button 
                type="button"
                className="w-full py-2.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider text-black transition-all flex items-center justify-center gap-2 shadow-md"
                style={{ backgroundColor: activePreset.primaryColor }}
              >
                <Shield size={14} /> Botão Primário
              </button>
              <button 
                type="button"
                className="w-full py-2 px-4 rounded-xl font-bold uppercase text-[10px] tracking-wider text-zinc-300 bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-2"
              >
                Botão Secundário
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
