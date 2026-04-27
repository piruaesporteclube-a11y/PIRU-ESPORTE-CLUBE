import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Professor } from '../types';
import { X, Upload, Save, UserCircle, Printer, Plus, Search, Trash2, Edit2, MessageCircle, FileDown, Link as LinkIcon, Contact } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';
import MembershipCard from './MembershipCard';

interface ProfessorManagementProps {
  professors?: Professor[];
}

export default function ProfessorManagement({ professors: professorsProp }: ProfessorManagementProps) {
  const { settings } = useTheme();
  const [crestDataUrl, setCrestDataUrl] = useState<string | null>(null);
  const [professors, setProfessors] = useState<Professor[]>(professorsProp || []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [professorToDelete, setProfessorToDelete] = useState<string | null>(null);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [selectedProfessorForCard, setSelectedProfessorForCard] = useState<Professor | null>(null);
  const [formData, setFormData] = useState<Partial<Professor>>({
    name: '',
    birth_date: '',
    doc: '',
    phone: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    email: '',
    photo: '',
    role: 'Treinador',
    modality: 'Comissão Técnica'
  });

  useEffect(() => {
    if (professorsProp) {
      setProfessors(professorsProp);
    } else {
      loadProfessors();
    }
  }, [professorsProp]);

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
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '1200px';
      container.style.height = '1600px';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const clone = printRef.current.cloneNode(true) as HTMLElement;
      
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

      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.padding = '40px';
      clone.style.width = '800px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      clone.classList.remove('hidden'); // Ensure it's visible for capture

      container.appendChild(clone);

      // Wait for clone to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: true,
        width: 800
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const imgProps = pdf.getImageProperties(imgData);
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      pdf.save(`ficha_professor_${formData.name?.replace(/\s+/g, '_')}.pdf`);
      
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

  const loadProfessors = async () => {
    const data = await api.getProfessors();
    setProfessors(data);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("O arquivo selecionado não é uma imagem válida.");
        return;
      }
      if (file.size > 1024 * 1024) { // 1MB initial limit
        toast.error("A foto é muito grande. Por favor, escolha uma imagem com menos de 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (base64.length > 700000) { // Approx 500KB
          toast.error("A foto processada ainda é muito grande. Tente uma imagem com menor resolução.");
          return;
        }
        setFormData(prev => ({ ...prev, photo: base64 }));
      };
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo da foto.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.photo) {
        toast.error("A foto é obrigatória para membros da comissão.");
        return;
      }
      await api.saveProfessor(formData);
      toast.success("Membro da comissão técnica salvo com sucesso!");
      setIsFormOpen(false);
      setEditingProfessor(null);
      setFormData({ 
        name: '', 
        birth_date: '', 
        doc: '', 
        phone: '', 
        email: '', 
        street: '', 
        number: '', 
        neighborhood: '', 
        city: '', 
        uf: '', 
        photo: '',
        role: 'Treinador',
        modality: 'Comissão Técnica'
      });
      loadProfessors();
    } catch (err: any) {
      toast.error(`Erro ao salvar professor: ${err.message}`);
    }
  };

  const handleEdit = (p: Professor) => {
    setEditingProfessor(p);
    setFormData(p);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setProfessorToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!professorToDelete) return;
    try {
      await api.deleteProfessor(professorToDelete);
      toast.success("Membro excluído com sucesso!");
      loadProfessors();
      setIsDeleteConfirmOpen(false);
      setProfessorToDelete(null);
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print-only mb-8 border-b-2 border-black pb-4">
        <div className="flex items-center gap-4">
          {settings?.schoolCrest && (
            <img src={settings.schoolCrest} alt="Crest" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
            <p className="text-sm font-bold text-zinc-600">Lista de Comissão Técnica</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">Cadastro de Comissão Técnica</h2>
          <p className="text-zinc-400 text-sm">Gerencie a equipe técnica da escolinha</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const url = `${window.location.origin}/?professor_registration=true`;
              navigator.clipboard.writeText(url);
              toast.success("Link de cadastro copiado!", {
                description: "Envie para o novo membro da comissão."
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors border border-theme-primary/20"
            title="Copiar link para enviar"
          >
            <LinkIcon size={18} className="text-theme-primary" />
            Link de Cadastro
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            <Printer size={18} />
            Imprimir Lista
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors shadow-lg shadow-theme-primary/20"
          >
            <Plus size={18} />
            Novo Membro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professors.map((p) => (
          <div key={p.id} className="bg-black border border-theme-primary/20 rounded-3xl p-6 flex flex-col items-center text-center group relative shadow-xl">
            <div className="w-24 h-24 bg-zinc-800 rounded-full border-2 border-zinc-700 overflow-hidden mb-4 group-hover:border-theme-primary transition-colors">
              {p.photo ? (
                <img src={p.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                  <UserCircle size={48} />
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-white uppercase">{p.name}</h3>
            {p.role && <p className="text-xs text-theme-primary font-black uppercase mb-1">{p.role}</p>}
            <p className="text-xs text-zinc-300 font-bold mb-1">{p.email}</p>
            <p className="text-xs text-zinc-500 mb-1">{p.doc}</p>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs text-theme-primary font-bold">{p.phone}</p>
              {p.phone && p.phone.replace(/\D/g, '') && (
                <a 
                  href={`https://wa.me/55${p.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-400 transition-colors"
                  title="Conversar no WhatsApp"
                >
                  <MessageCircle size={14} />
                </a>
              )}
            </div>
            <div className="text-xs text-zinc-400 space-y-1">
              <p>{p.street}, {p.number}</p>
              <p>{p.neighborhood} - {p.city}/{p.uf}</p>
            </div>
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
              <button 
                onClick={() => setSelectedProfessorForCard(p)}
                className="p-2 bg-theme-primary/20 hover:bg-theme-primary/40 text-theme-primary rounded-lg transition-colors"
                title="Ver Carteirinha"
              >
                <Contact size={16} />
              </button>
              <button 
                onClick={() => handleEdit(p)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(p.id)}
                className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-start justify-center p-4 overflow-y-auto py-8">
          <div className="bg-black border border-theme-primary/20 w-full max-w-2xl rounded-3xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">{editingProfessor ? 'Editar Membro' : 'Novo Membro'}</h2>
              <button onClick={() => { 
                setIsFormOpen(false); 
                setEditingProfessor(null); 
                setFormData({ 
                  name: '', 
                  birth_date: '', 
                  doc: '', 
                  phone: '', 
                  email: '', 
                  street: '', 
                  number: '', 
                  neighborhood: '', 
                  city: '', 
                  uf: '', 
                  photo: '',
                  role: 'Treinador',
                  modality: 'Comissão Técnica'
                }); 
              }} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
                <X size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  {formData.photo ? (
                    <img src={formData.photo} className="w-24 h-24 object-cover rounded-full border-2 border-theme-primary" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700">
                      <UserCircle size={48} />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <Upload className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Ou cole a URL da Foto</label>
                <input 
                  type="url" 
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.photo}
                  onChange={e => setFormData({...formData, photo: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Setor / Modalidade</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
                    value={formData.modality}
                    onChange={e => setFormData({...formData, modality: e.target.value})}
                  >
                    <option value="Comissão Técnica">Comissão Técnica</option>
                    <option value="Futebol de Campo">Futebol de Campo</option>
                    <option value="Futsal">Futsal</option>
                    <option value="Diretoria">Diretoria</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Cargos / Funções (Selecione um ou mais)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {["Treinador", "Auxiliar", "Médico", "Presidente", "Diretor", "Massagista", "Fisioterapeuta", "Preparador Físico", "Treinador de Goleiros"].map(r => {
                      const isSelected = formData.role?.split(', ').includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            const current = formData.role ? formData.role.split(', ') : [];
                            let next;
                            if (current.includes(r)) {
                              next = current.filter(item => item !== r);
                            } else {
                              next = [...current, r];
                            }
                            setFormData({...formData, role: next.join(', ')});
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all text-center",
                            isSelected 
                              ? "bg-theme-primary border-theme-primary text-black" 
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                          )}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">E-mail</label>
                  <input 
                    required
                    type="email" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data de Nascimento</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.birth_date}
                    onChange={e => setFormData({...formData, birth_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">CPF/RG</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.doc}
                    onChange={e => setFormData({...formData, doc: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp / Telefone</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      placeholder="(37) 99999-9999"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                    {formData.phone && formData.phone.replace(/\D/g, '') && (
                      <a 
                        href={`https://wa.me/55${formData.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 hover:text-green-400 transition-colors"
                        title="Testar WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Rua</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.street}
                      onChange={e => setFormData({...formData, street: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nº</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.number}
                      onChange={e => setFormData({...formData, number: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Bairro</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.neighborhood}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-center uppercase"
                    value={formData.uf}
                    onChange={e => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                <button 
                  type="button"
                  onClick={() => { 
                    setIsFormOpen(false); 
                    setEditingProfessor(null); 
                    setFormData({ 
                      name: '', 
                      birth_date: '', 
                      doc: '', 
                      phone: '', 
                      email: '', 
                      street: '', 
                      number: '', 
                      neighborhood: '', 
                      city: '', 
                      uf: '', 
                      photo: '',
                      role: 'Treinador',
                      modality: 'Comissão Técnica'
                    }); 
                  }}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
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
                  className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2"
                >
                  <Save size={20} />
                  {editingProfessor ? 'Salvar Alterações' : 'Salvar Membro'}
                </button>
              </div>
            </form>
          </div>

          {/* Print View */}
          <div className="hidden print-only bg-white text-black p-8 min-h-screen" ref={printRef}>
            <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
              <div className="flex items-center gap-4">
                {settings?.schoolCrest && (
                  <img src={settings.schoolCrest} alt="Crest" className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />
                )}
                <div className="text-left">
                  <h1 className="text-2xl font-black uppercase leading-tight">Piruá Esporte Clube</h1>
                  <h2 className="text-sm font-bold uppercase text-zinc-600">Ficha de Cadastro de Membro da Comissão</h2>
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
                    <p className="text-[10px] font-black uppercase text-zinc-500">E-mail</p>
                    <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.email || '___________________________'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500">Cargo / Função</p>
                    <p className="text-sm font-bold border-b border-zinc-200 pb-1 uppercase">{formData.role || '___________________________'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500">CPF/RG</p>
                    <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.doc || '___________________________'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500">Data de Nascimento</p>
                    <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.birth_date || '____/____/_______'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500">Telefone/WhatsApp</p>
                    <p className="text-sm font-bold border-b border-zinc-200 pb-1">{formData.phone || '___________________________'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase bg-zinc-100 p-2 mb-3">Endereço</h3>
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
                </div>
              </div>
            </div>

            <div className="mt-20 space-y-12">
              <div className="flex justify-between gap-12">
                <div className="flex-1 border-t border-black text-center pt-2">
                  <p className="text-[10px] font-bold uppercase">Assinatura do Membro</p>
                </div>
                <div className="flex-1 border-t border-black text-center pt-2">
                  <p className="text-[10px] font-bold uppercase">Assinatura da Diretoria</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 uppercase">Piruá Esporte Clube - Formando Atletas, Cidadãos e Campeões</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Membership Card Modal */}
      {selectedProfessorForCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setSelectedProfessorForCard(null)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <MembershipCard athlete={selectedProfessorForCard as any} />
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-black border border-red-900/30 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Excluir Membro</h3>
            <p className="text-zinc-400 mb-8">Tem certeza que deseja excluir este membro da comissão técnica? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
