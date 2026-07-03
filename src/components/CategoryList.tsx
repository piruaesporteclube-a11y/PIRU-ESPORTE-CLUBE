import React, { useState, useEffect } from 'react';
import { Athlete, categories, getSubCategory } from '../types';
import { Users, ChevronRight, Search, Filter, FileDown } from 'lucide-react';
import { cn } from '../utils';
import AthleteList from './AthleteList';
import { useTheme } from '../contexts/ThemeContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CategoryListProps {
  athletes: Athlete[];
  onEditAthlete: (athlete: Athlete) => void;
  onAddAthlete: () => void;
  onRefresh: () => void;
}

export default function CategoryList({ athletes, onEditAthlete, onAddAthlete, onRefresh }: CategoryListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { settings } = useTheme();
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
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    };

    convertToDataUrl(settings?.schoolCrest || '', setCrestDataUrl);
  }, [settings?.schoolCrest]);

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const handleDownloadPDF = (categoryName: string, categoryAthletes: Athlete[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Sort athletes alphabetically by name
    const sortedAthletes = [...categoryAthletes].sort((a, b) => a.name.localeCompare(b.name));

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`ATLETAS (${sortedAthletes.length})`, 15, 55);
    
    autoTable(doc, {
      startY: 57,
      head: [['#', 'NOME COMPLETO', 'APELIDO', 'NASCIMENTO', 'DOCUMENTO (RG/CPF)', 'RESPONSÁVEL', 'CONTATO', 'STATUS']],
      body: sortedAthletes.map((a, idx) => [
        idx + 1,
        a.name.toUpperCase(),
        (a.nickname || '---').toUpperCase(),
        formatBirthDate(a.birth_date),
        a.doc || '---',
        (a.guardian_name || '---').toUpperCase(),
        a.guardian_phone || a.contact || '---',
        (a.status || 'Ativo').toUpperCase()
      ]),
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', minCellHeight: 4 },
      styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 55, left: 15, right: 15 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const athlete = sortedAthletes[data.row.index];
          if (athlete) {
            if (athlete.status === 'Inativo') {
              data.cell.styles.textColor = [120, 120, 120];
            } else if (athlete.status === 'Suspenso') {
              data.cell.styles.fillColor = [254, 243, 199]; // light yellow
              data.cell.styles.textColor = [180, 83, 9];
            }
          }
        }
      }
    });

    // Header drawing on all pages
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Header Text and Lines
      if (crestDataUrl) {
        try {
          doc.addImage(crestDataUrl, 'PNG', 15, 8, 13, 13);
        } catch (err) {
          console.warn('Could not add school crest to PDF', err);
        }
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text((settings?.schoolName || 'PIRUÁ ESPORTE CLUBE').toUpperCase(), pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Associação Desportiva e Cultural', pageWidth / 2, 20, { align: 'center' });
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(15, 23, pageWidth - 15, 23);
      
      // Category Banner Style
      doc.setFillColor(0, 0, 0);
      doc.rect(15, 26, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`ATLETAS REGISTRADOS - CATEGORIA ${categoryName.toUpperCase()}`, pageWidth / 2, 31, { align: 'center' });
      
      // Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`CATEGORIA: ${categoryName.toUpperCase()}`, 15, 40);
      doc.text(`DATA DE GERAÇÃO: ${format(new Date(), 'dd/MM/yyyy')}`, 15, 44);
      doc.text(`RESPONSÁVEL: ${(settings?.president || settings?.technicalDirector || 'DIRETORIA').toUpperCase()}`, pageWidth - 15, 40, { align: 'right' });
      doc.text(`CONTATO: ${settings?.whatsapp || '---'}`, pageWidth - 15, 44, { align: 'right' });

      // Page numbers at the bottom footer
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Páginas: ${i} / ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`atletas-${categoryName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const categoryStats = categories.map(cat => ({
    name: cat,
    count: athletes.filter(a => getSubCategory(a.birth_date) === cat).length,
    active: athletes.filter(a => getSubCategory(a.birth_date) === cat && a.status === 'Ativo').length
  }));

  if (selectedCategory) {
    const categoryAthletes = athletes.filter(a => getSubCategory(a.birth_date) === selectedCategory);
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCategory(null)}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
            >
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedCategory}</h2>
              <p className="text-zinc-500 text-sm uppercase tracking-widest">Visualizando atletas desta categoria</p>
            </div>
          </div>

          <button
            onClick={() => handleDownloadPDF(selectedCategory, categoryAthletes)}
            className="px-5 py-3 bg-theme-primary text-black hover:opacity-90 rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-theme-primary/10 self-start sm:self-center"
          >
            <FileDown size={18} />
            <span>SALVAR PDF</span>
          </button>
        </div>

        <AthleteList 
          athletes={categoryAthletes}
          onAdd={onAddAthlete}
          onEdit={onEditAthlete}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  const filteredCategories = categoryStats.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Categorias (SUB)</h2>
        <p className="text-zinc-400 uppercase tracking-widest text-sm">Gerencie os atletas divididos por ano de nascimento</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" 
          placeholder="BUSCAR CATEGORIA..." 
          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-bold text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCategories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl hover:border-theme-primary/50 transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={80} />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <ChevronRight size={20} className="text-zinc-600 group-hover:text-theme-primary transition-colors" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{cat.name}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{cat.count} Atletas</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{cat.active} Ativos</span>
            </div>
          </button>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-12 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhuma categoria encontrada</p>
        </div>
      )}
    </div>
  );
}
