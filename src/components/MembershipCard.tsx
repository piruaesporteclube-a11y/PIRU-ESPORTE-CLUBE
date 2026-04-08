import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings, getSubCategory } from '../types';
import { api } from '../api';
import { QRCodeSVG } from 'qrcode.react';
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
    let container: HTMLDivElement | null = null;
    
    try {
      // Ensure images are loaded
      const images = cardRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));

      // Create a temporary container for capture
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1000px';
      container.style.height = '1000px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      
      // Reset styles for capture to ensure proportionality (11x8 ratio)
      clone.style.transform = 'none';
      clone.style.scale = '1';
      clone.style.margin = '0';
      clone.style.padding = '0';
      clone.style.width = '440px';
      clone.style.height = '320px';
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#000000';
      clone.style.visibility = 'visible';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.opacity = '1';
      clone.classList.remove('scale-[0.7]', 'xs:scale-[0.8]', 'sm:scale-100');
      
      // Force explicit font sizes and dimensions in the clone
      const originalElements = cardRef.current.querySelectorAll('*');
      const cloneElements = clone.querySelectorAll('*');
      for (let i = 0; i < originalElements.length; i++) {
        const orig = originalElements[i] as HTMLElement;
        const cln = cloneElements[i] as HTMLElement;
        const style = window.getComputedStyle(orig);
        
        // Essential layout and typography styles
        const propsToCopy = [
          'fontSize', 'lineHeight', 'fontFamily', 'fontWeight', 'letterSpacing', 
          'textTransform', 'color', 'padding', 'margin', 'width', 'height', 
          'display', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign',
          'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'boxSizing',
          'objectFit', 'position', 'top', 'left', 'right', 'bottom', 'opacity',
          'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
          'backgroundRepeat', 'gap', 'columnGap', 'rowGap'
        ];
        
        propsToCopy.forEach(prop => {
          (cln.style as any)[prop] = (style as any)[prop];
        });
      }

      // Replace images in clone with data URLs if available
      const clonedImages = clone.querySelectorAll('img');
      clonedImages.forEach(img => {
        const type = img.getAttribute('data-type');
        if (type === 'crest' && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
        }
        if (type === 'photo' && photoDataUrl) {
          img.setAttribute('src', photoDataUrl);
          // Manually handle object-fit: cover for the photo
          img.style.objectFit = 'cover';
          img.style.width = '100%';
          img.style.height = '100%';
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#000000',
        logging: false,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
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
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
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
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1000px'; // Large enough
      container.style.height = '1000px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      
      // Reset styles for capture to ensure proportionality (11x8 ratio)
      clone.style.transform = 'none';
      clone.style.scale = '1';
      clone.style.margin = '0';
      clone.style.padding = '0';
      clone.style.width = '440px';
      clone.style.height = '320px';
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.visibility = 'visible';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.opacity = '1';
      clone.style.borderRadius = '0';
      clone.style.overflow = 'hidden';
      clone.style.backgroundColor = '#000000';
      clone.style.color = 'white';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.boxSizing = 'border-box';
      clone.classList.remove('scale-[0.7]', 'xs:scale-[0.8]', 'sm:scale-100');

      // Force explicit font sizes and dimensions in the clone
      const originalElements = cardRef.current.querySelectorAll('*');
      const cloneElements = clone.querySelectorAll('*');
      for (let i = 0; i < originalElements.length; i++) {
        const orig = originalElements[i] as HTMLElement;
        const cln = cloneElements[i] as HTMLElement;
        const style = window.getComputedStyle(orig);
        
        // Essential layout and typography styles
        const propsToCopy = [
          'fontSize', 'lineHeight', 'fontFamily', 'fontWeight', 'letterSpacing', 
          'textTransform', 'color', 'padding', 'margin', 'width', 'height', 
          'display', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign',
          'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'boxSizing',
          'objectFit', 'position', 'top', 'left', 'right', 'bottom', 'opacity',
          'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
          'backgroundRepeat', 'gap', 'columnGap', 'rowGap'
        ];
        
        propsToCopy.forEach(prop => {
          (cln.style as any)[prop] = (style as any)[prop];
        });
      }

      // Replace images in clone with data URLs if available
      const clonedImages = clone.querySelectorAll('img');
      clonedImages.forEach(img => {
        const type = img.getAttribute('data-type');
        if (type === 'photo' && photoDataUrl) {
          img.setAttribute('src', photoDataUrl);
          img.style.objectFit = 'cover';
          img.style.width = '100%';
          img.style.height = '100%';
        } else if (type === 'crest' && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
          img.style.objectFit = 'contain';
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      container.appendChild(clone);

      // Wait for clone to be ready and settled
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#000000',
        logging: false,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF with custom size (110mm x 80mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [110, 80]
      });

      // Use image properties to maintain aspect ratio perfectly
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = 110;
      const pdfHeight = 80;
      
      const ratio = imgProps.width / imgProps.height;
      let drawWidth = pdfWidth;
      let drawHeight = pdfWidth / ratio;
      
      if (drawHeight > pdfHeight) {
        drawHeight = pdfHeight;
        drawWidth = pdfHeight * ratio;
      }
      
      const x = (pdfWidth - drawWidth) / 2;
      const y = (pdfHeight - drawHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST');
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
        {/* The Card Layout - Custom Size (11cm x 8cm ratio) */}
        <div 
          ref={cardRef}
          className="w-[440px] h-[320px] min-w-[440px] bg-[#050505] text-white rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative card border border-zinc-800/50 print:border-[#d4d4d8] transform scale-[0.7] xs:scale-[0.8] sm:scale-100 origin-center box-border transition-transform duration-500"
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
                width: 110mm !important;
                height: 80mm !important;
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
          <div className="h-16 px-6 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center p-1 bg-[rgba(255,255,255,0.05)] backdrop-blur-md rounded-xl border border-[rgba(255,255,255,0.1)] shadow-xl overflow-hidden">
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
                <h3 className="text-lg font-black uppercase tracking-tighter text-white">Piruá Esporte Clube</h3>
                <p className="text-[9px] text-theme-primary uppercase font-black tracking-[0.2em]">Futebol de Base • Temporada 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Matrícula</p>
              <p className="text-sm font-mono font-black text-white">#{athlete.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex p-5 gap-5 relative z-10 overflow-hidden">
            {/* Photo Section */}
            <div className="relative group flex-shrink-0 flex flex-col items-center justify-center">
              <div className="w-[105px] h-[140px] bg-[#09090b] rounded-[1.2rem] border-2 border-[rgba(234,179,8,0.3)] overflow-hidden shadow-2xl relative z-10 group-hover:border-theme-primary transition-colors">
                {photoDataUrl ? (
                  <img 
                    src={photoDataUrl} 
                    className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                    data-type="photo"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#3f3f46] bg-[#09090b]">
                    <UserCircle size={48} strokeWidth={1} />
                  </div>
                )}
              </div>
              {/* Photo Glow */}
              <div 
                className="absolute -inset-3 blur-3xl opacity-20 rounded-[1.5rem] -z-0"
                style={{ backgroundColor: settings.primaryColor }}
              ></div>
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
              <div className="space-y-3">
                <div>
                  <div className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-1 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                    Nome do Aluno
                  </div>
                  <h4 className="text-[14px] font-black uppercase leading-tight text-white tracking-tight mb-1 break-words line-clamp-2 max-h-[36px] overflow-hidden">
                    {athlete.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      DATA DE NASCIMENTO
                    </div>
                    <p className="text-[10px] font-black text-white whitespace-nowrap">
                      {athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Categoria (Sub)
                    </div>
                    <p className="text-[10px] font-black text-theme-primary uppercase">{getSubCategory(athlete.birth_date)}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      RG/CPF
                    </div>
                    <p className="text-[10px] font-black text-white truncate">{athlete.doc || '--'}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] text-[#71717a] uppercase font-black tracking-widest mb-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-theme-primary"></div>
                      Uniforme
                    </div>
                    <p className="text-[10px] font-black text-white">#{athlete.jersey_number || '--'}</p>
                  </div>
                </div>

                <div className="bg-[rgba(255,255,255,0.03)] backdrop-blur-md p-2 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-[6px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Responsável Legal</p>
                        <p className="text-[8px] font-bold text-[#d4d4d8] uppercase leading-tight truncate">{athlete.guardian_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[6px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Telefone</p>
                        <p className="text-[9px] font-black text-theme-primary whitespace-nowrap">{athlete.guardian_phone}</p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[6px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Endereço do Responsável</p>
                      <p className="text-[7px] font-medium text-[#a1a1aa] uppercase leading-tight truncate">
                        {athlete.street}, {athlete.number} - {athlete.neighborhood}
                      </p>
                      <p className="text-[7px] font-black text-theme-primary uppercase tracking-tighter">
                        {athlete.city} / {athlete.uf}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="h-20 px-6 flex items-center justify-between relative z-10 bg-[rgba(0,0,0,0.6)] border-t border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1.5 rounded-xl shadow-xl flex items-center justify-center">
                <QRCodeSVG 
                  value={`PIRUA-ATHLETE-${athlete.id}`} 
                  size={60} 
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: crestDataUrl || undefined,
                    x: undefined,
                    y: undefined,
                    height: 12,
                    width: 12,
                    excavate: true,
                  }}
                />
              </div>
              <div className="leading-tight">
                <p className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Validação Digital</p>
                <p className="text-[7px] text-white/60 font-medium max-w-[180px] leading-relaxed">
                  Aponte a câmera para o QR Code para validar a presença e situação do atleta.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[8px] text-[#71717a] uppercase font-black tracking-widest mb-0.5">Validade</p>
                <p className="text-[10px] font-black text-theme-primary">31/12/2026</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ShieldCheck size={20} className="text-theme-primary" />
                <p className="text-[6px] text-zinc-500 font-black uppercase tracking-widest">Documento Oficial</p>
              </div>
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
