import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Settings } from '../types';
import { Save, Instagram, MessageCircle, Palette, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsComponent() {
  const { settings: globalSettings } = useTheme();
  const [settings, setSettings] = useState<Settings>(globalSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(globalSettings);
  }, [globalSettings]);

  const handleCrestUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, schoolCrest: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Configurações do Sistema</h2>
        <p className="text-zinc-400 text-sm">Personalize a identidade visual e redes sociais da escolinha</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visual Identity */}
        <div className="bg-black border border-theme-primary/20 rounded-3xl p-8 shadow-xl space-y-8">
          <div className="flex items-center gap-3 text-theme-primary mb-6">
            <Palette size={24} />
            <h3 className="text-lg font-bold uppercase tracking-widest">Identidade Visual</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Crest Upload */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-zinc-400 uppercase">Brasão da Escolinha</label>
              <div className="flex flex-col items-center gap-4 p-6 bg-black rounded-2xl border-2 border-dashed border-zinc-800 hover:border-yellow-500 transition-colors group relative">
                {settings.schoolCrest ? (
                  <img src={settings.schoolCrest} className="w-32 h-32 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-32 h-32 flex flex-col items-center justify-center text-zinc-600">
                    <ImageIcon size={48} />
                    <span className="text-[10px] mt-2 font-bold">Sem brasão</span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  <span className="text-white font-bold text-sm">Alterar Brasão</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCrestUpload} />
                </label>
              </div>
              <p className="text-[10px] text-zinc-500 text-center">O brasão aparecerá em todos os documentos, carteirinhas e cadastros.</p>
            </div>

            {/* Colors */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Cor Primária</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer"
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                  />
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-mono uppercase"
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Cor Secundária</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer"
                    value={settings.secondaryColor}
                    onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
                  />
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-mono uppercase"
                    value={settings.secondaryColor}
                    onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-black border border-theme-primary/20 rounded-3xl p-8 shadow-xl space-y-8">
          <div className="flex items-center gap-3 text-theme-primary mb-6">
            <MessageCircle size={24} />
            <h3 className="text-lg font-bold uppercase tracking-widest">Redes Sociais</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase mb-2">
                <Instagram size={14} />
                Instagram (URL ou @)
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                placeholder="@piruaec"
                value={settings.instagram}
                onChange={e => setSettings({...settings, instagram: e.target.value})}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase mb-2">
                <MessageCircle size={14} />
                WhatsApp (Número)
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                placeholder="(37) 99999-9999"
                value={settings.whatsapp}
                onChange={e => setSettings({...settings, whatsapp: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-500 font-bold animate-fade-in">
              <CheckCircle2 size={20} />
              Configurações salvas com sucesso!
            </div>
          )}
          <button 
            type="submit"
            className="ml-auto px-12 py-4 bg-theme-primary hover:opacity-90 text-black rounded-2xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2"
          >
            <Save size={20} />
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}
