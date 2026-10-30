import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Event, Settings } from '../types';
import { 
  FileDown, 
  Printer, 
  MessageCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Clock, 
  Bus, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Share2 
} from 'lucide-react';
import { toast } from 'sonner';
import { createTravelAuthorizationPdf, formatTravelDate } from '../utils/travelAuthorizationPdf';

interface PublicTravelAuthorizationProps {
  eventId: string;
  athleteId: string;
  onBack?: () => void;
}

export default function PublicTravelAuthorization({
  eventId,
  athleteId,
  onBack
}: PublicTravelAuthorizationProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId, athleteId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eventsData, athletesData, settingsData] = await Promise.all([
        api.getEvents(),
        api.getAthletes(),
        api.getSettings().catch(() => null)
      ]);

      const foundEvent = eventsData.find(e => e.id === eventId);
      const foundAthlete = athletesData.find(a => 
        a.id === athleteId || 
        a.id.toUpperCase().startsWith(athleteId.toUpperCase()) || 
        (a.doc && a.doc.replace(/\D/g, '') === athleteId.replace(/\D/g, ''))
      );

      if (foundEvent) setEvent(foundEvent);
      if (foundAthlete) setAthlete(foundAthlete);
      if (settingsData) {
        setSettings(settingsData);
        if (settingsData.schoolCrest) {
          convertImageToDataUrl(settingsData.schoolCrest, setCrestDataUrl);
        }
      }
    } catch (err) {
      console.error('Error loading authorization data:', err);
      toast.error('Erro ao carregar dados da autorização.');
    } finally {
      setIsLoading(false);
    }
  };

  const convertImageToDataUrl = (url: string, callback: (dataUrl: string | null) => void) => {
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
          callback(canvas.toDataURL('image/png'));
        } else {
          callback(url);
        }
      } catch (e) {
        callback(url);
      }
    };
    img.onerror = () => callback(url);
    img.src = url + (url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`);
  };

  const handleDownloadPdf = () => {
    if (!event || !athlete) return;
    setIsGeneratingPdf(true);
    const loadingToast = toast.loading('Gerando PDF oficial de viagem...');
    try {
      const schoolName = settings?.schoolName || 'Piruá Esporte Clube';
      const pdf = createTravelAuthorizationPdf(event, athlete, crestDataUrl, schoolName);
      const safeName = (athlete.name || 'Atleta').replace(/\s+/g, '_');
      pdf.save(`Autorizacao_Viagem_${safeName}.pdf`);
      toast.success('PDF oficial baixado com sucesso!', { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao gerar PDF: ${err.message}`, { id: loadingToast });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Autorização de Viagem - ${athlete?.name || 'Atleta'}`,
          text: `Acesse e assine a Autorização de Viagem oficial para ${event?.name || 'o evento'}:`,
          url: window.location.href
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Carregando autorização de viagem oficial...</p>
      </div>
    );
  }

  if (!event || !athlete) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Documento Não Encontrado</h2>
          <p className="text-slate-400 text-sm mb-6">
            Não foi possível localizar as informações do evento ou do atleta indicado. Verifique o link e tente novamente.
          </p>
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Ir para Página Inicial
            </a>
          )}
        </div>
      </div>
    );
  }

  const schoolName = settings?.schoolName || 'PIRUÁ ESPORTE CLUBE';
  const eventAddress = [
    event.street ? `${event.street}` : '',
    event.number ? `nº ${event.number}` : '',
    event.neighborhood ? `${event.neighborhood}` : '',
    event.city ? `${event.city}-${event.uf || 'MG'}` : ''
  ].filter(Boolean).join(', ') || 'Local a ser confirmado';

  const athleteAddress = [
    athlete.street ? `${athlete.street}` : '',
    athlete.number ? `nº ${athlete.number}` : '',
    athlete.neighborhood ? `${athlete.neighborhood}` : '',
    athlete.city ? `${athlete.city}-${athlete.uf || 'MG'}` : ''
  ].filter(Boolean).join(', ') || 'Endereço residencial cadastrado';

  const today = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dateFormattedToday = `Campos Altos - MG, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col print:bg-white print:text-black">
      {/* Top sticky action banner (hidden in print) */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <a
                href="/"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Página Inicial"
              >
                <ArrowLeft className="w-5 h-5" />
              </a>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> Oficial
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">1 Toque & Sem Instalação</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                Autorização de Viagem: {athlete.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {event.whatsapp_group_id && (
              <a
                href={event.whatsapp_group_id}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950/40 transition-all"
                title="Entrar no Grupo Oficial do Evento"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span className="hidden md:inline">Grupo WhatsApp</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-700"
              title="Imprimir documento"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-theme-primary hover:opacity-90 text-white rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-theme-primary/20 transition-all disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>Baixar PDF Oficial</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700"
              title="Compartilhar Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        {/* Info card on mobile/screen (hidden in print) */}
        <div className="mb-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Documento Oficial Pronto</h2>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Este documento já está preenchido com os dados do atleta <strong>{athlete.name}</strong> e do evento <strong>{event.name}</strong>.
                Você pode <strong>Baixar o PDF Oficial</strong>, <strong>Imprimir</strong> para assinar, ou <strong>Entrar no Grupo do WhatsApp</strong> com 1 clique!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/50"
            >
              <FileDown className="w-4 h-4" />
              Baixar PDF Agora
            </button>
          </div>
        </div>

        {/* Paper Document Representation */}
        <div className="bg-white text-black rounded-xl shadow-2xl p-8 sm:p-14 border border-slate-200 print:shadow-none print:border-none print:p-0 print:rounded-none">
          {/* Header */}
          <div className="text-center mb-6">
            {crestDataUrl ? (
              <img
                src={crestDataUrl}
                alt="Brasão"
                className="w-16 h-16 mx-auto mb-2 object-contain"
              />
            ) : settings?.schoolCrest ? (
              <img
                src={settings.schoolCrest}
                alt="Brasão"
                className="w-16 h-16 mx-auto mb-2 object-contain"
              />
            ) : null}
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
              {schoolName}
            </h2>
            <p className="text-xs font-semibold text-slate-600 tracking-widest uppercase mt-0.5">
              DEPARTAMENTO DE FUTEBOL E BASE
            </p>
            <div className="w-full h-0.5 bg-black mt-3 mb-4"></div>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-900 underline decoration-1 underline-offset-4">
              AUTORIZAÇÃO DE VIAGEM E PARTICIPAÇÃO EM EVENTO
            </h3>
          </div>

          {/* Legal Body Paragraphs */}
          <div className="space-y-5 text-sm sm:text-base leading-relaxed text-justify text-slate-900">
            <p>
              Eu, <strong>{athlete.guardian_name || '________________________________________'}</strong>, portador(a) do RG/CPF nº <strong>{athlete.guardian_doc || '________________________'}</strong>, na qualidade de responsável legal pelo atleta menor <strong>{athlete.name}</strong>, nascido em <strong>{formatTravelDate(athlete.birth_date)}</strong>, inscrito sob o RG/CPF nº <strong>{athlete.doc || '________________________'}</strong>, residente e domiciliado em <strong>{athleteAddress}</strong>, venho por meio desta AUTORIZAR sua participação no evento denominado <strong>{event.name.toUpperCase()}</strong>.
            </p>

            <p>
              O referido evento realizar-se-á na cidade de <strong>{event.city ? `${event.city}-${event.uf || 'MG'}` : '__________________'}</strong>, no endereço <strong>{eventAddress}</strong>, com início previsto para o dia <strong>{formatTravelDate(event.start_date)}{event.start_time ? ` às ${event.start_time}h` : ''}</strong> e término em <strong>{formatTravelDate(event.end_date)}{event.end_time ? ` às ${event.end_time}h` : ''}</strong>.
            </p>

            <p>
              Autorizo ainda que o atleta seja transportado em veículo gentilmente cedido pela Prefeitura Municipal de Campos Altos, através da Secretaria de Esporte e Lazer juntamente com a Secretaria de Administração do Município, ou por outros meios de transporte designados pela coordenação ou diretoria do {schoolName}.
              {(event.departure_location || event.departure_time || event.arrival_location) && (
                <span>
                  {' '}Ficam definidos para o deslocamento os seguintes detalhes: Viagem com partida de <strong>{event.departure_location || '_______________'}</strong>{event.departure_time ? ` prevista para às ${event.departure_time}h` : ''}, tendo como destino <strong>{event.arrival_location || `${event.city || '_______'}-${event.uf || '___'}`}</strong>.
                </span>
              )}
            </p>

            <p className="italic text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border-l-4 border-slate-400 print:bg-transparent print:border-l-2">
              &quot;Isento os organizadores do Evento de qualquer responsabilidade por danos eventualmente causados ao menor acima citado no decorrer da competição. Ressaltamos que prestaremos toda atenção necessária durante a viagem, como também durante os jogos. No caso de lesões ou até mesmo fraturas, enfatizamos que prestaremos todo apoio necessário ao atleta de acordo com as nossas condições.&quot;
            </p>

            {/* City & Date */}
            <div className="pt-4">
              <p className="text-sm font-medium text-slate-800">
                {dateFormattedToday}
              </p>
            </div>

            {/* Signature Area */}
            <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 gap-10 text-center">
              <div>
                <div className="border-t border-black w-4/5 mx-auto mb-1.5"></div>
                <p className="text-xs sm:text-sm font-bold uppercase text-slate-900">
                  {athlete.guardian_name || 'Assinatura do Responsável Legal'}
                </p>
                <p className="text-[11px] text-slate-600">Responsável Legal</p>
              </div>

              <div>
                <div className="border-t border-black w-4/5 mx-auto mb-1.5"></div>
                <p className="text-xs sm:text-sm font-bold uppercase text-slate-900">
                  {schoolName}
                </p>
                <p className="text-[11px] text-slate-600">Assinatura e Carimbo da Diretoria</p>
              </div>
            </div>

            {/* Footer notice */}
            <div className="pt-12 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between border-t border-slate-200 mt-8">
              <span>Documento gerado eletronicamente em: {today.toLocaleDateString('pt-BR')} {today.toLocaleTimeString('pt-BR')}</span>
              <span>Sistema de Gestão Piruá E.C. - Todos os direitos reservados.</span>
            </div>
          </div>
        </div>

        {/* Quick event highlights / Group invitation banner */}
        {event.whatsapp_group_id && (
          <div className="mt-6 bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <MessageCircle className="w-6 h-6 fill-emerald-400 text-transparent" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Grupo Oficial do Evento no WhatsApp</h4>
                <p className="text-xs text-slate-400">
                  Acompanhe saídas, fotos, horários de partidas e avisos em tempo real da equipe.
                </p>
              </div>
            </div>
            <a
              href={event.whatsapp_group_id}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              Entrar no Grupo Agora
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
