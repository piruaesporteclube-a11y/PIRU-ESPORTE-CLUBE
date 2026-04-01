import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete, Event, Settings, getSubCategory, categories } from '../types';
import { FileText, Download, Printer, ChevronRight, User, Calendar, FileDown, Search, Filter, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export default function Documents() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const { settings } = useTheme();
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [docType, setDocType] = useState<'travel' | 'responsibility' | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [manualData, setManualData] = useState({
    name: '',
    birth_date: format(new Date(), 'yyyy-MM-dd'),
    doc: '',
    guardian_name: '',
    guardian_doc: '',
    street: '',
    number: '',
    neighborhood: '',
    city: 'Campos Altos',
    uf: 'MG'
  });
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getAthletes().then(setAthletes);
    api.getEvents().then(setEvents);
  }, []);

  const filteredAthletes = athletes.filter(a => {
    const matchesName = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || getSubCategory(a.birth_date) === selectedCategory;
    return matchesName && matchesCategory;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const element = documentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${docType}_${selectedAthlete?.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-bold text-white">Gerar Documentos</h2>
        <p className="text-zinc-400 text-sm">Emita autorizações e termos para impressão</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        {/* Travel Authorization Card */}
        <div className="bg-black border border-theme-primary/20 rounded-3xl p-6 hover:border-theme-primary/50 transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase">Autorização de Viagem</h3>
              <p className="text-xs text-zinc-500">Para participação em eventos externos</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Modo de Seleção</label>
              <button 
                onClick={() => setManualEntry(!manualEntry)}
                className="text-[10px] font-black text-theme-primary uppercase hover:underline"
              >
                {manualEntry ? 'Usar Banco de Dados' : 'Digitar Nome Manualmente'}
              </button>
            </div>

            {!manualEntry ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text"
                      placeholder="Nome do Atleta..."
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm appearance-none"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="">Todas as Categorias</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <select 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  onChange={(e) => setSelectedAthlete(athletes.find(a => a.id === e.target.value) || null)}
                  value={selectedAthlete?.id || ''}
                >
                  <option value="">{filteredAthletes.length > 0 ? 'Selecionar Atleta' : 'Nenhum atleta encontrado'}</option>
                  {filteredAthletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({getSubCategory(a.birth_date)})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="space-y-3">
                <input 
                  type="text"
                  placeholder="Nome Completo do Atleta"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={manualData.name}
                  onChange={(e) => setManualData({...manualData, name: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={manualData.birth_date}
                    onChange={(e) => setManualData({...manualData, birth_date: e.target.value})}
                  />
                  <input 
                    type="text"
                    placeholder="Documento (RG/CPF)"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={manualData.doc}
                    onChange={(e) => setManualData({...manualData, doc: e.target.value})}
                  />
                </div>
                <input 
                  type="text"
                  placeholder="Nome do Responsável"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={manualData.guardian_name}
                  onChange={(e) => setManualData({...manualData, guardian_name: e.target.value})}
                />
                <input 
                  type="text"
                  placeholder="Documento do Responsável"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={manualData.guardian_doc}
                  onChange={(e) => setManualData({...manualData, guardian_doc: e.target.value})}
                />
              </div>
            )}

            <select 
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
              onChange={(e) => setSelectedEvent(events.find(ev => ev.id === e.target.value) || null)}
              value={selectedEvent?.id || ''}
            >
              <option value="">Selecionar Evento</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
            <button 
              disabled={(!manualEntry && !selectedAthlete) || (manualEntry && !manualData.name) || !selectedEvent}
              onClick={() => {
                if (manualEntry) {
                  setSelectedAthlete(manualData as any);
                }
                setDocType('travel');
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-theme-primary disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl transition-all"
            >
              Gerar Autorização
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Responsibility Term Card */}
        <div className="bg-black border border-theme-primary/20 rounded-3xl p-6 hover:border-theme-primary/50 transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase">Termo de Responsabilidade</h3>
              <p className="text-xs text-zinc-500">Para novos atletas e renovações</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Modo de Seleção</label>
              <button 
                onClick={() => setManualEntry(!manualEntry)}
                className="text-[10px] font-black text-theme-primary uppercase hover:underline"
              >
                {manualEntry ? 'Usar Banco de Dados' : 'Digitar Nome Manualmente'}
              </button>
            </div>

            {!manualEntry ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text"
                      placeholder="Nome do Atleta..."
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm appearance-none"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="">Todas as Categorias</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <select 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  onChange={(e) => setSelectedAthlete(athletes.find(a => a.id === e.target.value) || null)}
                  value={selectedAthlete?.id || ''}
                >
                  <option value="">{filteredAthletes.length > 0 ? 'Selecionar Atleta' : 'Nenhum atleta encontrado'}</option>
                  {filteredAthletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({getSubCategory(a.birth_date)})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="space-y-3">
                <input 
                  type="text"
                  placeholder="Nome Completo do Atleta"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={manualData.name}
                  onChange={(e) => setManualData({...manualData, name: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={manualData.birth_date}
                    onChange={(e) => setManualData({...manualData, birth_date: e.target.value})}
                  />
                  <input 
                    type="text"
                    placeholder="Documento (RG/CPF)"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={manualData.doc}
                    onChange={(e) => setManualData({...manualData, doc: e.target.value})}
                  />
                </div>
                <input 
                  type="text"
                  placeholder="Nome do Responsável"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={manualData.guardian_name}
                  onChange={(e) => setManualData({...manualData, guardian_name: e.target.value})}
                />
                <input 
                  type="text"
                  placeholder="Documento do Responsável"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={manualData.guardian_doc}
                  onChange={(e) => setManualData({...manualData, guardian_doc: e.target.value})}
                />
              </div>
            )}

            <button 
              disabled={(!manualEntry && !selectedAthlete) || (manualEntry && !manualData.name)}
              onClick={() => {
                if (manualEntry) {
                  setSelectedAthlete(manualData as any);
                }
                setDocType('responsibility');
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-theme-primary disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl transition-all"
            >
              Gerar Termo
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Document View Modal */}
      {docType && selectedAthlete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-start justify-center p-2 sm:p-4 overflow-y-auto no-print py-4 sm:py-8">
          <div className="bg-white text-black w-full max-w-4xl rounded-3xl shadow-2xl my-auto p-4 sm:p-8 relative">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4 no-print">
              <button 
                onClick={() => setDocType(null)}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-black rounded-xl transition-all group font-bold uppercase text-xs tracking-widest"
              >
                <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                Voltar
              </button>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copiado para compartilhar!');
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:text-black transition-all shadow-lg"
                >
                  <Share2 size={20} />
                  Compartilhar
                </button>

                <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                >
                  <FileDown size={20} />
                  {isGeneratingPDF ? 'Gerando...' : 'Salvar em PDF'}
                </button>

                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white font-black rounded-xl hover:bg-zinc-800 transition-colors shadow-lg"
                >
                  <Printer size={20} />
                  Imprimir Documento
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div ref={documentRef} className="document-content text-justify leading-relaxed p-2 bg-white">
              <div className="text-center mb-6 border-b-2 border-black pb-4">
                {settings?.schoolCrest && (
                  <img src={settings.schoolCrest} className="w-16 h-16 object-contain mx-auto mb-2" referrerPolicy="no-referrer" />
                )}
                <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
                <p className="text-base font-bold uppercase">Departamento de Futebol de Base</p>
                <h2 className="text-lg font-black mt-2 uppercase underline">
                  {docType === 'travel' ? 'Autorização de Viagem e Participação em Evento' : 'Termo de Responsabilidade e Autorização'}
                </h2>
              </div>

              {docType === 'travel' && selectedEvent && (
                <div className="space-y-6">
                  <p>
                    Eu, <strong>{selectedAthlete.guardian_name}</strong>, portador(a) do RG/CPF nº <strong>{selectedAthlete.guardian_doc}</strong>, na qualidade de responsável legal pelo atleta menor <strong>{selectedAthlete.name}</strong>, nascido em <strong>{selectedAthlete.birth_date}</strong>, inscrito sob o RG/CPF nº <strong>{selectedAthlete.doc}</strong>, residente e domiciliado em <strong>{selectedAthlete.street}, {selectedAthlete.number}, {selectedAthlete.neighborhood}, {selectedAthlete.city}-{selectedAthlete.uf}</strong>, venho por meio desta AUTORIZAR sua participação no evento denominado <strong>{selectedEvent.name}</strong>.
                  </p>
                  <p>
                    O referido evento realizar-se-á na cidade de <strong>{selectedEvent.city}-{selectedEvent.uf}</strong>, no endereço <strong>{selectedEvent.street}, {selectedEvent.number}</strong>, com início previsto para o dia <strong>{selectedEvent.start_date}</strong> e término em <strong>{selectedEvent.end_date}</strong>.
                  </p>
                  <p>
                    Autorizo ainda que o atleta seja transportado em veículo gentilmente cedido pela Prefeitura Municipal de Campos Altos, através da Secretaria de Esporte e Lazer juntamente com a Secretaria de Administração do Município, ou por outros meios designados pelo Piruá Esporte Clube.
                  </p>
                  <p className="italic">
                    "Isento os organizadores do Evento de qualquer responsabilidade por danos eventualmente causados ao menor acima citado no decorrer da competição. Ressaltamos que prestaremos toda atenção necessária durante a viagem, como também durante os jogos. No caso de lesões ou até mesmo fraturas, enfatizamos que prestaremos todo apoio necessário ao atleta de acordo com as nossas condições."
                  </p>
                </div>
              )}

              {docType === 'responsibility' && (
                <div className="space-y-2 text-[10px]">
                  <p>
                    Eu, <strong>{selectedAthlete.guardian_name}</strong>, portador(a) do RG/CPF nº <strong>{selectedAthlete.guardian_doc}</strong>, na qualidade de responsável legal pelo atleta menor <strong>{selectedAthlete.name}</strong>, nascido em <strong>{selectedAthlete.birth_date}</strong>, inscrito sob o RG/CPF nº <strong>{selectedAthlete.doc}</strong>, venho por meio deste TERMO DE RESPONSABILIDADE E AUTORIZAÇÃO declarar e autorizar o quanto segue abaixo:
                  </p>
                  <p>
                    Autorizo o menor acima mencionado, <strong>{selectedAthlete.name}</strong>, a treinar e realizar testes/avaliação de futebol no ESTÁDIO MUNICIPAL QUINZINHO NERY, situado ao endereço Av. Newton Ferreira de Paiva, nº ___, Bairro Nossa Senhora Aparecida, Cidade de Campos Altos, Estado de Minas Gerais, CEP 38970-000, ou (37) 99124-3101, sob a supervisão de Marcos Vinícius Machado e, pelo período mínimo de 12 meses (1 ano) a contar a partir da data deste documento, e sobre todas as normas estabelecidas nesse TERMO DE RESPONSABILIDADE E AUTORIZAÇÃO como segue abaixo:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>O RESPONSÁVEL declara ter pleno conhecimento de que o treinamento envolve testes físicos, treinamentos com bola, coletivos e trabalho técnico.</li>
                    <li>O RESPONSÁVEL assume ainda integral responsabilidade, civil e criminal, pela autenticidade dos documentos ora apresentados, na eventualidade dos mesmos conterem qualquer vício.</li>
                    <li>O RESPONSÁVEL declara que o ATLETA possui documentação original regularizada devidamente, e prática regularmente atividades esportivas, não sofrendo de nenhuma doença ou limitação física que desaconselhe ou impeça a prática do mesmo nos treinos futebolísticos.</li>
                    <li>O RESPONSÁVEL declara estar ciente de que, como em qualquer outra atividade física, podem ocorrer lesões e ferimentos no ATLETA durante o período de treinamento.</li>
                    <li>Sendo desejo do ATLETA e do RESPONSÁVEL que o primeiro participe dos treinamentos a serem realizados no Estádio Municipal Quinzinho Nery, ambos isentam os TREINADORES de toda e qualquer responsabilidade por eventuais lesões físicas, fraturas, acidentes em geral ou danos de qualquer natureza que venham a ocorrer no período de testes. Nestes casos prestaremos todo apoio necessário para melhora do atleta, condução ao hospital ou PAM, e também em casa para os primeiros atendimentos. Este termo se faz necessário pois nós instrutores não somos remunerados e não temos condições de custear nenhum tratamento pois somos voluntários interessados em ajudar no desenvolvimento do seu filho, seja no âmbito esportivo e social, salvo que tentaremos ajudar da melhor forma possível se algo acontecer.</li>
                    <li>O RESPONSÁVEL declara estar ciente de que o ATLETA deverá trazer de casa para treinar a chuteira, caneleira, um tênis para corrida, chinelo. Caso falte um dos itens, o ATLETA não treinará até que providencie tal item, cumprindo esta norma.</li>
                    <li>O RESPONSÁVEL declara estar ciente de que deve anexar uma cópia da Cédula de Identidade RG do ATLETA e do RESPONSÁVEL, e que se esse item não for 100% cumprido até o início dos treinamentos, o ATLETA não iniciará os treinos enquanto não cumprir em 100% tal exigência.</li>
                    <li>O RESPONSÁVEL declara estar ciente e concordar que nesse período de treinamento e também em caso de teste/avaliação, qualquer dano causado ao patrimônio deverá ser por ele imediatamente custeado, e o cumprimento em 100% do Regulamento.</li>
                    <li>O RESPONSÁVEL declara estar ciente e autoriza a organização do projeto a realizar postagem de fotos, vídeos "conteúdos de mídia", em redes sociais como Facebook, YouTube, Instagram e WhatsApp a fim de promover o trabalho desenvolvido na escolinha, como também envio de vídeos e fotos a profissionais ligados ao futebol como avaliadores, olheiros que com o intuito de projetar seu filho(a) ao mercado futebolístico.</li>
                  </ol>
                </div>
              )}

              <div className="mt-8 space-y-8">
                <div className="flex justify-between items-end">
                  <div className="text-center">
                    <div className="w-56 border-t-2 border-black pt-1 font-bold uppercase text-[10px]">{selectedAthlete.guardian_name}</div>
                    <p className="text-[9px] uppercase">Assinatura do Responsável Legal</p>
                  </div>
                  <div className="text-center">
                    <div className="w-56 border-t-2 border-black pt-1 font-bold uppercase text-[10px]">Piruá Esporte Clube</div>
                    <p className="text-[9px] uppercase">Carimbo e Assinatura da Diretoria</p>
                  </div>
                </div>
                <div className="text-right text-[9px] text-[#71717a] italic">
                  Documento gerado pelo Sistema de Gestão Piruá E.C. em {format(new Date(), 'dd/MM/yyyy, HH:mm:ss')}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-[#f4f4f5] flex justify-center no-print">
                <button 
                  onClick={() => setDocType(null)}
                  className="flex items-center gap-2 px-8 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black rounded-2xl transition-all font-bold uppercase tracking-widest"
                >
                  <ChevronRight size={20} className="rotate-180" />
                  Voltar para Seleção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actual Print View (Hidden in UI) */}
      <div className="hidden print-only bg-white text-black p-8">
        {docType && selectedAthlete && (
          <div className="document-content text-justify leading-relaxed">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              {settings?.schoolCrest && (
                <img src={settings.schoolCrest} className="w-16 h-16 object-contain mx-auto mb-2" referrerPolicy="no-referrer" />
              )}
              <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
              <p className="text-base font-bold uppercase">Departamento de Futebol de Base</p>
              <h2 className="text-lg font-black mt-2 uppercase underline">
                {docType === 'travel' ? 'Autorização de Viagem e Participação em Evento' : 'Termo de Responsabilidade e Autorização'}
              </h2>
            </div>
            
            {docType === 'travel' && selectedEvent && (
              <div className="space-y-6">
                <p>
                  Eu, <strong>{selectedAthlete.guardian_name}</strong>, portador(a) do RG/CPF nº <strong>{selectedAthlete.guardian_doc}</strong>, na qualidade de responsável legal pelo atleta menor <strong>{selectedAthlete.name}</strong>, nascido em <strong>{selectedAthlete.birth_date}</strong>, inscrito sob o RG/CPF nº <strong>{selectedAthlete.doc}</strong>, residente e domiciliado em <strong>{selectedAthlete.street}, {selectedAthlete.number}, {selectedAthlete.neighborhood}, {selectedAthlete.city}-{selectedAthlete.uf}</strong>, venho por meio desta AUTORIZAR sua participação no evento denominado <strong>{selectedEvent.name}</strong>.
                </p>
                <p>
                  O referido evento realizar-se-á na cidade de <strong>{selectedEvent.city}-{selectedEvent.uf}</strong>, no endereço <strong>{selectedEvent.street}, {selectedEvent.number}</strong>, com início previsto para o dia <strong>{selectedEvent.start_date}</strong> e término em <strong>{selectedEvent.end_date}</strong>.
                </p>
                <p>
                  Autorizo ainda que o atleta seja transportado em veículo gentilmente cedido pela Prefeitura Municipal de Campos Altos, através da Secretaria de Esporte e Lazer juntamente com a Secretaria de Administração do Município, ou por outros meios designados pelo Piruá Esporte Clube.
                </p>
                <p className="italic">
                  "Isento os organizadores do Evento de qualquer responsabilidade por danos eventualmente causados ao menor acima citado no decorrer da competição. Ressaltamos que prestaremos toda atenção necessária durante a viagem, como também durante os jogos. No caso de lesões ou até mesmo fraturas, enfatizamos que prestaremos todo apoio necessário ao atleta de acordo com as nossas condições."
                </p>
              </div>
            )}

            {docType === 'responsibility' && (
              <div className="space-y-2 text-[10px]">
                <p>
                  Eu, <strong>{selectedAthlete.guardian_name}</strong>, portador(a) do RG/CPF nº <strong>{selectedAthlete.guardian_doc}</strong>, na qualidade de responsável legal pelo atleta menor <strong>{selectedAthlete.name}</strong>, nascido em <strong>{selectedAthlete.birth_date}</strong>, inscrito sob o RG/CPF nº <strong>{selectedAthlete.doc}</strong>, venho por meio deste TERMO DE RESPONSABILIDADE E AUTORIZAÇÃO declarar e autorizar o quanto segue abaixo:
                </p>
                <p>
                  Autorizo o menor acima mencionado, <strong>{selectedAthlete.name}</strong>, a treinar e realizar testes/avaliação de futebol no ESTÁDIO MUNICIPAL QUINZINHO NERY, situado ao endereço Av. Newton Ferreira de Paiva, nº ___, Bairro Nossa Senhora Aparecida, Cidade de Campos Altos, Estado de Minas Gerais, CEP 38970-000, ou (37) 99124-3101, sob a supervisão de Marcos Vinícius Machado e, pelo período mínimo de 12 meses (1 ano) a contar a partir da data deste documento, e sobre todas as normas estabelecidas nesse TERMO DE RESPONSABILIDADE E AUTORIZAÇÃO como segue abaixo:
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>O RESPONSÁVEL declara ter pleno conhecimento de que o treinamento envolve testes físicos, treinamentos com bola, coletivos e trabalho técnico.</li>
                  <li>O RESPONSÁVEL assume ainda integral responsabilidade, civil e criminal, pela autenticidade dos documentos ora apresentados, na eventualidade dos mesmos conterem qualquer vício.</li>
                  <li>O RESPONSÁVEL declara que o ATLETA possui documentação original regularizada devidamente, e prática regularmente atividades esportivas, não sofrendo de nenhuma doença ou limitação física que desaconselhe ou impeça a prática do mesmo nos treinos futebolísticos.</li>
                  <li>O RESPONSÁVEL declara estar ciente de que, como em qualquer outra atividade física, podem ocorrer lesões e ferimentos no ATLETA durante o período de treinamento.</li>
                  <li>Sendo desejo do ATLETA e do RESPONSÁVEL que o primeiro participe dos treinamentos a serem realizados no Estádio Municipal Quinzinho Nery, ambos isentam os TREINADORES de toda e qualquer responsabilidade por eventuais lesões físicas, fraturas, acidentes em geral ou danos de qualquer natureza que venham a ocorrer no período de testes. Nestes casos prestaremos todo apoio necessário para melhora do atleta, condução ao hospital ou PAM, e também em casa para os primeiros atendimentos. Este termo se faz necessário pois nós instrutores não somos remunerados e não temos condições de custear nenhum tratamento pois somos voluntários interessados em ajudar no desenvolvimento do seu filho, seja no âmbito esportivo e social, salvo que tentaremos ajudar da melhor forma possível se algo acontecer.</li>
                  <li>O RESPONSÁVEL declara estar ciente de que o ATLETA deverá trazer de casa para treinar a chuteira, caneleira, um tênis para corrida, chinelo. Caso falte um dos itens, o ATLETA não treinará até que providencie tal item, cumprindo esta norma.</li>
                  <li>O RESPONSÁVEL declara estar ciente de que deve anexar uma cópia da Cédula de Identidade RG do ATLETA e do RESPONSÁVEL, e que se esse item não for 100% cumprido até o início dos treinamentos, o ATLETA não iniciará os treinos enquanto não cumprir em 100% tal exigência.</li>
                  <li>O RESPONSÁVEL declara estar ciente e concordar que nesse período de treinamento e também em caso de teste/avaliação, qualquer dano causado ao patrimônio deverá ser por ele imediatamente custeado, e o cumprimento em 100% do Regulamento.</li>
                  <li>O RESPONSÁVEL declara estar ciente e autoriza a organização do projeto a realizar postagem de fotos, vídeos "conteúdos de mídia", em redes sociais como Facebook, YouTube, Instagram e WhatsApp a fim de promover o trabalho desenvolvido na escolinha, como também envio de vídeos e fotos a profissionais ligados ao futebol como avaliadores, olheiros que com o intuito de projetar seu filho(a) ao mercado futebolístico.</li>
                </ol>
              </div>
            )}

            <div className="mt-8 space-y-8">
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="w-56 border-t-2 border-black pt-1 font-bold uppercase text-[10px]">{selectedAthlete.guardian_name}</div>
                  <p className="text-[9px] uppercase">Assinatura do Responsável Legal</p>
                </div>
                <div className="text-center">
                  <div className="w-56 border-t-2 border-black pt-1 font-bold uppercase text-[10px]">Piruá Esporte Clube</div>
                  <p className="text-[9px] uppercase">Carimbo e Assinatura da Diretoria</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[9px] text-[#71717a] italic">Documento gerado pelo Sistema de Gestão Piruá E.C. em {format(new Date(), 'dd/MM/yyyy, HH:mm:ss')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
