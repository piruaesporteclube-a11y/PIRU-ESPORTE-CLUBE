import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings } from '../types';
import { api } from '../api';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, UserCircle, MapPin, Phone, Hash, FileDown, Loader2 } from 'lucide-react';
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
      // Create a clone for PDF generation to avoid modifying the UI
      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 340,
        height: 215,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.querySelector('.card') as HTMLElement;
          if (clonedCard) {
            clonedCard.style.visibility = 'visible';
            clonedCard.style.display = 'flex';
            // Ensure all images in the clone have crossOrigin set
            const images = clonedCard.getElementsByTagName('img');
            for (let i = 0; i < images.length; i++) {
              images[i].crossOrigin = 'anonymous';
            }
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
      alert('Erro ao gerar PDF. Isso pode ser devido a restrições de segurança das imagens. Tente imprimir e salvar como PDF pelo navegador.');
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
          className="w-[340px] h-[215px] min-w-[340px] bg-white text-black rounded-[16px] overflow-hidden shadow-2xl flex flex-col relative card border border-zinc-200 print:border-zinc-300"
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
                size: 85.6mm 54mm;
                margin: 0;
              }
              /* Hide everything by default */
              body * {
                visibility: hidden !important;
              }
              /* Show ONLY the card container and its contents */
              .card-print-container, .card-print-container * {
                visibility: visible !important;
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
                z-index: 999999 !important;
              }
              .card {
                width: 85.6mm !important;
                height: 54mm !important;
                border-radius: 4mm !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: white !important; /* Force background color */
                background-image: none !important; /* Remove gradient for print to avoid black issues */
                color: black !important;
                box-shadow: none !important;
                display: flex !important;
                flex-direction: column !important;
                border: none !important;
              }
              .card img {
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
              }
              .text-theme-primary {
                color: ${settings.primaryColor} !important;
              }
            }
          `}</style>
          {/* Header / Top Bar */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {settings?.schoolCrest ? (
                <img 
                  src={settings.schoolCrest} 
                  className="w-6 h-6 object-contain" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-6 h-6 bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">P</div>
              )}
              <div className="leading-none">
                <h3 className="text-[11px] font-black uppercase tracking-tighter text-black">Piruá E.C.</h3>
                <p className="text-[7px] text-zinc-400 uppercase font-bold">Futebol de Base</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[7px] text-zinc-400 uppercase font-bold">Matrícula</p>
              <p className="text-[11px] font-mono font-bold text-theme-primary">#{athlete.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-4 flex gap-4">
            {/* Photo Section */}
            <div className="relative group">
              <div className="w-[85px] h-[105px] bg-zinc-50 rounded-xl border-2 border-theme-primary overflow-hidden shadow-lg relative z-10">
                {athlete.photo ? (
                  <img 
                    src={athlete.photo} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 bg-zinc-50">
                    <UserCircle size={40} strokeWidth={1} />
                  </div>
                )}
              </div>
              {/* Decorative elements behind photo */}
              <div className="absolute -inset-1 bg-theme-primary/10 blur-md rounded-xl -z-0"></div>
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="space-y-0.5">
                <h4 className={`font-black uppercase leading-[1.1] text-black tracking-tight line-clamp-2 mb-1 min-h-[20px] ${
                  athlete.name.length > 30 ? 'text-[7px]' : athlete.name.length > 20 ? 'text-[8px]' : 'text-[10px]'
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
                    <p className="text-[8px] font-medium text-zinc-600 leading-tight">
                      {athlete.street}, {athlete.number} - {athlete.neighborhood}
                    </p>
                    <p className="text-[8px] font-bold text-theme-primary uppercase">
                      {athlete.city || 'Cidade'} / {athlete.uf || 'UF'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5 bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[6px] text-zinc-400 uppercase font-black">Responsável</p>
                    <p className="text-[9px] font-bold text-zinc-800 uppercase truncate max-w-[120px]">{athlete.guardian_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[6px] text-zinc-400 uppercase font-black">Telefone</p>
                    <p className="text-[9px] font-bold text-theme-primary">{athlete.guardian_phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Bottom Bar */}
          <div className="h-10 px-4 flex items-center justify-between bg-zinc-50 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="bg-white p-0.5 rounded-[4px] border border-zinc-100">
                <QRCodeSVG value={`PIRUA-ATHLETE-${athlete.id}`} size={24} />
              </div>
              <p className="text-[7px] text-zinc-400 font-mono leading-none">VALIDA EM TODO<br/>TERRITÓRIO NACIONAL</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/20 rounded-full">
                <p className="text-[8px] font-black text-theme-primary uppercase tracking-widest">Atleta Oficial</p>
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
          <AlertCircle size={18} className="text-theme-primary" />
          Dica de Impressão
        </h3>
        <p>Para melhores resultados, utilize papel fotográfico ou PVC. O QR Code gerado é único para cada atleta e será utilizado para o registro de presença automático via aplicativo.</p>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
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
