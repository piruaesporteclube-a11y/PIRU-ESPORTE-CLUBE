import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings } from '../types';
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
        format: [85.6, 54],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST');
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
        {/* The Card Layout - Modern Credit Card Size (85.6mm x 54mm) */}
        <div 
          ref={cardRef}
          className="w-[400px] h-[250px] min-w-[400px] bg-white text-black rounded-[20px] overflow-hidden shadow-2xl flex flex-col relative card border border-zinc-200 print:border-zinc-300"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <style>{`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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
                z-index: 9999 !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .card {
                width: 85.6mm !important;
                height: 54mm !important;
                border: 1px solid #eee !important;
                border-radius: 4mm !important;
                box-shadow: none !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                background-color: white !important;
                transform: scale(1) !important;
                margin: 0 !important;
              }
              .card * {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }

            .card-bg-pattern {
              background-image: radial-gradient(${settings.primaryColor}20 1px, transparent 1px);
              background-size: 10px 10px;
            }
          `}</style>

          {/* Background Elements */}
          <div className="absolute inset-0 card-bg-pattern opacity-30 pointer-events-none"></div>
          <div 
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundColor: settings.primaryColor }}
          ></div>
          <div 
            className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundColor: settings.secondaryColor }}
          ></div>

          {/* Header */}
          <div className="h-14 px-5 flex items-center justify-between relative z-10 border-b border-zinc-100/50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                {crestDataUrl ? (
                  <img 
                    src={crestDataUrl} 
                    className="w-full h-full object-contain" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-10 h-10 bg-theme-primary rounded-xl flex items-center justify-center text-black font-black text-lg shadow-sm">P</div>
                )}
              </div>
              <div className="leading-tight">
                <h3 className="text-sm font-black uppercase tracking-tighter text-black">Piruá Esporte Clube</h3>
                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.2em]">Futebol de Base • Oficial</p>
              </div>
            </div>
            <div className="text-right">
              <div 
                className="inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest"
                style={{ backgroundColor: `${settings.primaryColor}15`, color: settings.primaryColor }}
              >
                Atleta Base
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex p-5 gap-5 relative z-10">
            {/* Photo */}
            <div className="relative group">
              <div className="w-[100px] h-[125px] bg-zinc-50 rounded-2xl border-2 border-zinc-100 overflow-hidden shadow-lg relative z-10">
                {photoDataUrl ? (
                  <img 
                    src={photoDataUrl} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-200 bg-zinc-50">
                    <UserCircle size={48} strokeWidth={1} />
                  </div>
                )}
              </div>
              <div 
                className="absolute -inset-1 blur-lg opacity-20 rounded-2xl -z-0"
                style={{ backgroundColor: settings.primaryColor }}
              ></div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="space-y-3">
                <div>
                  <p className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Nome do Atleta</p>
                  <h4 className="text-sm font-black uppercase leading-none text-black tracking-tight truncate">
                    {athlete.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Nascimento</p>
                    <p className="text-[10px] font-bold text-black">
                      {athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Documento</p>
                    <p className="text-[10px] font-bold text-black">{athlete.doc || '--'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Responsável Legal</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold text-zinc-800 uppercase truncate pr-2">{athlete.guardian_name}</p>
                    <p className="text-[9px] font-black text-theme-primary whitespace-nowrap">{athlete.guardian_phone}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between pt-2">
                <div>
                  <p className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">ID Matrícula</p>
                  <p className="text-[10px] font-mono font-black text-zinc-400">#{athlete.id.slice(-8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <ShieldCheck size={14} />
                  <span className="text-[7px] font-black uppercase tracking-widest">Verificado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="h-10 px-5 flex items-center justify-between relative z-10"
            style={{ backgroundColor: `${settings.primaryColor}05` }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg shadow-sm border border-zinc-100">
                <QRCodeCanvas 
                  value={`PIRUA-ATHLETE-${athlete.id}`} 
                  size={24} 
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-[7px] text-zinc-400 font-bold leading-tight uppercase">
                Válida para acesso<br/>e identificação oficial
              </p>
            </div>
            <div className="flex items-center gap-1">
              <QrCode size={10} className="text-zinc-300" />
              <p className="text-[8px] font-black text-zinc-300 uppercase tracking-tighter">Temporada 2026</p>
            </div>
          </div>

          {/* Hologram Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white to-transparent transform rotate-12 scale-150"></div>
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
