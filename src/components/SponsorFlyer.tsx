import React, { useRef, useState } from 'react';
import { Sponsor } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { Trophy, Download, X, Camera, Image as ImageIcon } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from '../utils';

interface SponsorFlyerProps {
  sponsor: Sponsor;
  onClose: () => void;
}

export default function SponsorFlyer({ sponsor, onClose }: SponsorFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const { settings } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [customText, setCustomText] = useState('');
  const [carbonColor, setCarbonColor] = useState<string>('#1a1a1a');
  const [sponsorLogo, setSponsorLogo] = useState<string | null>(sponsor.logo || null);
  const [schoolCrest, setSchoolCrest] = useState<string | null>(settings.schoolCrest || null);

  const sponsorLogoRef = useRef<HTMLInputElement>(null);
  const schoolCrestRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'sponsor' | 'school') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'sponsor') setSponsorLogo(event.target?.result as string);
        else setSchoolCrest(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsExporting(true);
    const loadingToast = toast.loading('Gerando seu encarte de patrocínio...');
    
    try {
      const toBase64 = async (url: string): Promise<string> => {
        if (!url || url.startsWith('data:')) return url;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(url, { mode: 'cors', signal: controller.signal, credentials: 'omit' });
          clearTimeout(timeoutId);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return url;
        }
      };

      const element = flyerRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '360px',
        height: '640px',
        zIndex: '-9999',
        opacity: '1',
      });
      document.body.appendChild(clone);

      const cloneImages = Array.from(clone.querySelectorAll('img'));
      await Promise.all(cloneImages.map(async (img) => {
        const currentSrc = img.getAttribute('src');
        if (currentSrc) {
          const b64 = await toBase64(currentSrc);
          img.setAttribute('src', b64);
        }
      }));

      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 1000));

      const dataUrl = await htmlToImage.toPng(clone, {
        width: 360,
        height: 640,
        pixelRatio: 2,
        backgroundColor: '#000000',
      });

      document.body.removeChild(clone);
      toast.dismiss(loadingToast);
      
      const link = document.createElement('a');
      link.download = `PATROCINIO_${sponsor.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Encarte baixado com sucesso!');
    } catch (error) {
      console.error('Error generating flyer:', error);
      toast.error('Erro ao gerar imagem.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start my-auto">
        
        {/* Left: Configuration */}
        <div className="space-y-6 bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Encarte de Patrocínio</h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Text Customization */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Mensagem Personalizada</label>
            <textarea 
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-4 rounded-2xl text-white text-sm focus:ring-2 focus:ring-theme-primary/50 outline-none resize-none h-24"
              placeholder="Digite um texto para o rodapé do encarte..."
            />
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Logo Patrocinador</label>
              <button 
                onClick={() => sponsorLogoRef.current?.click()}
                className="w-full aspect-video bg-black rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-2 hover:border-theme-primary/50 transition-all group overflow-hidden"
              >
                {sponsorLogo ? (
                  <img src={sponsorLogo} className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <ImageIcon size={20} className="text-zinc-600 group-hover:text-theme-primary" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Alterar Logo</span>
                  </>
                )}
              </button>
              <input type="file" ref={sponsorLogoRef} onChange={e => handleImageUpload(e, 'sponsor')} accept="image/*" className="hidden" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Brasão da Escola</label>
              <button 
                onClick={() => schoolCrestRef.current?.click()}
                className="w-full aspect-video bg-black rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-2 hover:border-theme-primary/50 transition-all group overflow-hidden"
              >
                {schoolCrest ? (
                  <img src={schoolCrest} className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <Trophy size={20} className="text-zinc-600 group-hover:text-theme-primary" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Alterar Brasão</span>
                  </>
                )}
              </button>
              <input type="file" ref={schoolCrestRef} onChange={e => handleImageUpload(e, 'school')} accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Cor do Fundo (Estilo Carbono)</label>
            <div className="flex flex-wrap gap-2">
              {['#1a1a1a', '#0a0a0a', '#1e3a8a', '#312e81', '#164e63', '#064e3b', '#4c1d95', '#701a75', '#831843'].map(c => (
                <button
                  key={c}
                  onClick={() => setCarbonColor(c)}
                  className={cn(
                    "relative w-10 h-10 rounded-xl border-2 overflow-hidden",
                    carbonColor === c ? "border-theme-primary scale-110" : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="absolute inset-0" style={{ backgroundColor: c }} />
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-40" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <button onClick={handleDownload} disabled={isExporting} className="w-full py-4 bg-theme-primary text-black font-black uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-theme-primary/20 disabled:opacity-50">
              {isExporting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div> : <Download size={20} />}
              {isExporting ? 'Gerando Imagem...' : 'Baixar Encarte Story'}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col items-center gap-4">
          <div 
            ref={flyerRef}
            style={{ width: '360px', height: '640px' }}
            className="bg-black relative overflow-hidden flex flex-col select-none border-[8px] border-theme-primary/80"
          >
            {/* Background Layer */}
            <div className="absolute inset-0 z-0" style={{ backgroundColor: carbonColor }}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-theme-primary/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-16 px-8 text-center">
              
              {/* Top: School Crest */}
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto p-3 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
                  {schoolCrest ? (
                    <img src={schoolCrest} className="w-full h-full object-contain" crossOrigin="anonymous" />
                  ) : (
                    <Trophy size={48} className="text-theme-primary w-full h-full" />
                  )}
                </div>
                <h1 className="text-xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg">
                  {settings.schoolName || 'Piruá Esporte Clube'}
                </h1>
              </div>

              {/* Middle: Main Text */}
              <div className="space-y-12">
                <div className="space-y-4">
                  <p className="text-theme-primary text-[10px] font-black uppercase tracking-[0.3em] mb-2">Parceria Oficial</p>
                  <p className="text-2xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-xl">
                    A EQUIPE {settings.schoolName?.toUpperCase() || 'PIRUÁ ESPORTE CLUBE'} TEM O PATROCÍNIO DE
                  </p>
                </div>

                {/* Sponsor Logo Slot */}
                <div className="w-full aspect-square max-w-[200px] mx-auto bg-white rounded-[2.5rem] p-8 shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                  {sponsorLogo ? (
                    <img src={sponsorLogo} className="w-full h-full object-contain" crossOrigin="anonymous" />
                  ) : (
                    <div className="text-zinc-300 font-black text-2xl uppercase italic opacity-20">{sponsor.name}</div>
                  )}
                </div>
              </div>

              {/* Bottom: Custom Text */}
              <div className="space-y-6 w-full">
                {customText && (
                  <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 mx-4">
                    <p className="text-white text-xs font-bold uppercase tracking-tight italic opacity-90 leading-relaxed">
                      "{customText}"
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-theme-primary/20 w-3/4 mx-auto">
                  <p className="text-theme-primary text-[8px] font-black uppercase tracking-[0.4em] mb-1">Juntos somos mais fortes</p>
                  <p className="text-zinc-500 text-[6px] font-bold uppercase tracking-widest">{settings.schoolName} • 2026</p>
                </div>
              </div>

            </div>

            {/* Texture */}
            <div className="absolute inset-0 z-[5] bg-[url('https://www.transparenttextures.com/patterns/halftone-yellow.png')] opacity-[0.05] pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
