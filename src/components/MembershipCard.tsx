import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings } from '../types';
import { api } from '../api';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, UserCircle, MapPin, Phone, Hash, FileDown, Loader2, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    if (athlete.photo) {
      if (athlete.photo.startsWith('data:')) {
        setPhotoDataUrl(athlete.photo);
      } else {
        // Try to convert to data URL to bypass CORS issues with html2canvas
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
              setPhotoDataUrl(canvas.toDataURL());
            }
          } catch (e) {
            console.warn('Failed to convert image to data URL', e);
            setPhotoDataUrl(athlete.photo);
          }
        };
        img.onerror = () => {
          console.warn('Failed to load photo with CORS, falling back to direct URL');
          setPhotoDataUrl(athlete.photo);
        };
        img.src = athlete.photo;
      }
    } else {
      setPhotoDataUrl(null);
    }
  }, [athlete.photo]);

  const handlePrint = () => {
    if (!cardRef.current) return;
    
    // Ensure all images are loaded before printing
    const images = cardRef.current.getElementsByTagName('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(promises).then(() => {
      // Small delay to ensure any dynamic styles or images are ready
      setTimeout(() => {
        window.print();
      }, 500);
    });
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
          className="w-[324px] h-[204px] min-w-[324px] bg-white text-black rounded-[12px] overflow-hidden shadow-2xl flex flex-col relative card border border-zinc-200 print:border-zinc-300"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            backgroundImage: `radial-gradient(circle at 0% 0%, ${settings.primaryColor}10 0%, transparent 50%), radial-gradient(circle at 100% 100%, ${settings.secondaryColor}10 0%, transparent 50%)`,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <style>{`
            @media print {
              @page {
                size: A4;
                margin: 10mm;
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
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: white !important;
                z-index: 9999 !important;
              }
              .card {
                width: 85.6mm !important;
                height: 54mm !important;
                border: 1px solid #ddd !important;
                border-radius: 4mm !important;
                box-shadow: none !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                background-color: white !important;
                background-image: none !important;
              }
              .card * {
                visibility: visible !important;
              }
              .text-theme-primary {
                color: ${settings.primaryColor} !important;
              }
            }
          `}</style>
          {/* Header / Top Bar */}
          <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {settings?.schoolCrest ? (
                <img 
                  src={settings.schoolCrest} 
                  className="w-6 h-6 object-contain" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-6 h-6 bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">P</div>
              )}
              <div className="leading-none">
                <h3 className="text-[10px] font-black uppercase tracking-tighter text-black">Piruá E.C.</h3>
                <p className="text-[6px] text-zinc-400 uppercase font-bold">Futebol de Base</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[6px] text-zinc-400 uppercase font-bold">Matrícula</p>
              <p className="text-[10px] font-mono font-bold text-theme-primary">#{athlete.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-3 flex gap-3 overflow-hidden">
            {/* Photo Section */}
            <div className="relative flex-shrink-0">
              <div className="w-[75px] h-[95px] bg-zinc-50 rounded-lg border-2 border-theme-primary overflow-hidden shadow-md relative z-10">
                {photoDataUrl ? (
                  <img 
                    src={photoDataUrl} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 bg-zinc-50">
                    <UserCircle size={36} strokeWidth={1} />
                  </div>
                )}
              </div>
              <div className="absolute -inset-1 bg-theme-primary/5 blur-md rounded-lg -z-0"></div>
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="space-y-0.5">
                <h4 className={`font-black uppercase leading-[1.1] text-black tracking-tight line-clamp-2 mb-1 min-h-[22px] ${
                  athlete.name.length > 40 ? 'text-[8px]' : athlete.name.length > 25 ? 'text-[10px]' : 'text-[12px]'
                }`}>
                  {athlete.name}
                </h4>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div>
                    <p className="text-[6px] text-zinc-400 uppercase font-black">Nascimento</p>
                    <p className="text-[9px] font-bold text-black">{athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
                  </div>
                  <div>
                    <p className="text-[6px] text-zinc-400 uppercase font-black">RG/CPF</p>
                    <p className="text-[9px] font-bold text-black">{athlete.doc || '--'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[6px] text-zinc-400 uppercase font-black">Endereço</p>
                    <p className="text-[8px] font-medium text-zinc-600 leading-tight line-clamp-2">
                      {athlete.street}, {athlete.number} - {athlete.neighborhood}
                    </p>
                    <p className="text-[8px] font-bold text-theme-primary uppercase truncate">
                      {athlete.city || 'Cidade'} / {athlete.uf || 'UF'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5 bg-zinc-50 p-1 rounded-lg border border-zinc-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[6px] text-zinc-400 uppercase font-black">Responsável</p>
                    <p className="text-[8px] font-bold text-zinc-800 uppercase truncate">{athlete.guardian_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[6px] text-zinc-400 uppercase font-black">Telefone</p>
                    <p className="text-[8px] font-bold text-theme-primary">{athlete.guardian_phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Bottom Bar */}
          <div className="h-8 px-4 flex items-center justify-between bg-zinc-50 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="bg-white p-0.5 rounded-[4px] border border-zinc-100">
                <QRCodeCanvas value={`PIRUA-ATHLETE-${athlete.id}`} size={20} />
              </div>
              <p className="text-[6px] text-zinc-400 font-mono leading-none">VALIDA EM TODO<br/>TERRITÓRIO NACIONAL</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/20 rounded-full">
                <p className="text-[7px] font-black text-theme-primary uppercase tracking-widest">Atleta Oficial</p>
              </div>
            </div>
          </div>

          {/* Security Hologram Effect (Decorative) */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[16px]">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-black/5 to-transparent rotate-45 transform translate-x-[-20%] translate-y-[-20%]"></div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-zinc-400 text-sm no-print">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <AlertCircleIcon size={18} className="text-theme-primary" />
          Dica de Impressão
        </h3>
        <p>Para melhores resultados, utilize papel fotográfico ou PVC. O QR Code gerado é único para cada atleta e será utilizado para o registro de presença automático via aplicativo.</p>
      </div>
    </div>
  );
}

function AlertCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
