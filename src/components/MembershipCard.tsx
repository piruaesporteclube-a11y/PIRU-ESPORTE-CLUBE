import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings, getSubCategory } from '../types';
import { api } from '../api';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, UserCircle, MapPin, Phone, Hash, FileDown, Loader2, AlertCircle, ShieldCheck, QrCode } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            callback(canvas.toDataURL('image/png'));
          }
        } catch (e) {
          console.warn('Failed to convert image to data URL', e);
          callback(url);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image with CORS, falling back to direct URL');
        callback(url);
      };
      img.src = url;
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

  const handleSavePDF = async () => {
    if (!cardRef.current) return;
    setIsGeneratingPDF(true);
    try {
      // Ensure images are loaded before capturing
      const images = cardRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.querySelector('.card') as HTMLElement;
          if (clonedCard) {
            clonedCard.style.visibility = 'visible';
            clonedCard.style.display = 'flex';
            clonedCard.style.boxShadow = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [105, 75],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 105, 75, undefined, 'FAST');
      pdf.save(`carteirinha-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente imprimir e salvar como PDF pelo navegador.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-bold text-white">Carteirinha do Atleta</h2>
        <div className="flex gap-2">
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

      <div className="flex justify-center p-4 print:p-0 card-print-container overflow-x-auto">
        {/* The Card Layout - Custom Size (10.5cm x 7.5cm) */}
        <div 
          ref={cardRef}
          className="w-[450px] h-[321px] min-w-[450px] bg-[#050505] text-white rounded-[24px] overflow-hidden shadow-2xl flex flex-col relative card border border-[rgba(39,39,42,0.5)] print:border-[#d4d4d8]"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
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
              }
              .card {
                width: 105mm !important;
                height: 75mm !important;
                border: 0.5pt solid rgba(0,0,0,0.1) !important;
                border-radius: 4mm !important;
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
          <div className="h-16 px-6 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center p-1 bg-[rgba(255,255,255,0.05)] backdrop-blur-md rounded-xl border border-[rgba(255,255,255,0.1)] shadow-xl">
                {crestDataUrl ? (
                  <img 
                    src={crestDataUrl} 
                    className="w-full h-full object-contain" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-theme-primary rounded-lg flex items-center justify-center text-black font-black text-lg">P</div>
                )}
              </div>
              <div className="leading-tight">
                <h3 className="text-lg font-black uppercase tracking-tighter text-white">Piruá Esporte Clube</h3>
                <p className="text-[9px] text-theme-primary uppercase font-black tracking-[0.2em]">Futebol de Base • Temporada 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Matrícula</p>
              <p className="text-base font-mono font-black text-white">#{athlete.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex p-5 gap-5 relative z-10 overflow-hidden">
            {/* Photo Section */}
            <div className="relative group flex-shrink-0">
              <div className="w-[100px] h-[135px] bg-[#09090b] rounded-[1.5rem] border-2 border-[rgba(234,179,8,0.3)] overflow-hidden shadow-2xl relative z-10 group-hover:border-theme-primary transition-colors">
                {photoDataUrl ? (
                  <img 
                    src={photoDataUrl} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#3f3f46] bg-[#09090b]">
                    <UserCircle size={48} strokeWidth={1} />
                  </div>
                )}
              </div>
              {/* Photo Glow */}
              <div 
                className="absolute -inset-2 blur-2xl opacity-20 rounded-[1.5rem] -z-0"
                style={{ backgroundColor: settings.primaryColor }}
              ></div>
              
              {/* Status Badge on Photo */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-theme-primary text-black px-4 py-1.5 rounded-full shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-widest">Ativo</p>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
              <div className="space-y-2.5">
                <div>
                  <div className="text-[9px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                    Nome Completo do Aluno
                  </div>
                  <h4 className="text-sm font-black uppercase leading-tight text-white tracking-tight">
                    {athlete.name}
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Nascimento
                    </div>
                    <p className="text-xs font-black text-white">
                      {athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                    </p>
                  </div>
                  <div>
                    <div className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      RG/CPF
                    </div>
                    <p className="text-xs font-black text-white">{athlete.doc || '--'}</p>
                  </div>
                  <div>
                    <div className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Uniforme
                    </div>
                    <p className="text-xs font-black text-white">#{athlete.jersey_number || '--'}</p>
                  </div>
                </div>

                <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-md p-2.5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Responsável</p>
                      <p className="text-[8px] font-bold text-[#d4d4d8] uppercase leading-tight">{athlete.guardian_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Telefone</p>
                      <p className="text-[10px] font-black text-theme-primary whitespace-nowrap">{athlete.guardian_phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-16 px-6 flex items-center justify-between relative z-10 bg-[rgba(0,0,0,0.6)] border-t border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1 rounded-md shadow-xl">
                <QRCodeCanvas 
                  value={`PIRUA-ATHLETE-${athlete.id}`} 
                  size={48} 
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="leading-tight">
                <p className="text-base text-white font-black uppercase tracking-widest">QR CODE OFICIAL</p>
                <p className="text-[9px] text-[#71717a] font-bold uppercase">Acesse o perfil completo do atleta</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-[#71717a] uppercase font-black tracking-widest">Categoria</p>
                <p className="text-lg font-black text-theme-primary uppercase">{getSubCategory(athlete.birth_date)}</p>
              </div>
              <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]"></div>
              <ShieldCheck size={20} className="text-theme-primary" />
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
