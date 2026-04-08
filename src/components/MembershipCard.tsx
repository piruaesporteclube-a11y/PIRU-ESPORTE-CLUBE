import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings, getSubCategory } from '../types';
import { api } from '../api';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, UserCircle, MapPin, Phone, Hash, FileDown, Loader2, AlertCircle, ShieldCheck, QrCode } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { fixHtml2CanvasColors } from '../utils';

interface MembershipCardProps {
  athlete: Athlete;
}

export default function MembershipCard({ athlete }: MembershipCardProps) {
  const { settings } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const convertToDataUrl = (url: string, callback: (dataUrl: string | null) => void) => {
      if (!url) {
        callback(null);
        return;
      }
      if (url.startsWith('data:')) {
        callback(url);
        return;
      }

      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            callback(dataUrl);
          } else {
            callback(url);
          }
        } catch (e) {
          console.warn('Failed to convert image to data URL', e);
          callback(url);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image with CORS:', url);
        callback(url);
      };
      // Add a cache-busting parameter to avoid cached images without CORS headers
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(athlete.photo || '', setPhotoDataUrl);
    convertToDataUrl(settings?.schoolCrest || '', setCrestDataUrl);
  }, [athlete.photo, settings?.schoolCrest]);

  const handlePrint = () => {
    if (!cardRef.current) return;
    
    // Small delay to ensure any dynamic styles or images are ready
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    
    const loadingToast = toast.loading('Gerando imagem da carteirinha...');
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#000000',
        logging: false,
        onclone: (clonedDoc) => {
          const card = clonedDoc.querySelector('.card') as HTMLElement;
          if (card) {
            card.style.transform = 'none';
            fixHtml2CanvasColors(card);
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `carteirinha-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
      
      toast.success('Imagem gerada com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Erro ao gerar imagem.', { id: loadingToast });
    }
  };

  const handleSavePDF = async () => {
    if (!cardRef.current) return;
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF da carteirinha...');
    
    let container: HTMLDivElement | null = null;
    try {
      // Ensure images are loaded before capturing
      const images = cardRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000); // 3s timeout for each image
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));

      // Create a temporary container for capture to avoid scaling/CSS issues
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '1000px'; // Large enough
      container.style.height = '1000px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      
      // Replace images in clone with data URLs if available
      const clonedImages = clone.querySelectorAll('img');
      clonedImages.forEach(img => {
        const type = img.getAttribute('data-type');
        if (type === 'photo' && photoDataUrl) {
          img.setAttribute('src', photoDataUrl);
        } else if (type === 'crest' && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      clone.style.transform = 'none';
      clone.style.scale = '1';
      clone.style.margin = '0';
      clone.style.padding = '0';
      clone.style.width = '450px';
      clone.style.height = '284px';
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.visibility = 'visible';
      clone.style.display = 'flex';
      clone.style.opacity = '1';
      clone.style.borderRadius = '0';
      clone.style.overflow = 'hidden';
      clone.style.backgroundColor = '#000000';
      clone.style.color = 'white';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      
      container.appendChild(clone);

      // Wait for clone to be ready and settled
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#000000',
        logging: true,
        width: 450,
        height: 284,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF with custom size (CR80)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST');
      pdf.save(`carteirinha-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      toast.success('PDF gerado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente usar a opção de imprimir e salvar como PDF.', { id: loadingToast });
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-bold text-white">Carteirinha do Atleta</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadImage}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
            title="Baixar como Imagem (PNG)"
          >
            <Download size={18} />
            Imagem
          </button>
          <button 
            onClick={handleSavePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {isGeneratingPDF ? <Loader2 size={18} className="animate-spin text-theme-primary" /> : <FileDown size={18} />}
            {isGeneratingPDF ? 'Gerando...' : 'Salvar em PDF'}
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>

      <div className="flex justify-center p-2 sm:p-8 print:p-0 card-print-container overflow-x-auto bg-zinc-950/50 rounded-[2.5rem] border border-zinc-800/50">
        {/* The Card Layout - Standard CR80 Size (85.6mm x 54mm) */}
        <div 
          ref={cardRef}
          className="w-[450px] h-[284px] min-w-[450px] bg-[#050505] text-white rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative card border border-zinc-800/50 print:border-[#d4d4d8] transform scale-[0.7] xs:scale-[0.8] sm:scale-100 origin-center box-border transition-transform duration-500"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <style>{`
            * {
              box-sizing: border-box;
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 0;
              }
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              .card-print-container {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: white !important;
                z-index: 99999 !important;
                visibility: visible !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .card {
                width: 85.6mm !important;
                height: 54mm !important;
                border: 0.5pt solid rgba(0,0,0,0.1) !important;
                border-radius: 3mm !important;
                box-shadow: none !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                background-color: #050505 !important;
                color: white !important;
                transform: none !important;
                margin: 0 auto !important;
                page-break-inside: avoid !important;
                visibility: visible !important;
                position: relative !important;
              }
              .card * {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }

            .card-grid-pattern {
              background-image: linear-gradient(${settings.primaryColor}10 1px, transparent 1px), linear-gradient(90deg, ${settings.primaryColor}10 1px, transparent 1px);
              background-size: 20px 20px;
            }

            .card-diagonal-split {
              background: linear-gradient(135deg, #050505 0%, #050505 60%, ${settings.primaryColor}20 60%, ${settings.primaryColor}20 100%);
            }
          `}</style>

          {/* Background Elements */}
          <div className="absolute inset-0 card-diagonal-split pointer-events-none"></div>
          <div className="absolute inset-0 card-grid-pattern opacity-40 pointer-events-none"></div>
          
          {/* Top Accent Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-theme-primary z-20"></div>

          {/* Header */}
          <div className="h-14 px-6 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center p-1 bg-[rgba(255,255,255,0.05)] backdrop-blur-md rounded-xl border border-[rgba(255,255,255,0.1)] shadow-xl overflow-hidden">
                {crestDataUrl ? (
                  <img 
                    src={crestDataUrl} 
                    className="w-full h-full object-contain" 
                    crossOrigin="anonymous"
                    data-type="crest"
                  />
                ) : (settings?.schoolCrest && settings.schoolCrest.trim() !== "") ? (
                  <img 
                    src={settings.schoolCrest} 
                    className="w-full h-full object-contain" 
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    data-type="crest"
                  />
                ) : (
                  <div className="w-full h-full bg-theme-primary rounded-lg flex items-center justify-center text-black font-black text-lg">P</div>
                )}
              </div>
              <div className="leading-tight">
                <h3 className="text-base font-black uppercase tracking-tighter text-white">Piruá Esporte Clube</h3>
                <p className="text-[8px] text-theme-primary uppercase font-black tracking-[0.2em]">Futebol de Base • Temporada 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Matrícula</p>
              <p className="text-sm font-mono font-black text-white">#{athlete.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex p-4 gap-4 relative z-10 overflow-hidden">
            {/* Photo Section */}
            <div className="relative group flex-shrink-0 flex flex-col items-center gap-2">
              <div className="w-[85px] h-[110px] bg-[#09090b] rounded-[1rem] border-2 border-[rgba(234,179,8,0.3)] overflow-hidden shadow-2xl relative z-10 group-hover:border-theme-primary transition-colors">
                {photoDataUrl ? (
                  <img 
                    src={photoDataUrl} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                    data-type="photo"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#3f3f46] bg-[#09090b]">
                    <UserCircle size={40} strokeWidth={1} />
                  </div>
                )}
              </div>
              <div className="px-3 py-0.5 bg-theme-primary rounded-full shadow-lg border border-white/10 z-10">
                <span className="text-[7px] font-black text-black uppercase tracking-widest">Atleta</span>
              </div>
              {/* Photo Glow */}
              <div 
                className="absolute -inset-2 blur-2xl opacity-20 rounded-[1.2rem] -z-0"
                style={{ backgroundColor: settings.primaryColor }}
              ></div>
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5 pr-2">
              <div className="space-y-1.5">
                <div>
                  <div className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                    Nome do Aluno
                  </div>
                  <h4 className="text-[11px] font-black uppercase leading-tight text-white tracking-tight mb-0.5 break-words line-clamp-2">
                    {athlete.name}
                  </h4>
                  {athlete.nickname && (
                    <div className="flex items-center gap-1.5 opacity-80">
                      <span className="text-[7px] text-theme-primary font-black uppercase tracking-widest">Apelido:</span>
                      <span className="text-[8px] font-bold text-[#d4d4d8] uppercase tracking-tight truncate">{athlete.nickname}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Nasc.
                    </div>
                    <p className="text-[9px] font-black text-white whitespace-nowrap">
                      {athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      RG/CPF
                    </div>
                    <p className="text-[9px] font-black text-white truncate">{athlete.doc || '--'}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Unif.
                    </div>
                    <p className="text-[9px] font-black text-white">#{athlete.jersey_number || '--'}</p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Modalidade
                    </div>
                    <p className="text-[9px] font-black text-white truncate">{athlete.modality || '--'}</p>
                  </div>
                </div>

                <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-md p-1.5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-[6px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Responsável</p>
                      <p className="text-[7px] font-bold text-[#d4d4d8] uppercase leading-tight truncate">{athlete.guardian_name}</p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-[6px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Telefone</p>
                      <p className="text-[8px] font-black text-theme-primary whitespace-nowrap">{athlete.guardian_phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-20 px-6 flex items-center justify-between relative z-10 bg-[rgba(0,0,0,0.6)] border-t border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1 rounded-xl shadow-2xl flex items-center justify-center">
                <QRCodeCanvas 
                  value={`PIRUA-ATHLETE-${athlete.id}`} 
                  size={64} 
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: crestDataUrl || undefined,
                    x: undefined,
                    y: undefined,
                    height: 16,
                    width: 16,
                    excavate: true,
                  }}
                />
              </div>
              <div className="leading-tight max-w-[240px]">
                <p className="text-[8px] text-white font-bold uppercase leading-tight">
                  {athlete.street}, {athlete.number}
                </p>
                <p className="text-[8px] text-[#71717a] font-medium uppercase leading-tight">
                  {athlete.neighborhood} - {athlete.city}/{athlete.uf}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[7px] text-[#71717a] uppercase font-black tracking-widest">Categoria</p>
                <p className="text-xs font-black text-theme-primary uppercase">{getSubCategory(athlete.birth_date)}</p>
              </div>
              <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]"></div>
              <ShieldCheck size={18} className="text-theme-primary" />
            </div>
          </div>

          {/* Security Micro-text (Decorative) */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden whitespace-nowrap opacity-5 pointer-events-none">
            <p className="text-[24px] font-mono uppercase tracking-[0.5em]">
              PIRUA ESPORTE CLUBE • GESTÃO DE BASE • OFICIAL • PIRUA ESPORTE CLUBE • GESTÃO DE BASE • OFICIAL • PIRUA ESPORTE CLUBE • GESTÃO DE BASE • OFICIAL
            </p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-zinc-400 text-sm no-print">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-theme-primary/10 rounded-2xl">
            <AlertCircle size={24} className="text-theme-primary" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2 uppercase tracking-widest">Instruções de Impressão</h3>
            <p className="leading-relaxed mb-4">
              Para garantir a máxima qualidade e durabilidade da carteirinha oficial, siga estas recomendações:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
                <span>Papel Fotográfico Glossy (180g+) ou PVC</span>
              </li>
              <li className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
                <span>Configuração de Impressão: Alta Qualidade</span>
              </li>
              <li className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
                <span>Habilitar "Imprimir cores de fundo"</span>
              </li>
              <li className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
                <span>O QR Code é validado pelo App do Professor</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
