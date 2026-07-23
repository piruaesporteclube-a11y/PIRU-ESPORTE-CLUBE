import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, User } from '../types';
import { X, Upload, Save, UserCircle, MessageCircle, ClipboardCheck, Printer, FileDown, ScanFace, Fingerprint, Camera, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, RefreshCw, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import { toast } from 'sonner';
import { cn, fixHtml2CanvasColors, compressImage, formatPhone, normalizePhone } from '../utils';
import { useTheme } from '../contexts/ThemeContext';

interface AthleteFormProps {
  athlete?: Athlete | null;
  onClose: () => void;
  onSave: (updatedAthlete?: Athlete) => void;
  isRegistration?: boolean;
  onRegisterSuccess?: (athlete: Athlete) => void;
  standalone?: boolean;
  userRole?: 'admin' | 'student' | 'professor';
}

const POSITIONS_BY_MODALITY: Record<string, string[]> = {
  "Futebol de Campo": ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante", "Ponta", "Líbero"],
  "Futsal": ["Goleiro", "Fixo", "Ala", "Pivô"],
  "Volêi": ["Levantador", "Ponteiro", "Oposto", "Central", "Líbero"],
  "Corrida de Rua": ["Velocista", "Meio-Fundista", "Fundista", "Maratonista"],
  "Outros": ["Atleta", "Competidor", "Amador", "Outros"]
};

export default function AthleteForm({ athlete, onClose, onSave, isRegistration, onRegisterSuccess, standalone, userRole }: AthleteFormProps) {
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
    email: '',
    guardian_name: '',
    guardian_doc: '',
    guardian_phone: '',
    school: '',
    school_shift: undefined,
    status: 'Inativo',
    position: '',
    modality: '',
    gender: 'Masculino',
    confirmation: 'Pendente',
    biometrics_face_registered: false,
    biometrics_fingerprint_registered: false
  });
  const [loading, setLoading] = useState(false);

  // Biometrics States
  const [isFaceCameraOpen, setIsFaceCameraOpen] = useState(false);
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [fingerprintHand, setFingerprintHand] = useState<'Direito' | 'Esquerdo'>('Direito');
  const [fingerprintStep, setFingerprintStep] = useState(0); // 0, 1, 2, 3 (3 = complete)
  const [isScanningFinger, setIsScanningFinger] = useState(false);

  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const [faceCameraStream, setFaceCameraStream] = useState<MediaStream | null>(null);

  const startFaceCamera = async () => {
    try {
      setIsFaceCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      setFaceCameraStream(stream);
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        faceVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      toast.error('Não foi possível abrir a câmera. Verifique as permissões.');
      setIsFaceCameraOpen(false);
    }
  };

  const stopFaceCamera = () => {
    if (faceCameraStream) {
      faceCameraStream.getTracks().forEach(track => track.stop());
      setFaceCameraStream(null);
    }
    setIsFaceCameraOpen(false);
  };

  const captureFaceBiometrics = () => {
    if (!faceVideoRef.current) return;
    const video = faceVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setFormData(prev => ({
        ...prev,
        photo: dataUrl,
        biometrics_face_registered: true,
        biometrics_face_date: new Date().toLocaleDateString('pt-BR')
      }));
      toast.success('📸 Foto e Biometria Facial registradas com sucesso!');
      stopFaceCamera();
    }
  };

  const handleSimulateFingerprintScan = () => {
    if (fingerprintStep >= 3) return;
    setIsScanningFinger(true);
    
    setTimeout(() => {
      const nextStep = fingerprintStep + 1;
      setFingerprintStep(nextStep);
      setIsScanningFinger(false);
      
      if (nextStep === 3) {
        const uniqueHash = `BIO-IND-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        setFormData(prev => ({
          ...prev,
          biometrics_fingerprint_registered: true,
          biometrics_fingerprint_date: new Date().toLocaleDateString('pt-BR'),
          fingerprint_hash: uniqueHash,
          fingerprint_hand: fingerprintHand
        }));
        toast.success(`👆 Biometria do Dedo Indicador (${fingerprintHand}) cadastrada com sucesso!`);
      } else {
        toast.info(`Toque ${nextStep}/3 recebido no leitor biométrico.`);
      }
    }, 900);
  };

  const getAvailablePositions = () => {
    const selectedModalities = formData.modality ? formData.modality.split(', ').filter(Boolean) : [];
    if (selectedModalities.length === 0) {
      return Array.from(new Set(Object.values(POSITIONS_BY_MODALITY).flat()));
    }
    const positions = new Set<string>();
    selectedModalities.forEach(mod => {
      const list = POSITIONS_BY_MODALITY[mod] || [];
      list.forEach(pos => positions.add(pos));
    });
    return Array.from(positions);
  };

  useEffect(() => {
    if (athlete) {
      setFormData(prev => ({
        ...prev,
        ...athlete,
        confirmation: athlete.confirmation || (athlete.status === 'Ativo' ? 'Confirmado' : 'Pendente')
      }));
    }
  }, [athlete]);

  // Enforce Inativo status if confirmation is Pendente or Recusado
  useEffect(() => {
    if (formData.confirmation === 'Pendente' || formData.confirmation === 'Recusado') {
      if (formData.status !== 'Inativo') {
        setFormData(prev => ({ ...prev, status: 'Inativo' }));
      }
    }
  }, [formData.confirmation]);

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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("O arquivo selecionado não é uma imagem válida. Por favor, escolha um arquivo JPG, PNG ou similar.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Compress image before saving
        try {
          const compressed = await compressImage(base64, 400, 400, 0.6); // Profile pictures don't need to be huge
          setFormData(prev => ({ ...prev, photo: compressed }));
        } catch (error) {
          console.error("Compression error:", error);
          setFormData(prev => ({ ...prev, photo: base64 }));
        }
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
      'neighborhood', 'city', 'uf', 'photo', 'contact', 'email',
      'guardian_name', 'guardian_doc', 'guardian_phone', 'modality', 'gender', 'position'
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
      // Normalize phone numbers before saving
      const dataToSave = {
        ...formData,
        contact: normalizePhone(formData.contact || ''),
        guardian_phone: normalizePhone(formData.guardian_phone || '')
      };

      if (isRegistration) {
        const { athlete } = await api.register(dataToSave);
        toast.success("Cadastro realizado com sucesso!");
        
        // Auto WhatsApp invitation trigger
        const guardianPhoneClean = athlete.guardian_phone?.replace(/\D/g, "");
        if (guardianPhoneClean) {
          const parentsGroupLink = localStorage.getItem('pirua_wa_parents_link') || 'https://chat.whatsapp.com/FLX90tKPlw0928aKJ4v1';
          const inviteMsg = `Olá! Tudo bem? O cadastro de ${athlete.name} no Piruá Esporte Clube foi realizado com sucesso. Por favor, entre no nosso Grupo de Responsáveis Oficial para receber recados e informativos: ${parentsGroupLink}`;
          
          toast.success("Enviando convite de WhatsApp...", {
            description: "Abrindo chat com o responsável...",
            duration: 5000
          });
          
          setTimeout(() => {
            window.open(`https://wa.me/55${guardianPhoneClean}?text=${encodeURIComponent(inviteMsg)}`, '_blank');
          }, 1200);
        }
        
        onRegisterSuccess?.(athlete);
      } else {
        if (userRole === 'professor') {
          await api.saveProfessor(dataToSave as any);
          toast.success("Dados da comissão salvos com sucesso!");
        } else {
          await api.saveAthlete(dataToSave as Athlete);
          toast.success("Atleta salvo com sucesso!");
          
          // Auto WhatsApp invitation trigger for brand new athletes in admin panel
          if (!athlete) {
            const guardianPhoneClean = dataToSave.guardian_phone?.replace(/\D/g, "");
            if (guardianPhoneClean) {
              const parentsGroupLink = localStorage.getItem('pirua_wa_parents_link') || 'https://chat.whatsapp.com/FLX90tKPlw0928aKJ4v1';
              const inviteMsg = `Olá! Tudo bem? Cadastramos o atleta ${dataToSave.name} no Piruá Esporte Clube. Por favor, junte-se ao nosso Grupo de Responsáveis Oficial para ficar por dentro de tudo: ${parentsGroupLink}`;
              
              toast.success("Enviando convite de WhatsApp para o responsável...", {
                description: "Abrindo chat...",
                duration: 5000
              });
              
              setTimeout(() => {
                window.open(`https://wa.me/55${guardianPhoneClean}?text=${encodeURIComponent(inviteMsg)}`, '_blank');
              }, 1200);
            }
          }
        }
        onSave(formData as Athlete);
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
          'textTransform', 'color', 
          'display', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign',
          'borderRadius', 'borderWidth', 'borderColor', 'borderStyle', 'boxSizing',
          'objectFit', 'position', 'top', 'left', 'right', 'bottom', 'opacity',
          'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
          'backgroundRepeat', 'gap', 'columnGap', 'rowGap'
        ];
        
        propsToCopy.forEach(prop => {
          (cln.style as any)[prop] = (style as any)[prop];
        });

        // Only copy width and height for images and SVGs to prevent viewport-dependent scaling bugs on structural elements
        const tagName = orig.tagName.toLowerCase();
        if (tagName === 'img' || tagName === 'svg') {
          cln.style.width = style.width;
          cln.style.height = style.height;
        }
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
          fixHtml2CanvasColors(clonedDoc.body, true);
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
              {userRole === 'professor' ? 'Meus Dados Profissionais' : (isRegistration ? 'Novo Cadastro de Aluno' : (athlete ? 'Editar Atleta' : 'Novo Cadastro de Atleta'))}
            </h2>
            {athlete && <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{athlete.name}{athlete.nickname ? ` (${athlete.nickname})` : ''}</p>}
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
        {/* Photo & Biometrics Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-theme-primary/10 text-theme-primary rounded-2xl border border-theme-primary/20">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Cadastro Biométrico do Aluno</span>
                  <span className="text-[10px] px-2 py-0.5 bg-theme-primary/20 text-theme-primary rounded-md border border-theme-primary/30">
                    Rosto & Dedo Indicador
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Cadastre a foto facial e a impressão digital do dedo indicador para permitir a chamada por biometria.</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5",
                formData.biometrics_face_registered || formData.photo 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              )}>
                <ScanFace size={13} />
                <span>Facial: {formData.biometrics_face_registered || formData.photo ? "Cadastrado ✓" : "Pendente"}</span>
              </span>

              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5",
                formData.biometrics_fingerprint_registered 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              )}>
                <Fingerprint size={13} />
                <span>Digital: {formData.biometrics_fingerprint_registered ? "Dedo Indicador ✓" : "Pendente"}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Facial Photo & Camera Biometrics */}
            <div className="flex flex-col items-center justify-between p-5 bg-black/60 border border-zinc-800 rounded-2xl space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <ScanFace size={16} className="text-theme-primary" />
                  1. Foto & Biometria Facial
                </h4>
                <p className="text-[11px] text-zinc-400">Capture com a câmera ao vivo ou envie o arquivo da foto do aluno.</p>
              </div>

              <div className="relative group">
                {formData.photo ? (
                  <div className="relative">
                    <img src={formData.photo} className="w-[130px] h-[170px] object-cover rounded-2xl border-2 border-emerald-400 shadow-xl shadow-emerald-500/10" referrerPolicy="no-referrer" />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black p-1.5 rounded-full shadow-lg border-2 border-black" title="Biometria Ativa">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="w-[130px] h-[170px] bg-zinc-800/80 rounded-2xl flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700 group-hover:border-theme-primary transition-colors">
                    <UserCircle size={52} />
                    <span className="text-[10px] mt-2 font-black uppercase tracking-wider">Foto 3x4 / Rosto</span>
                  </div>
                )}

                <label className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  <Upload className="text-white" size={24} />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    handleFileUpload(e);
                    setFormData(prev => ({
                      ...prev,
                      biometrics_face_registered: true,
                      biometrics_face_date: new Date().toLocaleDateString('pt-BR')
                    }));
                  }} />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={startFaceCamera}
                  className="flex-1 px-4 py-2.5 bg-theme-primary text-black hover:bg-theme-primary/90 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/10 cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Câmera Biométrica</span>
                </button>

                <label className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-zinc-700 flex items-center gap-1.5">
                  <Upload size={14} />
                  <span>Arquivo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    handleFileUpload(e);
                    setFormData(prev => ({
                      ...prev,
                      biometrics_face_registered: true,
                      biometrics_face_date: new Date().toLocaleDateString('pt-BR')
                    }));
                  }} />
                </label>
              </div>
            </div>

            {/* 2. Fingerprint Biometrics (Dedo Indicador) */}
            <div className="flex flex-col items-center justify-between p-5 bg-black/60 border border-zinc-800 rounded-2xl space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Fingerprint size={16} className="text-emerald-400" />
                  2. Biometria Digital (Dedo Indicador)
                </h4>
                <p className="text-[11px] text-zinc-400">Cadastre a digital do dedo indicador (mão direita ou esquerda).</p>
              </div>

              <div className="flex flex-col items-center justify-center w-full py-3 space-y-3">
                <div className={cn(
                  "w-24 h-24 rounded-3xl flex items-center justify-center border-2 transition-all relative",
                  formData.biometrics_fingerprint_registered
                    ? "bg-emerald-950/60 border-emerald-400 text-emerald-400 shadow-xl shadow-emerald-500/20"
                    : "bg-zinc-800/80 border-dashed border-zinc-700 text-zinc-500"
                )}>
                  <Fingerprint size={56} className={cn(formData.biometrics_fingerprint_registered && "animate-pulse")} />
                  {formData.biometrics_fingerprint_registered && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-1 rounded-full shadow-lg border-2 border-black">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                </div>

                {formData.biometrics_fingerprint_registered ? (
                  <div className="text-center space-y-1">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 size={13} />
                      Indicador {formData.fingerprint_hand || 'Direito'} Cadastrado
                    </span>
                    <p className="text-[10px] text-zinc-500 font-medium">Registrado em {formData.biometrics_fingerprint_date || 'Hoje'}</p>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-amber-400/90 uppercase tracking-wider text-center bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Aguardando Cadastro do Dedo Indicador
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFingerprintStep(0);
                  setIsFingerprintModalOpen(true);
                }}
                className={cn(
                  "w-full px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg",
                  formData.biometrics_fingerprint_registered
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                    : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                )}
              >
                <Fingerprint size={16} />
                <span>{formData.biometrics_fingerprint_registered ? "Recadastrar Dedo Indicador" : "Cadastrar Dedo Indicador"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Câmera Facial Ao Vivo */}
        {isFaceCameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-zinc-950 border-2 border-theme-primary/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-theme-primary/20 text-theme-primary rounded-xl">
                    <ScanFace size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Captura de Biometria Facial</h3>
                    <p className="text-xs text-zinc-400">Posicione o rosto do aluno no centro da moldura</p>
                  </div>
                </div>
                <button type="button" onClick={stopFaceCamera} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-black border-2 border-zinc-800 aspect-4/3 flex items-center justify-center">
                <video ref={faceVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                
                {/* Oval guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-64 border-4 border-dashed border-theme-primary/80 rounded-[50%] shadow-[0_0_50px_rgba(250,204,21,0.3)] animate-pulse flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase text-theme-primary bg-black/70 px-2 py-1 rounded-full">Alinhar Rosto</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={stopFaceCamera}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={captureFaceBiometrics}
                  className="flex-1 px-4 py-3 bg-theme-primary text-black hover:bg-theme-primary/90 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  <span>Capturar e Salvar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Cadastro de Biometria Digital - Dedo Indicador */}
        {isFingerprintModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-zinc-950 border-2 border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative text-center">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Fingerprint size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Cadastro Biométrico Digital</h3>
                    <p className="text-xs text-zinc-400">Leitor do Dedo Indicador</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsFingerprintModalOpen(false)} 
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Hand Selection Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Selecione a Mão do Dedo Indicador:</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setFingerprintHand('Direito')}
                    className={cn(
                      "py-2 px-3 text-xs font-black uppercase rounded-lg transition-all",
                      fingerprintHand === 'Direito' ? "bg-emerald-500 text-black shadow-md" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Mão Direita (Indicador)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFingerprintHand('Esquerdo')}
                    className={cn(
                      "py-2 px-3 text-xs font-black uppercase rounded-lg transition-all",
                      fingerprintHand === 'Esquerdo' ? "bg-emerald-500 text-black shadow-md" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Mão Esquerda (Indicador)
                  </button>
                </div>
              </div>

              {/* Fingerprint Touch Area / Sensor UI */}
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <button
                  type="button"
                  onClick={handleSimulateFingerprintScan}
                  disabled={isScanningFinger || fingerprintStep >= 3}
                  className={cn(
                    "w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 transition-all relative cursor-pointer shadow-2xl",
                    fingerprintStep === 3
                      ? "bg-emerald-950 border-emerald-400 text-emerald-400"
                      : (isScanningFinger 
                          ? "bg-emerald-900/50 border-emerald-400 text-emerald-300 animate-pulse" 
                          : "bg-zinc-900 hover:bg-zinc-850 border-emerald-500/50 text-emerald-400 hover:border-emerald-400 hover:scale-105 active:scale-95")
                  )}
                >
                  <Fingerprint size={72} className={cn(isScanningFinger && "animate-ping")} />
                  {fingerprintStep === 3 && (
                    <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xs rounded-full flex items-center justify-center text-emerald-300 font-black text-xs uppercase">
                      Leitura 100%
                    </div>
                  )}
                </button>

                {/* Progress Indicators (3 touches required) */}
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3].map(stepNum => (
                      <div 
                        key={stepNum}
                        className={cn(
                          "w-8 h-8 rounded-full font-black text-xs flex items-center justify-center border-2 transition-all",
                          fingerprintStep >= stepNum 
                            ? "bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/30" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-600"
                        )}
                      >
                        {fingerprintStep >= stepNum ? <Check size={16} /> : stepNum}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    {fingerprintStep === 0 && "Toque o dedo indicador no leitor acentuado acima"}
                    {fingerprintStep === 1 && "Primeiro toque gravado! Toque novamente no leitor"}
                    {fingerprintStep === 2 && "Apenas mais 1 toque para finalizar a calibração!"}
                    {fingerprintStep === 3 && "✅ Biometria Digital cadastrada com sucesso!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFingerprintModalOpen(false)}
                  className="w-full px-4 py-3 bg-emerald-500 text-black hover:bg-emerald-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {fingerprintStep === 3 ? "Concluir Cadastro Biométrico" : "Fechar"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                        onBlur={e => setFormData({...formData, contact: formatPhone(e.target.value)})}
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
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                      Posições / Funções (Selecione uma ou mais)
                      {formData.modality && <span className="text-[10px] text-zinc-500 font-normal normal-case block mt-0.5">(Filtradas com base nas modalidades selecionadas)</span>}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {getAvailablePositions().map(p => {
                        const isSelected = formData.position?.split(', ').includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              const current = formData.position ? formData.position.split(', ') : [];
                              let next;
                              if (current.includes(p)) {
                                next = current.filter(item => item !== p);
                              } else {
                                next = [...current, p];
                              }
                              setFormData({...formData, position: next.join(', ')});
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all text-center",
                              isSelected 
                                ? "bg-theme-primary border-theme-primary text-black" 
                                : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                            )}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">E-mail (Login/Notificações)</label>
                    <input 
                      required
                      type="email" 
                      placeholder="atleta@email.com"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
                    />
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
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Escola onde Estuda</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                        value={formData.school || ''}
                        onChange={e => setFormData({...formData, school: e.target.value.toUpperCase()})}
                        placeholder="NOME DA ESCOLA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Turno Escolar</label>
                      <select 
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                        value={formData.school_shift || ''}
                        onChange={e => setFormData({...formData, school_shift: e.target.value as any})}
                      >
                        <option value="">SELECIONE O TURNO</option>
                        <option value="Manhã">MANHÃ</option>
                        <option value="Tarde">TARDE</option>
                        <option value="Noite">NOITE</option>
                      </select>
                    </div>
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
                      onBlur={e => setFormData({...formData, guardian_phone: formatPhone(e.target.value)})}
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

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status</label>
                <select 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.status || 'Ativo'}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  disabled={formData.confirmation === 'Pendente' || formData.confirmation === 'Recusado'}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Suspenso">Suspenso</option>
                </select>
                {(formData.confirmation === 'Pendente' || formData.confirmation === 'Recusado') && (
                  <p className="text-[10px] text-amber-500 mt-1 uppercase font-bold">
                    Status bloqueado em Inativo devido ao status de cadastro ({formData.confirmation})
                  </p>
                )}
              </div>
              
              {userRole === 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status de Cadastro</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.confirmation || 'Confirmado'}
                    onChange={e => setFormData({...formData, confirmation: e.target.value as any})}
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Recusado">Recusado</option>
                  </select>
                </div>
              )}

              {formData.status === 'Suspenso' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Motivo da Suspensão</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={formData.suspension_reason || ''}
                    onChange={e => setFormData({...formData, suspension_reason: e.target.value.toUpperCase()})}
                    placeholder="DESCREVA O MOTIVO"
                  />
                </div>
              )}
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
            <div className="grid grid-cols-4 gap-4">
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
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Posição</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.position || '____________________'}</p>
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
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Escola</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.school || '___________________________'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">Turno</p>
                <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.school_shift || '___________________________'}</p>
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
