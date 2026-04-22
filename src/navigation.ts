import { 
  Users, 
  UserPlus, 
  Calendar, 
  ClipboardCheck, 
  Cake, 
  Trophy, 
  Settings as SettingsIcon, 
  FileText,
  UserCheck,
  ClipboardList,
  CreditCard,
  MessageCircle,
  LayoutDashboard,
  Activity,
  History
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  icon: any;
  roles: ("admin" | "student")[];
  description?: string;
  color?: string;
};

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['admin', 'student'], description: 'Visão geral do sistema' },
  { id: 'athletes', label: 'Atletas', icon: Users, roles: ['admin'], description: 'Gestão de atletas e matrículas', color: 'text-theme-primary' },
  { id: 'categories', label: 'Categorias (SUB)', icon: ClipboardList, roles: ['admin'], description: 'Organização por faixas etárias', color: 'text-theme-primary' },
  { id: 'professors', label: 'Comissão Técnica', icon: UserCheck, roles: ['admin'], description: 'Gerenciar professores e técnicos', color: 'text-theme-primary' },
  { id: 'attendance', label: 'Chamada', icon: ClipboardCheck, roles: ['admin'], description: 'Registro de presença diária', color: 'text-green-500' },
  { id: 'championships', label: 'Campeonatos', icon: Trophy, roles: ['admin'], description: 'Gestão de torneios e ligas', color: 'text-theme-primary' },
  { id: 'lineups', label: 'Escalações', icon: Users, roles: ['admin', 'student'], description: 'Convocação para jogos', color: 'text-theme-primary' },
  { id: 'events', label: 'Eventos', icon: Calendar, roles: ['admin', 'student'], description: 'Calendário de atividades', color: 'text-blue-500' },
  { id: 'birthdays', label: 'Aniversariantes', icon: Cake, roles: ['admin'], description: 'Datas comemorativas do mês', color: 'text-pink-500' },
  { id: 'contacts', label: 'Contatos', icon: MessageCircle, roles: ['admin'], description: 'Agenda de responsáveis', color: 'text-green-500' },
  { id: 'documents', label: 'Documentos', icon: FileText, roles: ['admin'], description: 'Modelos e arquivos PDF', color: 'text-purple-500' },
  { id: 'anamnesis', label: 'Anamnese', icon: Activity, roles: ['admin'], description: 'Fichas de saúde e histórico', color: 'text-theme-primary' },
  { id: 'membership-card', label: 'Carteirinha', icon: CreditCard, roles: ['admin'], description: 'Emissão de identificação', color: 'text-blue-500' },
  { id: 'sponsors', label: 'Patrocinadores', icon: Trophy, roles: ['admin'], description: 'Gestão de parceiros', color: 'text-theme-primary' },
  { id: 'modalities', label: 'Modalidades', icon: ClipboardCheck, roles: ['admin'], description: 'Esportes oferecidos', color: 'text-theme-primary' },
  { id: 'trainings', label: 'Treinos', icon: History, roles: ['admin', 'student'], description: 'Horários de treinamento', color: 'text-zinc-400' },
  { id: 'official-letters', label: 'Ofícios', icon: FileText, roles: ['admin'], description: 'Gerador de documentos oficiais', color: 'text-purple-500' },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon, roles: ['admin'], description: 'Ajustes globais do sistema', color: 'text-zinc-500' },
  
  // Student items
  { id: 'my-data', label: 'Meus Dados', icon: UserPlus, roles: ['student'], description: 'Seu perfil completo' },
  { id: 'my-anamnesis', label: 'Minha Saúde', icon: Activity, roles: ['student'], description: 'Sua ficha médica' },
  { id: 'my-card', label: 'Minha Carteirinha', icon: CreditCard, roles: ['student'], description: 'Sua identificação oficial' },
];
