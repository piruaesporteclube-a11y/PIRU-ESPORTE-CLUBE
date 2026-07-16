import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fixHtml2CanvasColors } from '../utils';
import { api } from '../api';
import { Athlete, Anamnesis, PlayerProfile, getSubCategory, categories } from '../types';
import { 
  Save, 
  FileText, 
  X, 
  Dribbble, 
  Activity, 
  Heart, 
  ShieldAlert, 
  Award, 
  User, 
  Calendar, 
  TrendingUp, 
  Gauge, 
  Target, 
  Award as MedalIcon,
  ChevronRight,
  ClipboardList,
  Flame,
  Scale
} from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import AthleteSearchSelect from './AthleteSearchSelect';
import { differenceInYears, parseISO } from 'date-fns';

type RatingField = {
  key: keyof PlayerProfile;
  label: string;
  description: string;
};

const technicalFields: RatingField[] = [
  { key: 'rating_passing', label: 'Passe', description: 'Precisão, visão de jogo e passes curtos/longos' },
  { key: 'rating_finishing', label: 'Finalização', description: 'Precisão, posicionamento e potência de chute' },
  { key: 'rating_trapping', label: 'Domínio de Bola', description: 'Amortecimento e recepção da bola sob pressão' },
  { key: 'rating_dribbling', label: 'Drible', description: 'Habilidade de finta no 1 contra 1 e agilidade' },
  { key: 'rating_crossing', label: 'Cruzamento', description: 'Bolas alçadas na área a partir das laterais' },
  { key: 'rating_heading', label: 'Cabeceio', description: 'Tempo de bola, impulsão e precisão cabeceando' },
  { key: 'rating_marking', label: 'Marcação', description: 'Abordagem defensiva, cobertura e encurtamento' },
  { key: 'rating_tackling', label: 'Desarme', description: 'Divididas no tempo certo e interceptações' },
  { key: 'rating_vision', label: 'Visão de Jogo', description: 'Leitura espacial e antecipação de linhas de passe' },
  { key: 'rating_positioning', label: 'Posicionamento', description: 'Leitura de espaço ofensivo/defensivo sem a bola' },
  { key: 'rating_ball_control', label: 'Controle de Bola', description: 'Condução, proteção e manutenção da posse' },
];

const physicalFields: RatingField[] = [
  { key: 'rating_speed', label: 'Velocidade', description: 'Velocidade linear máxima do atleta' },
  { key: 'rating_acceleration', label: 'Aceleração', description: 'Arranque explosivo e aceleração rápida' },
  { key: 'rating_stamina', label: 'Resistência', description: 'Condicionamento físico e energia em campo' },
  { key: 'rating_strength', label: 'Força', description: 'Combates físicos, divididas e impulsão corporal' },
  { key: 'rating_agility', label: 'Agilidade', description: 'Mudanças bruscas de direção e reflexos rápidos' },
  { key: 'rating_jumping', label: 'Impulsão', description: 'Salto vertical estacionário ou em movimento' },
  { key: 'rating_coordination', label: 'Coordenação Motora', description: 'Sincronia física e controle corporal amplo' },
];

const tacticalFields: RatingField[] = [
  { key: 'rating_tactical_intelligence', label: 'Inteligência Tática', description: 'Entendimento de esquemas de jogo complexos' },
  { key: 'rating_game_reading', label: 'Leitura de Jogo', description: 'Capacidade de antecipar as ações do adversário' },
  { key: 'rating_space_occupation', label: 'Ocupação de Espaço', description: 'Preenchimento inteligente de lacunas e setores' },
  { key: 'rating_decision_making', label: 'Tomada de Decisão', description: 'Escolha rápida e precisa do melhor lance' },
  { key: 'rating_offensive_participation', label: 'Participação Ofensiva', description: 'Apoio, ultrapassagens e infiltrações no ataque' },
  { key: 'rating_defensive_participation', label: 'Participação Defensiva', description: 'Auxílio na recomposição e marcação baixa' },
];

const behavioralFields: RatingField[] = [
  { key: 'rating_discipline', label: 'Disciplina', description: 'Respeito ao treinador, arbitragem e normas' },
  { key: 'rating_leadership', label: 'Liderança', description: 'Orientação construtiva e inspiração aos colegas' },
  { key: 'rating_teamwork', label: 'Trabalho em Equipe', description: 'Colaboração coletiva e cooperação em campo' },
  { key: 'rating_commitment', label: 'Comprometimento', description: 'Foco, raça e dedicação nos treinos e partidas' },
  { key: 'rating_communication', label: 'Comunicação', description: 'Falar de forma objetiva para apoiar o time' },
  { key: 'rating_sportsmanship', label: 'Espírito Esportivo', description: 'Fair play e maturidade diante de adversidades' },
];

const calculateIMC = (w?: string, h?: string) => {
  if (!w || !h) return '';
  const weightNum = parseFloat(w.replace(',', '.').replace(/[^0-9.]/g, ''));
  let heightNum = parseFloat(h.replace(',', '.').replace(/[^0-9.]/g, ''));
  if (!weightNum || !heightNum) return '';
  if (heightNum > 3) {
    heightNum = heightNum / 100; // converter cm para metros
  }
  const imcVal = weightNum / (heightNum * heightNum);
  return isNaN(imcVal) ? '' : imcVal.toFixed(1);
};

const getRatingLabel = (score: number | undefined) => {
  if (score === undefined || score === null) {
    return { text: 'Não avaliado', color: 'text-zinc-500 bg-zinc-800/50 border-zinc-800/50', barColor: 'bg-zinc-800' };
  }
  if (score <= 2) {
    return { text: 'Ruim', color: 'text-red-500 bg-red-500/10 border-red-500/20', barColor: 'bg-red-500' };
  }
  if (score <= 4) {
    return { text: 'Regular', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', barColor: 'bg-orange-500' };
  }
  if (score <= 6) {
    return { text: 'Bom', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', barColor: 'bg-yellow-500' };
  }
  if (score <= 8) {
    return { text: 'Muito Bom', color: 'text-green-500 bg-green-500/10 border-green-500/20', barColor: 'bg-green-500' };
  }
  return { text: 'Excelente', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', barColor: 'bg-emerald-400' };
};

interface PlayerProfileFormProps {
  athlete?: Athlete;
  onSave?: () => void;
  standalone?: boolean;
  userRole?: 'admin' | 'professor' | 'student';
  athletes?: Athlete[];
}

export default function PlayerProfileForm({ 
  athlete: propAthlete, 
  onSave, 
  standalone = false, 
  userRole = 'admin',
  athletes = [] 
}: PlayerProfileFormProps) {
  const { settings } = useTheme();
  const isStudent = userRole === 'student';
  
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(propAthlete || null);
  const [profile, setProfile] = useState<Partial<PlayerProfile>>({});
  const [anamnesis, setAnamnesis] = useState<Partial<Anamnesis>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeRatingTab, setActiveRatingTab] = useState<'technical' | 'physical' | 'tactical' | 'behavioral'>('technical');
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const convertToDataUrl = (url: string, callback: (dataUrl: string | null) => void) => {
      if (!url || url === 'no-image') {
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

    convertToDataUrl(selectedAthlete?.photo || '', setPhotoDataUrl);
  }, [selectedAthlete?.photo]);

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

  // Auto-calculate IMC when height or weight changes in edit mode
  useEffect(() => {
    if (isEditing) {
      const calculated = calculateIMC(profile.weight, profile.height);
      if (calculated && profile.imc !== calculated) {
        setProfile(prev => ({ ...prev, imc: calculated }));
      }
    }
  }, [profile.weight, profile.height, isEditing]);

  // Sync selected athlete from props
  useEffect(() => {
    if (propAthlete) {
      setSelectedAthlete(propAthlete);
    }
  }, [propAthlete]);

  // Load Player Profile and Anamnesis data when selected athlete changes
  useEffect(() => {
    if (!selectedAthlete) {
      setProfile({});
      setAnamnesis({});
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileData, anamnesisData] = await Promise.all([
          api.getPlayerProfile(selectedAthlete.id),
          api.getAnamnesis(selectedAthlete.id)
        ]);
        
        setProfile(profileData || { athlete_id: selectedAthlete.id });
        setAnamnesis(anamnesisData || { athlete_id: selectedAthlete.id });
      } catch (error) {
        console.error("Erro ao carregar dados da ficha técnica:", error);
        toast.error("Erro ao carregar informações da ficha técnica.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    setIsEditing(false);
  }, [selectedAthlete]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) return;

    setIsSaving(true);
    try {
      await api.savePlayerProfile({
        ...profile,
        athlete_id: selectedAthlete.id
      });
      toast.success("Ficha Técnica atualizada com sucesso!");
      setIsEditing(false);
      if (onSave) onSave();
    } catch (error) {
      console.error("Erro ao salvar ficha técnica:", error);
      toast.error("Erro ao salvar ficha técnica.");
    } finally {
      setIsSaving(false);
    }
  };

  const getAge = (birthDateString?: string) => {
    if (!birthDateString) return '';
    try {
      return differenceInYears(new Date(), parseISO(birthDateString));
    } catch (e) {
      return '';
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !selectedAthlete) return;
    
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading('Gerando PDF da ficha técnica...');
    
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
      container.style.height = 'auto';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      // Temporarily make the original visible in the DOM to get correct computed styles
      const original = printRef.current;
      const hasHidden = original.classList.contains('hidden');
      const hasPrintOnly = original.classList.contains('print-only');

      if (hasHidden) original.classList.remove('hidden');
      if (hasPrintOnly) original.classList.remove('print-only');

      const originalDisplay = original.style.display;
      const originalPosition = original.style.position;
      const originalLeft = original.style.left;
      const originalVisibility = original.style.visibility;
      const originalOpacity = original.style.opacity;

      original.style.display = 'block';
      original.style.position = 'fixed';
      original.style.left = '-9999px';
      original.style.visibility = 'visible';
      original.style.opacity = '1';

      const clone = original.cloneNode(true) as HTMLElement;
      
      // Reset styles for capture to ensure proportionality
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.padding = '24px';
      clone.style.width = '800px';
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      clone.style.display = 'block';
      clone.style.boxSizing = 'border-box';
      clone.classList.remove('hidden'); // Ensure it's visible for capture
      clone.classList.remove('print-only');

      // Force explicit font sizes and dimensions in the clone
      const originalElements = original.querySelectorAll('*');
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

        const tagName = orig.tagName.toLowerCase();
        if (tagName === 'img' || tagName === 'svg') {
          cln.style.width = style.width;
          cln.style.height = style.height;
        }
      }

      // Restore original element visibility state immediately
      if (hasHidden) original.classList.add('hidden');
      if (hasPrintOnly) original.classList.add('print-only');
      original.style.display = originalDisplay;
      original.style.position = originalPosition;
      original.style.left = originalLeft;
      original.style.visibility = originalVisibility;
      original.style.opacity = originalOpacity;

      // Replace images in clone with data URLs if available
      const clonedImages = clone.querySelectorAll('img');
      clonedImages.forEach(img => {
        const src = img.getAttribute('src');
        if (src === settings?.schoolCrest && crestDataUrl) {
          img.setAttribute('src', crestDataUrl);
        } else if ((src === selectedAthlete.photo || img.alt === "Foto do Atleta" || (selectedAthlete.photo && src?.includes(selectedAthlete.photo))) && photoDataUrl) {
          img.setAttribute('src', photoDataUrl);
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

      pdf.save(`ficha_tecnica_${selectedAthlete.name?.replace(/\s+/g, '_')}.pdf`);
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

  const coachName = settings?.coaches ? settings.coaches.split(/,|\n/)[0].trim() : '';
  const assistantName = settings?.assistants ? settings.assistants.split(/,|\n/)[0].trim() : '';
  const presidentName = settings?.president || '';
  const technicalDirectorName = settings?.technicalDirector || '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Selection Header - Only if not standalone and not student */}
      {!standalone && !isStudent && !propAthlete && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Ficha Técnica do Jogador</h2>
              <p className="text-sm text-zinc-500 uppercase tracking-widest">Selecione um atleta para gerenciar seu boletim técnico e físico</p>
            </div>
          </div>
          <AthleteSearchSelect 
            onSelect={(a) => setSelectedAthlete(a)}
            selectedAthleteId={selectedAthlete?.id}
            athletes={athletes}
          />
        </div>
      )}

      {selectedAthlete ? (
        <div className="space-y-8">
          {/* Action buttons (Print and PDF) */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-2xl no-print">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-theme-primary/10 text-theme-primary rounded-xl">
                <FileText size={22} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Ficha Técnica e Desempenho</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{selectedAthlete.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-zinc-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 text-theme-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 022-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Ficha
              </button>
              <button
                type="button"
                disabled={isGeneratingPDF}
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-black hover:bg-theme-primary/95 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Salvar em PDF
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Main Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLUMN 1: ATHLETE CARD (PHOTO & BASIC DEMOGRAPHICS + ANAMNESIS MINI SUMMARY) */}
            <div className="lg:col-span-1 space-y-8">
              {/* Profile Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-4 right-4 bg-theme-primary/10 text-theme-primary border border-theme-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {selectedAthlete.birth_date ? getSubCategory(selectedAthlete.birth_date) : 'N/A'}
                </div>

                <div className="relative w-36 h-36 mt-4 mb-6 rounded-full overflow-hidden border-4 border-theme-primary/20 group">
                  {selectedAthlete.photo && selectedAthlete.photo !== "no-image" ? (
                    <img 
                      src={selectedAthlete.photo} 
                      alt={selectedAthlete.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 text-zinc-500 flex items-center justify-center font-bold text-4xl uppercase">
                      {selectedAthlete.name?.substring(0, 2)}
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight mb-1">
                  {selectedAthlete.name}
                </h3>
                {selectedAthlete.nickname && (
                  <p className="text-sm font-bold text-theme-primary uppercase tracking-widest mb-4">
                    "{selectedAthlete.nickname}"
                  </p>
                )}

                <div className="w-full h-px bg-zinc-800/80 my-4" />

                <div className="w-full space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Nascimento / Idade</span>
                    <span className="text-zinc-200 font-bold">
                      {selectedAthlete.birth_date ? `${selectedAthlete.birth_date.split('-').reverse().join('/')} (${getAge(selectedAthlete.birth_date)} anos)` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Gênero</span>
                    <span className="text-zinc-200 font-bold uppercase">{selectedAthlete.gender || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Documento</span>
                    <span className="text-zinc-200 font-bold">{selectedAthlete.doc || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Nº Camisa</span>
                    <span className="text-zinc-200 font-bold">{selectedAthlete.jersey_number ? `#${selectedAthlete.jersey_number}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Modalidade</span>
                    <span className="text-zinc-200 font-bold uppercase">{selectedAthlete.modality || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Status</span>
                    <span className={cn(
                      "font-black uppercase text-[10px] px-2 py-0.5 rounded-md",
                      selectedAthlete.status === 'Ativo' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {selectedAthlete.status || 'Ativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Anamnesis / Health summary */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                    <Heart size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Ficha de Saúde (Anamnese)</h4>
                    <p className="text-[10px] text-zinc-500 uppercase">Resumo de segurança médica do atleta</p>
                  </div>
                </div>
                
                <div className="w-full h-px bg-zinc-800" />

                {anamnesis.athlete_id ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Restrições Alimentares</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.food_restriction && anamnesis.food_restriction !== 'NÃO' ? anamnesis.food_restriction : 'Nenhuma restrição registrada'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Alergias Registradas</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.allergies && anamnesis.allergies !== 'NÃO' ? anamnesis.allergies : 'Nenhuma alergia registrada'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Problemas Cardíacos / Respiratórios</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {[
                          anamnesis.cardiac_problems && anamnesis.cardiac_problems !== 'NÃO' ? `Cardíaco: ${anamnesis.cardiac_problems}` : null,
                          anamnesis.respiratory_problems && anamnesis.respiratory_problems !== 'NÃO' ? `Respiratório: ${anamnesis.respiratory_problems}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum problema crônico reportado'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Medicações Controladas</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.controlled_medication && anamnesis.controlled_medication !== 'NÃO' ? anamnesis.controlled_medication : 'Nenhum medicamento de uso contínuo'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-950 rounded-xl text-center border border-dashed border-zinc-800">
                    <p className="text-xs text-zinc-500">Nenhum dado de anamnese preenchido para este atleta.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2 & 3: DETAILS & EVALUATIONS */}
            <div className="lg:col-span-2 space-y-8">
              
              <form onSubmit={handleSave} className="space-y-8">
                {/* Section 1: Características e Registro do Jogador */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
                  
                  {/* Edit Toggle for Staff */}
                  {!isStudent && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="absolute top-6 right-6 px-4 py-2 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-black border border-theme-primary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Editar Ficha
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">1. Características e Registro do Jogador</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Dados de identificação, categoria, posições e pé dominante</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      
                      {/* Nacionalidade */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nacionalidade</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: BRASILEIRO"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.nationality || ''}
                            onChange={e => setProfile(prev => ({ ...prev, nationality: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.nationality || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Naturalidade (Cidade/Estado de origem) */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Naturalidade (Origem)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: SÃO PAULO - SP"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.birth_place || ''}
                            onChange={e => setProfile(prev => ({ ...prev, birth_place: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.birth_place || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Categoria */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Categoria</label>
                        {isEditing ? (
                          <select
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.category || ''}
                            onChange={e => setProfile(prev => ({ ...prev, category: e.target.value }))}
                          >
                            <option value="">Selecione a Categoria</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.category || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Posição Principal */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posição Principal</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: CENTROAVANTE"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.primary_position || ''}
                            onChange={e => setProfile(prev => ({ ...prev, primary_position: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
                            {profile.primary_position || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Posição Secundária */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posição Secundária</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: MEIA-ATACANTE"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.secondary_position || ''}
                            onChange={e => setProfile(prev => ({ ...prev, secondary_position: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.secondary_position || <span className="text-zinc-600">Nenhuma</span>}
                          </div>
                        )}
                      </div>

                      {/* Pé Dominante */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pé Dominante</label>
                        {isEditing ? (
                          <select
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.dominant_foot || ''}
                            onChange={e => setProfile(prev => ({ ...prev, dominant_foot: e.target.value as any }))}
                          >
                            <option value="">Selecione...</option>
                            <option value="DIREITO">DIREITO</option>
                            <option value="ESQUERDO">ESQUERDO</option>
                            <option value="AMBIDESTRO">AMBIDESTRO</option>
                          </select>
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.dominant_foot || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Número da Camisa */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Número da Camisa</label>
                        {isEditing ? (
                          <input
                            type="number"
                            placeholder="Ex: 9"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.jersey_number || ''}
                            onChange={e => setProfile(prev => ({ ...prev, jersey_number: e.target.value || undefined }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.jersey_number !== undefined ? `#${profile.jersey_number}` : <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Clube Atual */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clube Atual</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: PIRUÁ ESPORTE CLUBE"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.current_club || ''}
                            onChange={e => setProfile(prev => ({ ...prev, current_club: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.current_club || <span className="text-zinc-600">Sem Vínculo Externo</span>}
                          </div>
                        )}
                      </div>

                      {/* Tempo de Contrato */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo de Contrato / Vínculo</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 2 ANOS (ATÉ JULHO/2028)"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.contract_duration || ''}
                            onChange={e => setProfile(prev => ({ ...prev, contract_duration: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.contract_duration || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 2: Dados Físicos */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">2. Dados Físicos</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Medidas biométricas e Índice de Massa Corporal (IMC)</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      
                      {/* Altura */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Altura</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 1.78 m"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.height || ''}
                            onChange={e => setProfile(prev => ({ ...prev, height: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.height || <span className="text-zinc-600">--</span>}
                          </div>
                        )}
                      </div>

                      {/* Peso */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Peso</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 72 kg"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.weight || ''}
                            onChange={e => setProfile(prev => ({ ...prev, weight: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.weight || <span className="text-zinc-600">--</span>}
                          </div>
                        )}
                      </div>

                      {/* Envergadura */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Envergadura (Opcional)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 1.82 m"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.wingspan || ''}
                            onChange={e => setProfile(prev => ({ ...prev, wingspan: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.wingspan || <span className="text-zinc-600">--</span>}
                          </div>
                        )}
                      </div>

                      {/* IMC */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IMC (Opcional)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 22.7"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.imc || ''}
                            onChange={e => setProfile(prev => ({ ...prev, imc: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase flex items-center gap-2">
                            {profile.imc ? (
                              <>
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  parseFloat(profile.imc) >= 18.5 && parseFloat(profile.imc) < 25 ? "bg-green-500" : "bg-amber-500"
                                )} />
                                <span>{profile.imc}</span>
                              </>
                            ) : (
                              <span className="text-zinc-600">--</span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 3: Avaliações de Desempenho */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                        <Award size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider">3. Ficha de Avaliação de Desempenho</h3>
                        <p className="text-[10px] text-zinc-500 uppercase">Notas de 0 a 10 para habilidades técnicas, físicas, táticas e comportamentais</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Custom Tab Selector */}
                      <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('technical')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'technical'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <Award size={14} />
                          Técnico
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('physical')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'physical'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <Activity size={14} />
                          Físico
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('tactical')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'tactical'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <Target size={14} />
                          Tático
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRatingTab('behavioral')}
                          className={cn(
                            "flex-1 min-w-[125px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                            activeRatingTab === 'behavioral'
                              ? "bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-theme-primary/20"
                              : "text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <TrendingUp size={14} />
                          Comportamento
                        </button>
                      </div>

                      {/* Ratings Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {(activeRatingTab === 'technical' ? technicalFields :
                          activeRatingTab === 'physical' ? physicalFields :
                          activeRatingTab === 'tactical' ? tacticalFields :
                          behavioralFields).map((field) => {
                            const currentValue = profile[field.key] as number | undefined;
                            const ratingDetails = getRatingLabel(currentValue);

                            return (
                              <div key={field.key} className="space-y-3 bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider">
                                        {field.label}
                                      </label>
                                      <span className="text-[10px] text-zinc-500 block">{field.description}</span>
                                    </div>
                                    <div className={cn("text-xs font-black uppercase px-2.5 py-1 rounded-md border flex items-center gap-1.5", ratingDetails.color)}>
                                      <span className="text-sm font-black">
                                        {currentValue !== undefined && currentValue !== null ? currentValue : '--'}
                                      </span>
                                      <span className="opacity-60">/10</span>
                                    </div>
                                  </div>

                                  {(currentValue !== undefined && currentValue !== null) && (
                                    <div className="space-y-1">
                                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                          className={cn("h-full transition-all duration-500", ratingDetails.barColor)}
                                          style={{ width: `${(currentValue / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                                        Status: <span className="text-zinc-300">{ratingDetails.text}</span>
                                      </span>
                                    </div>
                                  )}

                                  {isEditing && (
                                    <div className="space-y-2 pt-1">
                                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Definir Nota (0 a 10):</span>
                                      <div className="flex flex-wrap gap-1">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                          <button
                                            key={score}
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, [field.key]: score }))}
                                            className={cn(
                                              "w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-all border",
                                              currentValue === score
                                                ? "bg-theme-primary text-black border-theme-primary font-black scale-105 shadow-md shadow-theme-primary/20"
                                                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                                            )}
                                          >
                                            {score}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      <div className="w-full h-px bg-zinc-800/50" />

                      {/* Tomada de Decisão */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Gauge size={14} className="text-theme-primary" />
                          Índice de Tomada de Decisão (Leitura de jogo sob pressão)
                        </h4>
                        {isEditing ? (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                            {["RUIM", "REGULAR", "BOM", "ÓTIMO", "EXCELENTE"].map((opt) => {
                              const isSelected = profile.decision_making === opt;
                              let activeClass = "";
                              
                              if (opt === "RUIM") activeClass = isSelected ? "bg-red-500 text-black border-red-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-red-400";
                              else if (opt === "REGULAR") activeClass = isSelected ? "bg-orange-500 text-black border-orange-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-orange-400";
                              else if (opt === "BOM") activeClass = isSelected ? "bg-yellow-500 text-black border-yellow-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-yellow-400";
                              else if (opt === "ÓTIMO") activeClass = isSelected ? "bg-green-500 text-black border-green-500 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-green-400";
                              else activeClass = isSelected ? "bg-emerald-400 text-black border-emerald-400 scale-[1.03] font-black" : "bg-zinc-850 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-emerald-400";

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setProfile(prev => ({ ...prev, decision_making: opt }))}
                                  className={cn(
                                    "py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 uppercase tracking-wider",
                                    activeClass
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            {profile.decision_making ? (
                              (() => {
                                let badgeClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
                                if (profile.decision_making === "RUIM") badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
                                else if (profile.decision_making === "REGULAR") badgeClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
                                else if (profile.decision_making === "BOM") badgeClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                                else if (profile.decision_making === "ÓTIMO") badgeClass = "bg-green-500/10 text-green-500 border-green-500/20";
                                else if (profile.decision_making === "EXCELENTE") badgeClass = "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";

                                return (
                                  <div className={cn("px-5 py-3.5 rounded-2xl text-xs font-black uppercase border tracking-wider", badgeClass)}>
                                    {profile.decision_making}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="px-5 py-3.5 bg-zinc-950 text-zinc-600 rounded-2xl text-[10px] font-black border border-zinc-900 uppercase tracking-widest">
                                Não informado
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 4: Histórico Clínico e Performance Física */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">4. Histórico Clínico e Performance Física</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Laudos de exames, acompanhamento de lesões e testes de performance</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      
                      {/* Exames de Rotina */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Exames de Rotina (Cardiológico, Pressão e Sangue)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva as últimas avaliações cardiológicas, exames sanguíneos e controle de pressão arterial..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.routine_exams || ''}
                            onChange={e => setProfile(prev => ({ ...prev, routine_exams: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.routine_exams || <span className="text-zinc-600">Nenhum exame cadastrado recentemente.</span>}
                          </div>
                        )}
                      </div>

                      {/* Histórico de Lesões */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Histórico de Lesões e Cirurgias (Com tempos de recuperação)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Ex: Entorse de tornozelo grau 2 em 10/2025 - 4 semanas de molho. Cirurgia de apendicite em 2024..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.injury_history || ''}
                            onChange={e => setProfile(prev => ({ ...prev, injury_history: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.injury_history || <span className="text-zinc-600">Sem histórico de lesões severas registrado.</span>}
                          </div>
                        )}
                      </div>

                      {/* Teste de Performance */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Testes Físicos de Performance (Força, Velocidade e Resistência Aeróbia)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva os resultados de salto, tempo de tiro de 30m, VO2 máx ou testes Yo-Yo..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.performance_tests || ''}
                            onChange={e => setProfile(prev => ({ ...prev, performance_tests: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.performance_tests || <span className="text-zinc-600">Sem testes de performance registrados.</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Edit Controls / Save buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form
                        if (selectedAthlete) {
                          api.getPlayerProfile(selectedAthlete.id).then(data => {
                            setProfile(data || { athlete_id: selectedAthlete.id });
                          });
                        }
                      }}
                      className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary/90 text-black font-black uppercase tracking-wider rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                      <Save size={14} />
                      {isSaving ? "Salvando..." : "Salvar Ficha Técnica"}
                    </button>
                  </div>
                )}
              </form>

            </div>

          </div>

          <div className="hidden print-only bg-white text-black p-4 font-sans select-none border-0 max-w-[800px] mx-auto" ref={printRef} style={{ fontSize: '10.5px', lineHeight: '1.3' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-2 mb-3">
              <div className="flex items-center gap-3">
                {crestDataUrl ? (
                  <img src={crestDataUrl} alt="Brasão" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                ) : settings?.schoolCrest ? (
                  <img src={settings.schoolCrest} alt="Brasão" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 bg-zinc-100 border border-zinc-400 rounded flex items-center justify-center text-black font-extrabold text-lg">P</div>
                )}
                <div className="text-left">
                  <h1 className="text-base font-black uppercase tracking-tight text-black">{settings?.schoolName || 'Piruá Esporte Clube'}</h1>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-650">Ficha Técnica e Avaliação de Desempenho do Atleta</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-between h-12">
                <span className="text-[8px] font-extrabold uppercase text-zinc-500">Documento Oficial</span>
                <div className="text-right">
                  <p className="text-[7px] font-bold uppercase text-zinc-500">Emissão:</p>
                  <p className="text-[9px] font-black text-black">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Photo & Core Information */}
            <div className="grid grid-cols-12 gap-4 mb-3">
              {/* Photo 3x4 strictly bounded */}
              <div className="col-span-3 flex flex-col items-center justify-start gap-1">
                <div 
                  className="border-2 border-zinc-900 rounded bg-zinc-100 flex items-center justify-center overflow-hidden shadow-sm"
                  style={{
                    width: '105px',
                    height: '140px',
                    minWidth: '105px',
                    minHeight: '140px',
                    maxWidth: '105px',
                    maxHeight: '140px',
                    boxSizing: 'border-box'
                  }}
                >
                  {(photoDataUrl || (selectedAthlete.photo && selectedAthlete.photo !== "no-image")) ? (
                    <img 
                      src={photoDataUrl || selectedAthlete.photo} 
                      alt="Foto do Atleta" 
                      className="object-cover animate-none" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 text-zinc-500">
                      <svg className="w-6 h-6 mb-1 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-[8px] font-bold uppercase tracking-widest leading-tight">FOTO 3x4</span>
                    </div>
                  )}
                </div>
                <p className="text-[8px] font-black uppercase text-zinc-600 tracking-wider">Identificação</p>
              </div>

              {/* Metadata Fields */}
              <div className="col-span-9 grid grid-cols-3 gap-y-2 gap-x-3.5">
                <div className="col-span-2">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Nome do Atleta</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{selectedAthlete.name || 'N/A'}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Apelido</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{selectedAthlete.nickname || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Data de Nascimento</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900">
                    {selectedAthlete.birth_date ? `${selectedAthlete.birth_date.split('-').reverse().join('/')} (${getAge(selectedAthlete.birth_date)} anos)` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Gênero</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900">{selectedAthlete.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Categoria</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 uppercase text-zinc-900">
                    {selectedAthlete.birth_date ? getSubCategory(selectedAthlete.birth_date) : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Nº Camisa</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900">#{selectedAthlete.jersey_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Pé Dominante</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 uppercase text-zinc-900">{profile.dominant_foot || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Posição Principal</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{profile.primary_position || 'N/A'}</p>
                </div>

                <div className="col-span-3">
                  <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Posição Secundária</p>
                  <p className="text-xs font-black border-b-2 border-zinc-300 pb-0.5 text-zinc-900 truncate">{profile.secondary_position || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Consolidated Biometrics & Decision Making row */}
            <div className="grid grid-cols-12 gap-4 mb-3">
              <div className="col-span-8">
                <h3 className="text-[9px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 flex items-center">Biometria & Dados Físicos</h3>
                <div className="grid grid-cols-4 gap-2 bg-zinc-50 p-2 rounded border border-zinc-300">
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">Altura</span>
                    <span className="text-xs font-black text-zinc-900">{profile.height ? `${profile.height} m` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">Peso</span>
                    <span className="text-xs font-black text-zinc-900">{profile.weight ? `${profile.weight} kg` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">Envergadura</span>
                    <span className="text-xs font-black text-zinc-900">{profile.wingspan ? `${profile.wingspan} cm` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase block">IMC (Corporal)</span>
                    <span className="text-xs font-black text-zinc-900">{profile.imc || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-4 flex flex-col justify-between">
                <h3 className="text-[9px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 flex items-center">Tomada de Decisão</h3>
                <div className="grid grid-cols-12 items-center bg-zinc-50 border border-zinc-300 rounded p-1.5 h-full">
                  <div className="col-span-8 pr-1.5 leading-tight">
                    <span className="text-[7px] font-bold uppercase text-zinc-500 block">Capacidade Geral</span>
                    <span className="text-[8.5px] font-medium text-zinc-650 leading-none">Visão sob pressão.</span>
                  </div>
                  <div className="col-span-4 text-center">
                    <div className="bg-amber-400 text-black border border-amber-600 rounded px-1.5 py-1 font-black uppercase text-[9px] tracking-wider truncate">
                      {profile.decision_making || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes Evaluations */}
            <div className="mb-3" style={{ boxSizing: 'border-box' }}>
              <h3 className="text-[9px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 flex items-center justify-center">
                Avaliação de Atributos do Atleta (Escala de 1 a 10)
              </h3>
              <div style={{ display: 'flex', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                {/* Técnico */}
                <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                  <h4 className="text-[8.5px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">
                    TÉCNICO
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '12px', rowGap: '4px', width: '100%', boxSizing: 'border-box' }}>
                    {technicalFields.map(f => {
                      const val = profile[f.key] as number | undefined;
                      return (
                        <div key={f.key} style={{ width: '48%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8px', lineHeight: '1.1', minHeight: '14px', boxSizing: 'border-box' }}>
                          <span style={{ fontWeight: '950', color: '#000000', flex: '1', minWidth: '0', textTransform: 'uppercase', marginRight: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{f.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0 }}>
                            <div style={{ width: '32px', height: '6px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                              <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                            </div>
                            <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column containing Fisico, Tatico, Comportamental */}
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
                  {/* Físico */}
                  <div style={{ border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
                    <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">
                      FÍSICO
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '12px', rowGap: '4px', width: '100%', boxSizing: 'border-box' }}>
                      {physicalFields.map(f => {
                        const val = profile[f.key] as number | undefined;
                        return (
                          <div key={f.key} style={{ width: '48%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8px', lineHeight: '1.1', minHeight: '14px', boxSizing: 'border-box' }}>
                            <span style={{ fontWeight: '950', color: '#000000', flex: '1', minWidth: '0', textTransform: 'uppercase', marginRight: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{f.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0 }}>
                              <div style={{ width: '32px', height: '6px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                              </div>
                              <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tático & Comportamental side by side */}
                  <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    {/* Tático */}
                    <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1 border border-zinc-900 text-center">
                        TÁTICO
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                        {tacticalFields.map(f => {
                          const val = profile[f.key] as number | undefined;
                          return (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8px', lineHeight: '1.1', minHeight: '14px', boxSizing: 'border-box' }}>
                              <span style={{ fontWeight: '950', color: '#000000', flex: '1', minWidth: '0', textTransform: 'uppercase', marginRight: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{f.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                <div style={{ width: '28px', height: '5px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                  <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                                </div>
                                <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comportamental */}
                    <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                      <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1 border border-zinc-900 text-center">
                        COMPORTAMENTAL
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                        {behavioralFields.map(f => {
                          const val = profile[f.key] as number | undefined;
                          return (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8px', lineHeight: '1.1', minHeight: '14px', boxSizing: 'border-box' }}>
                              <span style={{ fontWeight: '950', color: '#000000', flex: '1', minWidth: '0', textTransform: 'uppercase', marginRight: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{f.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                <div style={{ width: '28px', height: '5px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden', position: 'relative', border: '1px solid #d4d4d8', flexShrink: 0 }}>
                                  <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${(val || 0) * 10}%` }} />
                                </div>
                                <span style={{ fontWeight: '900', color: '#000000', width: '12px', textAlign: 'right', flexShrink: 0 }}>{val !== undefined ? val : '-'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance and Medical history */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '12px', boxSizing: 'border-box' }}>
              {/* Notes */}
              <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#fafafa', boxSizing: 'border-box' }}>
                <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">
                  Habilidades & Performance
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '8.5px', boxSizing: 'border-box' }}>
                  <div style={{ width: '48%', display: 'flex', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '55px', flexShrink: 0 }}>Passe:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_passing || 'N/A'}</span>
                  </div>
                  <div style={{ width: '48%', display: 'flex', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '55px', flexShrink: 0 }}>Cabeceio:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_heading || 'N/A'}</span>
                  </div>
                  <div style={{ width: '48%', display: 'flex', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '55px', flexShrink: 0 }}>Drible:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_dribbling || 'N/A'}</span>
                  </div>
                  <div style={{ width: '48%', display: 'flex', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '55px', flexShrink: 0 }}>Velocidade:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_speed || 'N/A'}</span>
                  </div>
                  <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', width: '55px', flexShrink: 0 }}>Tática:</span>
                    <span style={{ color: '#111827', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{profile.skills_tactical || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div style={{ width: '50%', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '8px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '6px', boxSizing: 'border-box' }}>
                <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1 border border-zinc-900 text-center">
                  Histórico Clínico & Exames
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px', display: 'block' }}>Exames de Rotina:</span>
                    <p style={{ color: '#111827', lineHeight: '1.25', fontStyle: 'normal', backgroundColor: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e4e4e7', minHeight: '32px', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontSize: '7.5px', marginTop: '2px' }}>{profile.routine_exams || 'Sem observações.'}</p>
                  </div>
                  <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontWeight: '950', color: '#000000', textTransform: 'uppercase', fontSize: '7.5px', display: 'block' }}>Histórico de Lesões:</span>
                    <p style={{ color: '#111827', lineHeight: '1.25', fontStyle: 'normal', backgroundColor: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e4e4e7', minHeight: '32px', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontSize: '7.5px', marginTop: '2px' }}>{profile.injury_history || 'Sem registro.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Anamnesis block (if available) */}
            {anamnesis.athlete_id && (
              <div className="mb-3 border border-zinc-300 rounded p-2 bg-zinc-50" style={{ boxSizing: 'border-box' }}>
                <h4 className="text-[8px] font-black uppercase tracking-wider bg-black text-yellow-400 px-2 py-1 rounded mb-1.5 border border-zinc-900 text-center">FICHA DE SAÚDE (ANAMNESE DO ATLETA)</h4>
                
                <div style={{ display: 'flex', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                  {/* Col 1: Restrições & Alergias */}
                  <div style={{ width: '33.33%', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Restrições Alimentares:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">{anamnesis.food_restriction && anamnesis.food_restriction !== 'NÃO' ? anamnesis.food_restriction : 'Nenhuma'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Alergias Registradas:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">{anamnesis.allergies && anamnesis.allergies !== 'NÃO' ? anamnesis.allergies : 'Nenhuma'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Restrições a Medicamentos:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">{anamnesis.medication_restriction && anamnesis.medication_restriction !== 'NÃO' ? anamnesis.medication_restriction : 'Nenhuma'}</span>
                    </div>
                  </div>

                  {/* Col 2: Condições Crônicas & Tratamento */}
                  <div style={{ width: '33.33%', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Problemas Cardíacos & Respiratórios:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.cardiac_problems && anamnesis.cardiac_problems !== 'NÃO' ? `Cardíaco: ${anamnesis.cardiac_problems}` : null,
                          anamnesis.respiratory_problems && anamnesis.respiratory_problems !== 'NÃO' ? `Respiratório: ${anamnesis.respiratory_problems}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Outros Diagnósticos:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.hypertension && anamnesis.hypertension !== 'NÃO' ? `Hipertensão: ${anamnesis.hypertension}` : null,
                          anamnesis.hypotension && anamnesis.hypotension !== 'NÃO' ? `Hipotensão: ${anamnesis.hypotension}` : null,
                          anamnesis.epilepsy && anamnesis.epilepsy !== 'NÃO' ? `Epilepsia: ${anamnesis.epilepsy}` : null,
                          anamnesis.diabetes && anamnesis.diabetes !== 'NÃO' ? `Diabetes: ${anamnesis.diabetes}` : null
                        ].filter(Boolean).join(' | ') || 'Sem observações'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Tratamento & Medicação Contínua:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.medical_treatment && anamnesis.medical_treatment !== 'NÃO' ? `Tratamento: ${anamnesis.medical_treatment}` : null,
                          anamnesis.controlled_medication && anamnesis.controlled_medication !== 'NÃO' ? `Med. Controlada: ${anamnesis.controlled_medication}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum'}
                      </span>
                    </div>
                  </div>

                  {/* Col 3: Patologias & Hábitos */}
                  <div style={{ width: '33.33%', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Patologias (TDAH, TEA, TOD):</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {(() => {
                          try {
                            const paths = JSON.parse(anamnesis.pathologies || '[]');
                            const pathStr = paths.length > 0 ? paths.join(', ') : 'Nenhuma';
                            if (anamnesis.pathologies_description) {
                              return `${pathStr} (${anamnesis.pathologies_description})`;
                            }
                            return pathStr;
                          } catch (_) {
                            return 'Nenhuma';
                          }
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Sono & Fadiga:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.sleep_time ? `Dorme às: ${anamnesis.sleep_time}` : null,
                          anamnesis.wake_up_difficulty && anamnesis.wake_up_difficulty !== 'NÃO' ? `Dificuldade para acordar: ${anamnesis.wake_up_difficulty}` : null
                        ].filter(Boolean).join(' | ') || 'Sem registros'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-500 block text-[7.5px] uppercase">Fraturas & Exercícios:</span>
                      <span className="font-black text-zinc-950 block break-words whitespace-pre-wrap text-[7.5px]">
                        {[
                          anamnesis.fractures && anamnesis.fractures !== 'NÃO' ? `Fraturas: ${anamnesis.fractures}` : null,
                          anamnesis.other_exercises && anamnesis.other_exercises !== 'NÃO' ? `Exercícios: ${anamnesis.other_exercises}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures Footer */}
            <div className="mt-5 space-y-3">
              <div className="flex justify-between gap-8 pt-2">
                {/* Commission Signatures */}
                <div className="flex-1 text-center flex flex-col justify-end">
                  <div className="border-b border-zinc-900 w-48 mx-auto mb-1"></div>
                  <p className="text-[9px] font-black uppercase text-black">
                    {coachName || 'Comissão Técnica / Professor'}
                  </p>
                  <p className="text-[7.5px] font-bold uppercase text-zinc-500 tracking-wider">
                    Treinador / Professor
                  </p>
                  {assistantName && (
                    <p className="text-[7px] text-zinc-400 uppercase tracking-tighter">Auxiliar: {assistantName}</p>
                  )}
                </div>

                {/* Board Signatures */}
                <div className="flex-1 text-center flex flex-col justify-end">
                  <div className="border-b border-zinc-900 w-48 mx-auto mb-1"></div>
                  <p className="text-[9px] font-black uppercase text-black">
                    {presidentName || technicalDirectorName || 'Diretoria / Coordenação'}
                  </p>
                  <p className="text-[7.5px] font-bold uppercase text-zinc-500 tracking-wider">
                    {presidentName ? 'Presidente - Diretoria' : technicalDirectorName ? 'Diretor Técnico' : 'Coordenação / Diretoria'}
                  </p>
                  {presidentName && technicalDirectorName && (
                    <p className="text-[7px] text-zinc-400 uppercase tracking-tighter">Dir. Técnico: {technicalDirectorName}</p>
                  )}
                </div>
              </div>
              
              <div className="text-center pt-1.5 border-t border-zinc-300 flex justify-between items-center text-[7.5px] text-zinc-400 font-bold uppercase tracking-widest">
                <span>{settings?.schoolName || 'Piruá Esporte Clube'}</span>
                <span>Formando Atletas, Cidadãos e Campeões</span>
                <span>© {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-900 rounded-[2.5rem] border border-zinc-800 text-zinc-500">
          <p className="uppercase text-sm font-bold tracking-widest">Nenhum jogador selecionado para exibir a Ficha Técnica.</p>
        </div>
      )}
    </div>
  );
}
