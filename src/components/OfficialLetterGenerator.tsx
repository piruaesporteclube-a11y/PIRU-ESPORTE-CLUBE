import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { OfficialLetter } from '../types';
import { Plus, Search, FileText, Printer, Trash2, Edit, Save, X, ChevronLeft, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';

export default function OfficialLetterGenerator() {
  const { settings } = useTheme();
  const [letters, setLetters] = useState<OfficialLetter[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Partial<OfficialLetter> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = async () => {
    setLoading(true);
    try {
      const data = await api.getOfficialLetters();
      setLetters(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    const nextNumber = letters.length > 0 
      ? (Math.max(...letters.map(l => parseInt(l.number) || 0)) + 1).toString().padStart(3, '0')
      : '001';
      
    setEditingLetter({
      number: nextNumber,
      year: new Date().getFullYear(),
      date: new Date().toISOString().split('T')[0],
      recipient_name: '',
      recipient_role: '',
      recipient_address: '',
      subject: '',
      body: '',
      closing: 'Atenciosamente,',
      sender_name: 'DIRETORIA',
      sender_role: 'PIRUÁ ESPORTE CLUBE',
      school_info: 'Rua Exemplo, 123 - Bairro - Cidade/UF | WhatsApp: (00) 00000-0000',
      school_cnpj: '00.000.000/0000-00',
      school_cpf: '000.000.000-00'
    });
    setIsFormOpen(true);
  };

  const handleEdit = (letter: OfficialLetter) => {
    setEditingLetter(letter);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ofício?')) return;
    try {
      await api.deleteOfficialLetter(id);
      toast.success('Ofício excluído com sucesso!');
      loadLetters();
    } catch (error) {
      toast.error('Erro ao excluir ofício.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLetter) return;

    try {
      await api.saveOfficialLetter(editingLetter);
      toast.success('Ofício salvo com sucesso!');
      setIsFormOpen(false);
      setEditingLetter(null);
      loadLetters();
    } catch (error) {
      toast.error('Erro ao salvar ofício.');
    }
  };

  const filteredLetters = letters.filter(l => 
    l.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.number.includes(searchTerm)
  );

  const PrintPreview = ({ letter }: { letter: Partial<OfficialLetter> }) => (
    <div className="bg-white text-black p-12 min-h-[1123px] w-[794px] mx-auto shadow-2xl flex flex-col font-serif" style={{ fontSize: '12pt', lineHeight: '1.5' }}>
      {/* Header */}
      <div className="flex flex-col items-center mb-12 border-b-2 border-black pb-6">
        {settings?.schoolCrest && (
          <img src={settings.schoolCrest} alt="Crest" className="w-24 h-24 object-contain mb-4" referrerPolicy="no-referrer" />
        )}
        <h1 className="text-2xl font-bold uppercase text-center">{settings?.schoolName || 'PIRUÁ ESPORTE CLUBE'}</h1>
      </div>

      {/* Title & Date */}
      <div className="flex justify-between mb-8">
        <p className="font-bold">OFÍCIO Nº {letter.number}/{letter.year}</p>
        <p>{letter.date ? new Date(letter.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
      </div>

      {/* Recipient */}
      <div className="mb-8">
        <p>Ao Sr(a).</p>
        <p className="font-bold uppercase">{letter.recipient_name}</p>
        <p className="italic">{letter.recipient_role}</p>
        <p>{letter.recipient_address}</p>
      </div>

      {/* Subject */}
      <div className="mb-8">
        <p><span className="font-bold">Assunto:</span> {letter.subject}</p>
      </div>

      {/* Salutation */}
      <div className="mb-6">
        <p>Prezado(a) Senhor(a),</p>
      </div>

      {/* Body */}
      <div className="flex-1 whitespace-pre-wrap text-justify">
        {letter.body}
      </div>

      {/* Closing */}
      <div className="mt-12 text-center">
        <p className="mb-12">{letter.closing}</p>
        <div className="flex flex-col items-center">
          <div className="w-64 border-t border-black mb-1"></div>
          <p className="font-bold uppercase leading-tight">{letter.sender_name}</p>
          <p className="text-sm uppercase leading-tight">{letter.sender_role}</p>
          {(letter.school_cnpj || letter.school_cpf) && (
            <p className="text-[10px] uppercase mt-1">
              {letter.school_cnpj && <span>CNPJ: {letter.school_cnpj}</span>}
              {letter.school_cnpj && letter.school_cpf && <span className="mx-2">|</span>}
              {letter.school_cpf && <span>CPF: {letter.school_cpf}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-zinc-200 text-[10px] text-zinc-400 text-center uppercase tracking-tighter">
        {letter.school_info && (
          <p className="mb-1 text-black font-bold uppercase">{letter.school_info}</p>
        )}
        Documento gerado oficialmente pelo sistema de gestão {settings?.schoolName || 'Piruá Esporte Clube'}
      </div>
    </div>
  );

  if (isFormOpen && editingLetter) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between no-print">
          <button 
            onClick={() => { setIsFormOpen(false); setEditingLetter(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold uppercase text-xs tracking-widest">Voltar para Lista</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
            >
              <Printer size={20} />
              Imprimir
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20"
            >
              <Save size={20} />
              Salvar Ofício
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form */}
          <form onSubmit={handleSave} className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] shadow-xl space-y-6 no-print">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Número</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={editingLetter.number || ''}
                  onChange={e => setEditingLetter({...editingLetter, number: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Ano</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={editingLetter.year}
                  onChange={e => setEditingLetter({...editingLetter, year: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Data</label>
              <input 
                type="date" 
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                value={editingLetter.date}
                onChange={e => setEditingLetter({...editingLetter, date: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest border-b border-theme-primary/20 pb-2">Identificação da Escolinha</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">CNPJ</label>
                  <input 
                    type="text" 
                    placeholder="00.000.000/0000-00"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={editingLetter.school_cnpj || ''}
                    onChange={e => setEditingLetter({...editingLetter, school_cnpj: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">CPF</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={editingLetter.school_cpf || ''}
                    onChange={e => setEditingLetter({...editingLetter, school_cpf: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Endereço e Contato (Rodapé)</label>
                <input 
                  type="text" 
                  placeholder="EX: RUA TAL, 123 - BAIRRO - CIDADE/UF | CONTATO: (00) 00000-0000"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs"
                  value={editingLetter.school_info || ''}
                  onChange={e => setEditingLetter({...editingLetter, school_info: e.target.value.toUpperCase()})}
                />
                <p className="text-[10px] text-zinc-500 mt-1 italic">Estes dados aparecerão identificando a escolinha no rodapé e na assinatura.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest border-b border-theme-primary/20 pb-2">Destinatário</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nome</label>
                <input 
                  type="text" 
                  placeholder="EX: JOÃO DA SILVA"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                  value={editingLetter.recipient_name || ''}
                  onChange={e => setEditingLetter({...editingLetter, recipient_name: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Cargo/Função</label>
                  <input 
                    type="text" 
                    placeholder="EX: SECRETÁRIO DE ESPORTES"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={editingLetter.recipient_role || ''}
                    onChange={e => setEditingLetter({...editingLetter, recipient_role: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Local/Endereço</label>
                  <input 
                    type="text" 
                    placeholder="EX: PREFEITURA MUNICIPAL"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={editingLetter.recipient_address || ''}
                    onChange={e => setEditingLetter({...editingLetter, recipient_address: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest border-b border-theme-primary/20 pb-2">Conteúdo</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Assunto</label>
                <input 
                  type="text" 
                  placeholder="EX: SOLICITAÇÃO DE TRANSPORTE"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={editingLetter.subject || ''}
                  onChange={e => setEditingLetter({...editingLetter, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Corpo do Texto</label>
                <textarea 
                  rows={10}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 min-h-[200px]"
                  value={editingLetter.body || ''}
                  onChange={e => setEditingLetter({...editingLetter, body: e.target.value})}
                  placeholder="DIGITE O CONTEÚDO DO OFÍCIO AQUI..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest border-b border-theme-primary/20 pb-2">Assinatura</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Quem Assina</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={editingLetter.sender_name || ''}
                    onChange={e => setEditingLetter({...editingLetter, sender_name: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Cargo</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={editingLetter.sender_role || ''}
                    onChange={e => setEditingLetter({...editingLetter, sender_role: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Preview */}
          <div className="sticky top-24 scale-[0.65] lg:scale-100 origin-top overflow-hidden rounded-2xl shadow-2xl print:shadow-none print:m-0 print:scale-100">
            <PrintPreview letter={editingLetter} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">Gerador de Ofícios</h2>
          <p className="text-zinc-500 font-medium text-sm sm:text-base">Crie e gerencie documentos oficiais do clube.</p>
        </div>
        <button 
          onClick={handleNew}
          className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-tighter hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
        >
          <Plus size={20} />
          Novo Ofício
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="PESQUISAR POR ASSUNTO OU DESTINATÁRIO..." 
              className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-zinc-500 font-bold uppercase tracking-widest">Carregando Ofícios...</p>
            </div>
          ) : filteredLetters.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-800/20 rounded-[2rem] border border-dashed border-zinc-800">
              <FileText size={48} className="mx-auto text-zinc-800 mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest italic">Nenhum ofício encontrado.</p>
            </div>
          ) : (
            filteredLetters.map(letter => (
              <div key={letter.id} className="bg-zinc-800/30 border border-zinc-800 p-6 rounded-3xl hover:border-theme-primary/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                  <FileText size={80} />
                </div>
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-theme-primary uppercase tracking-[0.2em] mb-1">Nº {letter.number}/{letter.year}</p>
                    <h3 className="text-lg font-black text-white leading-tight mb-1 uppercase tracking-tight">{letter.subject}</h3>
                    <p className="text-xs text-zinc-500 font-bold">{new Date(letter.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <p className="text-xs text-zinc-400 font-medium">
                    <span className="text-zinc-600 uppercase text-[10px] block mb-0.5">Para:</span>
                    {letter.recipient_name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(letter)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all font-bold text-xs uppercase"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(letter.id)}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
