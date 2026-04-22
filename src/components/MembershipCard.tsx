import React, { useState, useEffect, useRef } from 'react';
import { Athlete, Settings, getSubCategory } from '../types';
import { api } from '../api';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
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
        if (!isMounted) return;
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
        if (!isMounted) return;
        console.warn('Failed to load image with CORS:', url);
        callback(url);
      };
      // Add a cache-busting parameter to avoid cached images without CORS headers
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(athlete.photo || '', setPhotoDataUrl);
    convertToDataUrl(settings?.schoolCrest || '', setCrestDataUrl);

    return () => {
      isMounted = false;
    };
  }, [athlete.photo, settings?.schoolCrest]);

  const handlePrint = () => {
    if (!cardRef.current) return;
    
    // Small delay to ensure any dynamic styles or images are ready
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const captureCard = async (scale = 3) => {
    if (!cardRef.current) return null;

    // Create a temporary container for capture
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1000px';
    container.style.height = '1000px';
    container.style.zIndex = '-9999';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    try {
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
      clone.style.borderRadius = '20px';
      clone.style.overflow = 'hidden';
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
          'backgroundRepeat', 'gap', 'columnGap', 'rowGap', 'flex', 'flexGrow', 'flexShrink'
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
          img.style.objectFit = 'cover';
          img.style.width = '100%';
          img.style.height = '100%';
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      // Handle QR Code - ensure it's captured correctly
      const qrContainer = clone.querySelector('.qr-code-container');
      if (qrContainer) {
        const originalCanvas = cardRef.current.querySelector('.qr-code-container canvas');
        if (originalCanvas) {
          const qrImage = document.createElement('img');
          qrImage.src = (originalCanvas as HTMLCanvasElement).toDataURL();
          qrImage.style.width = '26px';
          qrImage.style.height = '26px';
          qrImage.style.display = 'block';
          qrContainer.innerHTML = '';
          qrContainer.appendChild(qrImage);
          
          const label = document.createElement('p');
          label.innerText = 'PIRUÁ E.C';
          label.style.fontSize = '2px';
          label.style.fontWeight = '900';
          label.style.color = 'black';
          label.style.marginTop = '2px';
          qrContainer.appendChild(label);
        }
      }

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#000000',
        logging: false,
        width: 440,
        height: 320,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });

      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error('Error capturing card:', error);
      return null;
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
    }
  };

  const handleDownloadImage = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('Gerando imagem da carteirinha...');
    
    try {
      const imgData = await captureCard(4); // Higher scale for image
      if (!imgData) throw new Error('Failed to capture card');

      const link = document.createElement('a');
      link.href = imgData;
      link.download = `carteirinha-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
      
      toast.success('Imagem gerada com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Erro ao gerar imagem.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const loadingToast = toast.loading('Gerando PDF da carteirinha...');
    
    try {
      const imgData = await captureCard(3);
      if (!imgData) throw new Error('Failed to capture card');
      
      // Create PDF with custom size (110mm x 80mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [110, 80]
      });

      const pdfWidth = 110;
      const pdfHeight = 80;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`carteirinha-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      toast.success('PDF gerado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente usar a opção de imprimir e salvar como PDF.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-bold text-white">Carteirinha do Atleta</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadImage}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            title="Baixar como Imagem (PNG)"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin text-theme-primary" /> : <Download size={18} />}
            Imagem
          </button>
          <button 
            onClick={handleSavePDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin text-theme-primary" /> : <FileDown size={18} />}
            {isGenerating ? 'Gerando...' : 'Salvar em PDF'}
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
          className="w-[440px] h-[320px] min-w-[440px] bg-[#050505] text-white rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative card border-4 border-theme-primary transform scale-[0.7] xs:scale-[0.8] sm:scale-100 origin-center box-border transition-transform duration-500 antialiased"
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
                border: 1.5mm solid #eab308 !important;
                border-radius: 4mm !important;
                box-shadow: none !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                background-color: #000000 !important;
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

            .card-pattern {
              background-color: #000000;
              background-image: 
                radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
              background-size: 12px 12px;
            }

            .card-yellow-lines {
              background: repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 10px,
                rgba(234, 179, 8, 0.1) 10px,
                rgba(234, 179, 8, 0.1) 11px
              );
            }

            .input-box {
              background-color: white;
              border-radius: 6px;
              height: 24px;
              display: flex;
              align-items: center;
              padding: 0 8px;
              color: black;
              font-weight: 900;
              font-size: 10px;
              text-transform: uppercase;
              border: 1px solid #eab308;
            }

            .number-circle {
              background-color: #eab308;
              color: black;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              font-weight: 900;
              flex-shrink: 0;
            }

            .label-text {
              color: white;
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
          `}</style>

          {/* Background Layers */}
          <div className="absolute inset-0 card-pattern pointer-events-none"></div>
          <div className="absolute inset-0 card-yellow-lines pointer-events-none"></div>
          
          {/* Main Layout Container */}
          <div className="relative z-10 flex flex-col h-full p-2 pb-3.5">
            
            {/* Top Section: Header & Photo */}
            <div className="flex justify-between items-start mb-0.5">
              {/* Crest */}
              <div className="w-14 h-14 flex-shrink-0">
                {crestDataUrl ? (
                  <img src={crestDataUrl} className="w-full h-full object-contain filter drop-shadow-lg" data-type="crest" />
                ) : (
                  <div className="w-full h-full bg-theme-primary rounded-xl flex items-center justify-center text-black font-black text-lg">P</div>
                )}
              </div>

              {/* Center Header Info */}
              <div className="flex-1 flex flex-col items-center text-center px-1">
                <h1 className="text-lg font-black text-theme-primary tracking-tighter leading-none mb-0.5 italic">PIRUÁ E.C</h1>
                <p className="text-[7px] font-black text-white tracking-[0.2em] mb-0.5">ESCOLINHA DE FUTEBOL</p>
                
                <div className="bg-theme-primary px-2 py-0.5 rounded-full mb-0.5">
                  <p className="text-[6px] font-black text-black uppercase">Carteirinha Oficial do Aluno</p>
                </div>
                <p className="text-[7px] font-black text-theme-primary italic">TEMPORADA 2026</p>
              </div>

              {/* Athlete Photo */}
              <div className="w-[65px] h-[85px] bg-white p-0.5 rounded-lg shadow-2xl flex-shrink-0">
                <div className="w-full h-full bg-zinc-200 rounded-md overflow-hidden relative">
                  {photoDataUrl ? (
                    <img src={photoDataUrl} className="w-full h-full object-cover" data-type="photo" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <UserCircle size={28} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Section: Athlete Data */}
            <div className="grid grid-cols-12 gap-x-2 gap-y-0.5 mb-1">
              {/* 1. Nome Completo */}
              <div className="col-span-12">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="number-circle !w-2 !h-2 !text-[5px]">1</div>
                  <span className="label-text !text-[6px]">Nome Completo do Aluno</span>
                </div>
                <div className="input-box text-[8px] !h-auto min-h-[15px] py-0.5 leading-none">{athlete.name}</div>
              </div>

              {/* 2. Data de Nascimento */}
              <div className="col-span-6">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="number-circle !w-2 !h-2 !text-[5px]">2</div>
                  <span className="label-text !text-[6px]">Data de Nascimento</span>
                </div>
                <div className="input-box h-[15px] text-[7px]">
                  {athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--/--/----'}
                </div>
              </div>

              {/* 3. RG / CPF */}
              <div className="col-span-6">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="number-circle !w-2 !h-2 !text-[5px]">3</div>
                  <span className="label-text !text-[6px]">RG / CPF</span>
                </div>
                <div className="input-box h-[15px] text-[7px]">{athlete.doc || '---.---.---/--'}</div>
              </div>

              {/* 4. Posição */}
              <div className="col-span-6">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="number-circle !w-2 !h-2 !text-[5px]">4</div>
                  <span className="label-text !text-[6px]">Posição</span>
                </div>
                <div className="input-box h-[15px] text-[7px]">{athlete.position || 'N/A'}</div>
              </div>

              {/* 5. Sub */}
              <div className="col-span-6">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="number-circle !w-2 !h-2 !text-[5px]">5</div>
                  <span className="label-text !text-[6px]">Sub</span>
                </div>
                <div className="input-box h-[15px] text-[7px]">{getSubCategory(athlete.birth_date)}</div>
              </div>
            </div>

            {/* Bottom Section: Responsável & QR Code */}
            <div className="mt-auto border border-theme-primary/30 rounded-xl p-1 bg-black/40 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full card-yellow-lines opacity-10 pointer-events-none"></div>
              
              <div className="flex gap-2 relative z-10">
                {/* Left: Guardian Info */}
                <div className="flex-1 space-y-0.5">
                  <div className="bg-theme-primary/20 px-1 py-0.5 rounded inline-block mb-0.5">
                    <p className="text-[5px] font-black text-theme-primary uppercase">Dados do Responsável</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="number-circle !w-2 !h-2 !text-[4px]">7</div>
                      <span className="label-text !text-[5px]">Nome Completo do Responsável</span>
                    </div>
                    <div className="input-box !h-auto min-h-[14px] !text-[6px] py-0.5 leading-none">{athlete.guardian_name}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="number-circle !w-2 !h-2 !text-[4px]">8</div>
                      <span className="label-text !text-[5px]">Endereço Completo</span>
                    </div>
                    <div className="input-box !h-auto min-h-[26px] !text-[5.5px] items-start py-1 px-1 leading-[1.2] overflow-visible break-words flex flex-wrap">
                      {athlete.street}, {athlete.number} - {athlete.neighborhood} • {athlete.city}/{athlete.uf}
                    </div>
                  </div>
                </div>

                {/* Right: Phone, Validity & QR */}
                <div className="w-[100px] flex flex-col gap-0.5">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="number-circle !w-2 !h-2 !text-[4px]">10</div>
                      <span className="label-text !text-[5px]">Telefone do Responsável</span>
                    </div>
                    <div className="input-box !h-3.5 !text-[6px]">{athlete.guardian_phone}</div>
                  </div>

                  <div className="flex gap-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="number-circle !w-2 !h-2 !text-[4px]">9</div>
                        <span className="label-text !text-[5px]">Validade</span>
                      </div>
                      <div className="input-box !h-3.5 !text-[6px] justify-center">31/12/{new Date().getFullYear()}</div>
                    </div>
                    
                    <div className="bg-white p-0.5 rounded-md flex flex-col items-center shadow-xl flex-shrink-0 qr-code-container">
                      <QRCodeCanvas value={`PIRUA-ATHLETE-${athlete.id}`} size={26} level="H" />
                      <p className="text-[2px] font-black text-black mt-0.5">PIRUÁ E.C</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Motto */}
            <div className="mt-0.5 text-center">
              <p className="text-[4px] font-black text-theme-primary tracking-[0.1em] uppercase">
                Disciplina • Dedicação • Respeito • Evolução
              </p>
            </div>
          </div>

          {/* Bottom Validity Bar */}
          <div className="absolute bottom-0 left-0 w-full h-4 bg-theme-primary flex items-center justify-center z-20">
            <p className="text-[9px] font-black text-black uppercase tracking-widest">
              Validade: 31/12/{new Date().getFullYear()}
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
