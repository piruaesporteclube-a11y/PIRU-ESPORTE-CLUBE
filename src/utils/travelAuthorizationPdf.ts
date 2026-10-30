import jsPDF from 'jspdf';
import { Athlete, Event } from '../types';

export function formatTravelDate(dateStr?: string): string {
  if (!dateStr) return '___/___/_____';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch (e) {}
  return dateStr;
}

export function drawTravelAuthorizationPage(
  pdf: jsPDF,
  event: Event,
  athlete: Athlete,
  crestDataUrl?: string | null,
  schoolName: string = 'PIRUÁ ESPORTE CLUBE'
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Crest at y=15, centered
  if (crestDataUrl) {
    try {
      pdf.addImage(crestDataUrl, 'PNG', pageWidth / 2 - 12.5, 15, 25, 25);
    } catch (e) {
      console.warn("Could not draw crest on travel PDF:", e);
    }
  }

  // Title / Institution
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(schoolName.toUpperCase(), pageWidth / 2, 47, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('DEPARTAMENTO DE FUTEBOL E BASE', pageWidth / 2, 52, { align: 'center' });

  // Divider line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 56, pageWidth - margin, 56);

  // Document Subtitle
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const subTitle = 'AUTORIZAÇÃO DE VIAGEM E PARTICIPAÇÃO EM EVENTO';
  pdf.text(subTitle, pageWidth / 2, 66, { align: 'center' });

  // Double underline under subtitle
  pdf.setLineWidth(0.2);
  pdf.line(pageWidth / 2 - 60, 68, pageWidth / 2 + 60, 68);

  // Paragraph 1: Guardian Authorizes Candidate
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  
  const athleteAddress = [
    athlete.street ? `${athlete.street}` : '',
    athlete.number ? `nº ${athlete.number}` : '',
    athlete.neighborhood ? `${athlete.neighborhood}` : '',
    athlete.city ? `${athlete.city}-${athlete.uf || 'MG'}` : ''
  ].filter(Boolean).join(', ') || '____________________________________________________';

  const p1 = `Eu, ${athlete.guardian_name || '________________________'}, portador(a) do RG/CPF nº ${athlete.guardian_doc || '________________________'}, na qualidade de responsável legal pelo atleta menor ${athlete.name || '________________________'}, nascido em ${formatTravelDate(athlete.birth_date)}, inscrito sob o RG/CPF nº ${athlete.doc || '________________________'}, residente e domiciliado em ${athleteAddress}, venho por meio desta AUTORIZAR sua participação no evento denominado ${(event.name || '______').toUpperCase()}.`;

  // Paragraph 2: Location and details of local event
  const eventAddress = [
    event.street ? `${event.street}` : '',
    event.number ? `nº ${event.number}` : '',
    event.neighborhood ? `${event.neighborhood}` : '',
    event.city ? `${event.city}-${event.uf || 'MG'}` : ''
  ].filter(Boolean).join(', ') || '____________________________________________________';

  const eventStartTimeFormatted = event.start_time ? ` às ${event.start_time}h` : '';
  const eventEndTimeFormatted = event.end_time ? ` às ${event.end_time}h` : '';
  const p2 = `O referido evento realizar-se-á na cidade de ${event.city ? `${event.city}-${event.uf || 'MG'}` : '__________________'}, no endereço ${eventAddress}, com início previsto para o dia ${formatTravelDate(event.start_date)}${eventStartTimeFormatted} e término em ${formatTravelDate(event.end_date)}${eventEndTimeFormatted}.`;

  // Paragraph 3: Transportation Authorization with dynamic logistics coordinates
  const hasTravelDetails = event.departure_location || event.departure_time || event.arrival_location;
  const travelDetailsText = hasTravelDetails 
    ? ` Ficam definidos para o deslocamento os seguintes detalhes: Viagem com partida de ${event.departure_location || '_______________'}${event.departure_time ? ` prevista para às ${event.departure_time}h` : ''}, tendo como destino ${event.arrival_location || `${event.city || '_______'}-${event.uf || '___'}`}.`
    : '';
  const p3 = `Autorizo ainda que o atleta seja transportado em veículo gentilmente cedido pela Prefeitura Municipal de Campos Altos, através da Secretaria de Esporte e Lazer juntamente com a Secretaria de Administração do Município, ou por outros meios de transporte designados pela coordenação ou diretoria do ${schoolName}.${travelDetailsText}`;

  // Paragraph 4: Isenção text block
  const p4 = `"Isento os organizadores do Evento de qualquer responsabilidade por danos eventualmente causados ao menor acima citado no decorrer da competição. Ressaltamos que prestaremos toda atenção necessária durante a viagem, como também durante os jogos. No caso de lesões ou até mesmo fraturas, enfatizamos que prestaremos todo apoio necessário ao atleta de acordo com as nossas condições."`;

  let currentY = 80;
  const writeParagraph = (textStr: string, isItalic = false) => {
    pdf.setFont('helvetica', isItalic ? 'italic' : 'normal');
    if (isItalic) {
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
    } else {
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
    }
    const splitWidth = contentWidth - 8;
    const lines = pdf.splitTextToSize(textStr, splitWidth);
    pdf.text(lines, margin, currentY, { align: 'left' });
    currentY += (lines.length * 6) + 7;
  };

  writeParagraph(p1);
  writeParagraph(p2);
  writeParagraph(p3);
  writeParagraph(p4, true);

  // Local & date at signature time
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  const today = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dateText = `Campos Altos - MG, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;
  pdf.text(dateText, margin, currentY);
  currentY += 25;

  // Signature templates
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);

  // Left Signature - Guardian
  pdf.line(margin, currentY, margin + 70, currentY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  const leftGuardianName = (athlete.guardian_name || 'Assinatura do Responsável').toUpperCase();
  const splitLeftName = pdf.splitTextToSize(leftGuardianName, 70);
  pdf.text(splitLeftName, margin, currentY + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const leftTitleY = currentY + 4 + (splitLeftName.length * 4);
  pdf.text('Responsável Legal', margin, leftTitleY);

  // Right Signature - Board / PEC
  pdf.line(pageWidth - margin - 70, currentY, pageWidth - margin, currentY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  const rightSchoolName = schoolName.toUpperCase();
  const splitRightName = pdf.splitTextToSize(rightSchoolName, 70);
  pdf.text(splitRightName, pageWidth - margin - 70, currentY + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const rightTitleY = currentY + 4 + (splitRightName.length * 4);
  pdf.text('Assinatura e Carimbo da Diretoria', pageWidth - margin - 70, rightTitleY);

  // Footer lines
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Documento gerado eletronicamente em: ${today.toLocaleDateString('pt-BR')} ${today.toLocaleTimeString('pt-BR')}`, margin, pageHeight - 15);
  pdf.text(`Sistema de Gestão Piruá E.C. - Todos os direitos reservados.`, margin, pageHeight - 11);
}

export function createTravelAuthorizationPdf(
  event: Event,
  athlete: Athlete,
  crestDataUrl?: string | null,
  schoolName: string = 'PIRUÁ ESPORTE CLUBE'
): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  drawTravelAuthorizationPage(pdf, event, athlete, crestDataUrl, schoolName);
  return pdf;
}

export function createTravelAuthorizationPdfFile(
  event: Event,
  athlete: Athlete,
  crestDataUrl?: string | null,
  schoolName: string = 'PIRUÁ ESPORTE CLUBE'
): File {
  const pdf = createTravelAuthorizationPdf(event, athlete, crestDataUrl, schoolName);
  const pdfBlob = pdf.output('blob');
  const safeName = (athlete.name || 'Atleta').replace(/\s+/g, '_');
  return new File([pdfBlob], `Autorizacao_Viagem_${safeName}.pdf`, { type: 'application/pdf' });
}

export function getTravelAuthorizationPublicUrl(eventId: string, athleteId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?travel-doc=true&eventId=${encodeURIComponent(eventId)}&athleteId=${encodeURIComponent(athleteId)}`;
}
