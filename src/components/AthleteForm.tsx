import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, User } from '../types';
import { X, Upload, Save, UserCircle, MessageCircle, ClipboardCheck, Printer, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import { toast } from 'sonner';
import { cn, fixHtml2CanvasColors } from '../utils';
import { useTheme } from '../contexts/ThemeContext';

interface AthleteFormProps {
  athlete?: Athlete | null;
  onClose: () => void;
  onSave: () => void;
  isRegistration?: boolean;
  onRegisterSuccess?: (athlete: Athlete) => void;
  standalone?: boolean;
}

export default function AthleteForm({ athlete, onClose, onSave, isRegistration, onRegisterSuccess, standalone }: AthleteFormProps) {
  const { settings } = useTheme();
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Athlete>>({
    name: '',
    nickname: '',
    birth_date: '',
    doc: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    jersey_number: '',
    photo: '',
    contact: '',
    guardian_name: '',
    guardian_doc: '',
    guardian_phone: '',
    status: 'Ativo',
    modality: '',
    gender: 'Masculino'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (athlete) setFormData(prev => ({ ...prev, ...athlete }));
  }, [athlete]);

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
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(settings?.schoolCrest || '', setCrestDataUrl);
  }, [settings?.schoolCrest]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 400 * 1024) { // Reduced to 400KB to avoid Firestore document size limits
        toast.error("O arquivo é muito grande. Por favor, escolha um arquivo com menos de 400KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields are filled
    const requiredFields: (keyof Athlete)[] = [
      'name', 'nickname', 'birth_date', 'doc', 'street', 'number', 
      'neighborhood', 'city', 'uf', 'photo', 'contact', 'jersey_number',
      'guardian_name', 'guardian_doc', 'guardian_phone', 'modality', 'gender'
    ];
    
    const missing = requiredFields.filter(f => !formData[f]);
    if (missing.length > 0) {
      toast.error("Por favor, preencha todos os campos obrigatórios, incluindo a foto.");
      return;
    }

    if (formData.photo && !formData.photo.startsWith('data:')) {
      toast.error("A foto ainda está sendo processada. Por favor, aguarde um momento.");
      return;
    }

    setLoading(true);
    try {
      if (isRegistration) {
        const { athlete } = await api.register(formData);
        toast.success("Cadastro realizado com sucesso!");
        onRegisterSuccess?.(athlete);
      } else {
        await api.saveAthlete(formData);
        toast.success("Atleta salvo com sucesso!");
        onSave();
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF da ficha...');
    
    let container: HTMLDivElement | null = null;
    try {
      // Ensure images are loaded before capturing
      const images = printRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000); // 3s timeout for each image
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));

      // Create a temporary container for capture
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '1200px';
      container.style.height = '2000px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = printRef.current.cloneNode(true) as HTMLElement;
      
      // Reset styles for capture to ensure proportionality
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.padding = '40px';
      clone.style.width = '800px';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      clone.style.display = 'block';
      clone.style.boxSizing = 'border-box';
      clone.classList.remove('hidden'); // Ensure it's visible for capture

      // Force explicit font sizes and dimensions in the clone
      const originalElements = printRef.current.querySelectorAll('*');
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
        const src = img.getAttribute('src');
        if (src === settings?.schoolCrest && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
        }
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = 'block';
        img.setAttribute('crossOrigin', 'anonymous');
      });

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        onclone: (clonedDoc) => {
          fixHtml2CanvasColors(clonedDoc.body);
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      if (finalHeight > (pdfHeight - margin * 2)) {
        finalHeight = pdfHeight - margin * 2;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }

      const x = (pdfWidth - finalWidth) / 2;

      pdf.addImage(imgData, 'PNG', x, margin, finalWidth, finalHeight);
      pdf.save(`ficha_atleta_${formData.name?.replace(/\s+/g, '_')}.pdf`);
      
      toast.success('PDF gerado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente usar a opção de imprimir.', { id: loadingToast });
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      setIsGeneratingPDF(false);
    }
  };

  const formContent = (
    <div className={cn(
      "bg-black border border-zinc-800 w-full rounded-3xl shadow-2xl",
      !standalone && "max-w-4xl my-auto"
    )}>
      <div className="flex items-center justify-between p-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          {!standalone && (
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 md:hidden">
              <X size={20} />
            </button>
          )}
          <div className="w-12 h-12 flex items-center justify-center p-1.5 bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl overflow-hidden">
            {settings?.schoolCrest ? (
              <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-theme-primary rounded-lg flex items-center justify-center text-black font-black text-xl">P</div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">
              {isRegistration ? 'Novo Cadastro de Aluno' : (athlete ? 'Editar Atleta' : 'Novo Cadastro de Atleta')}
            </h2>
            {athlete && <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{athlete.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {athlete && (
            <button 
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all no-print"
            >
              <Save size={18} />
              <span className="font-bold uppercase text-xs tracking-widest">Imprimir Ficha</span>
            </button>
          )}
          {!standalone && (
            <button onClick={onClose} className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group no-print">
              <X size={18} className="group-hover:rotate-90 transition-transform" />
              <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Photo Upload Section */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center gap-4 p-6 bg-zinc-800/30 border border-zinc-800 rounded-3xl w-full max-w-sm">
              <div className="relative group">
                {formData.photo ? (
                  <img src={formData.photo} className="w-[120px] h-[160px] object-cover rounded-xl border-2 border-theme-primary shadow-lg shadow-theme-primary/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-[120px] h-[160px] bg-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700 group-hover:border-theme-primary transition-colors">
                    <UserCircle size={48} />
                    <span className="text-[10px] mt-2 font-bold uppercase">Foto 3x4</span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                  <Upload className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e)} />
                </label>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Foto do Atleta (3x4)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Informações Pessoais</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Apelido</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.nickname || ''}
                      onChange={e => setFormData({...formData, nickname: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data de Nascimento</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.birth_date || ''}
                      onChange={e => setFormData({...formData, birth_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF/RG</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.doc || ''}
                      onChange={e => setFormData({...formData, doc: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">NUMERO DO UNIFORME</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.jersey_number || ''}
                      onChange={e => setFormData({...formData, jersey_number: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Aluno</label>
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 pr-12 uppercase"
                        value={formData.contact || ''}
                        onChange={e => setFormData({...formData, contact: e.target.value.toUpperCase()})}
                      />
                      {formData.contact && formData.contact.replace(/\D/g, '') && (
                        <a 
                          href={`https://wa.me/55${formData.contact.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Sexo</label>
                    <select 
                      required 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase" 
                      value={formData.gender || 'Masculino'} 
                      onChange={e => setFormData({...formData, gender: e.target.value as any})}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Modalidades Esportivas (Selecione uma ou mais)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {["Futebol de Campo", "Futsal", "Volêi", "Corrida de Rua", "Outros"].map(m => {
                        const isSelected = formData.modality?.split(', ').includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const current = formData.modality ? formData.modality.split(', ') : [];
                              let next;
                              if (current.includes(m)) {
                                next = current.filter(item => item !== m);
                              } else {
                                next = [...current, m];
                              }
                              setFormData({...formData, modality: next.join(', ')});
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all",
                              isSelected 
                                ? "bg-theme-primary border-theme-primary text-black" 
                                : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                            )}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Endereço</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Rua</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.street || ''}
                      onChange={e => setFormData({...formData, street: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nº</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.number || ''}
                      onChange={e => setFormData({...formData, number: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Bairro</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={formData.neighborhood || ''}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.city || ''}
                      onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                    <input 
                      required
                      type="text" 
                      maxLength={2}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.uf || ''}
                      onChange={e => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Guardian Info */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Responsável Legal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Responsável</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={formData.guardian_name || ''}
                    onChange={e => setFormData({...formData, guardian_name: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">RG/CPF Responsável</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={formData.guardian_doc || ''}
                    onChange={e => setFormData({...formData, guardian_doc: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Responsável</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 pr-12 uppercase"
                      value={formData.guardian_phone || ''}
                      onChange={e => setFormData({...formData, guardian_phone: e.target.value.toUpperCase()})}
                    />
                    {formData.guardian_phone && formData.guardian_phone.replace(/\D/g, '') && (
                      <a 
                        href={`https://wa.me/55${formData.guardian_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status</label>
              <select 
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                value={formData.status || 'Ativo'}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
            {!standalone && (
              <button 
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black rounded-xl font-black hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20 disabled:opacity-50"
              >
                <FileDown size={20} />
                {isGeneratingPDF ? 'Gerando...' : 'Gerar PDF'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-black hover:bg-zinc-100 transition-all shadow-lg"
              >
                <Printer size={20} />
                Imprimir
              </button>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (
                <>
                  <Save size={20} />
                  {isRegistration ? 'Finalizar Cadastro' : 'Salvar Atleta'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  
    const printContent = (
      <div className="hidden print-only bg-white text-black p-8 min-h-screen" ref={printRef}>
        <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {settings?.schoolCrest && (
              <img src={settings.schoolCrest} alt="Crest" className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />
            )}
            <div className="text-left">
              <h1 className="text-2xl font-black uppercase leading-tight">Piruá Esporte Clube</h1>
              <h2 className="text-sm font-bold uppercase text-zinc-600">Ficha de Cadastro de Atleta</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-zinc-500">Data de Emissão:</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
  
        <div className="grid grid-cols-4 gap-8 mb-8">
          <div className="col-span-1">
            <div className="w-full aspect-[3/4] border-2 border-black rounded-lg overflow-hidden flex items-center justify-center bg-zinc-100">
              {formData.photo ? (
                <img src={formData.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[10px] font-bold uppercase text-zinc-400">Foto 3x4</span>
              )}
            </div>
          </div>
          <div className="col-span-3 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Nome Completo</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.name || '___________________________'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Apelido</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.nickname || '___________________________'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Data de Nascimento</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.birth_date || '____/____/_______'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">CPF/RG</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.doc || '___________________________'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Uniforme</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">#{formData.jersey_number || '____'}</p>
              </div>
            </div>
          </div>
        </div>
  
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase bg-zinc-100 p-2 mb-3">Endereço e Contato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-[10px] font-black uppercase text-zinc-500">Endereço</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">
                  {formData.street ? `${formData.street}, ${formData.number} - ${formData.neighborhood}` : '____________________________________________________________________'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Cidade/UF</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.city ? `${formData.city} - ${formData.uf}` : '___________________________'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Telefone/WhatsApp</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.contact || '___________________________'}</p>
              </div>
            </div>
          </div>
  
          <div>
            <h3 className="text-xs font-black uppercase bg-zinc-100 p-2 mb-3">Responsável Legal</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Nome do Responsável</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.guardian_name || '___________________________'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">CPF/RG Responsável</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.guardian_doc || '___________________________'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">WhatsApp Responsável</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.guardian_phone || '___________________________'}</p>
              </div>
            </div>
          </div>
        </div>
  
        <div className="mt-20 space-y-12">
          <div className="flex justify-between gap-12">
            <div className="flex-1 border-t border-black text-center pt-2">
              <p className="text-[10px] font-bold uppercase">Assinatura do Responsável</p>
            </div>
            <div className="flex-1 border-t border-black text-center pt-2">
              <p className="text-[10px] font-bold uppercase">Assinatura da Coordenação</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-400 uppercase">Piruá Esporte Clube - Formando Atletas, Cidadãos e Campeões</p>
          </div>
        </div>
      </div>
    );
  
    if (standalone) return (
      <>
        {formContent}
        {printContent}
      </>
    );
  
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-start justify-center p-4 overflow-y-auto py-8">
        {formContent}
        {printContent}
      </div>
    );
  }
