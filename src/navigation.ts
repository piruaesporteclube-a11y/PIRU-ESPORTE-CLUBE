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
  roles: ("admin" | "student" | "professor")[];
  description?: string;
  color?: string;
  category: 'command' | 'arena' | 'training' | 'office' | 'community' | 'student';
};

export const navItems: NavItem[] = [
  // --- GRUPO: Painel de Comando (Gestão Estratégica) ---
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: ['admin', 'student', 'professor'], description: 'Visão Geral', category: 'command' },
  { id: 'athletes', label: 'Atletas', icon: Users, roles: ['admin'], description: 'Elenco e Matrículas', color: 'text-theme-primary', category: 'command' },
  { id: 'professors', label: 'Comissão Técnica', icon: UserCheck, roles: ['admin'], description: 'Líderes e Técnicos', color: 'text-theme-primary', category: 'command' },
  { id: 'categories', label: 'Gerir SUBs', icon: ClipboardList, roles: ['admin'], description: 'Divisões Etárias', color: 'text-theme-primary', category: 'command' },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon, roles: ['admin'], description: 'Ajustes do Sistema', color: 'text-zinc-500', category: 'command' },
  
  // --- GRUPO: Arena & Competição (Ação nos Campos) ---
  { id: 'attendance', label: 'Presença', icon: ClipboardCheck, roles: ['admin', 'professor'], description: 'Presença no Jogo', color: 'text-green-500', category: 'arena' },
  { id: 'lineups', label: 'Agenda & Jogos', icon: Trophy, roles: ['admin', 'student', 'professor'], description: 'Escalações e Resultados', color: 'text-theme-primary', category: 'arena' },
  { id: 'championships', label: 'Campeonatos', icon: Trophy, roles: ['admin'], description: 'Glória e Troféus', color: 'text-theme-primary', category: 'arena' },
  { id: 'modalities', label: 'Modalidades', icon: ClipboardCheck, roles: ['admin'], description: 'Esportes Ativos', color: 'text-theme-primary', category: 'arena' },
 
  // --- GRUPO: Centro de Treinamento (Preparação e Logística) ---
  { id: 'trainings', label: 'Treinos', icon: History, roles: ['admin', 'student', 'professor'], description: 'Rotina e Horários', color: 'text-zinc-400', category: 'training' },
  { id: 'activities', label: 'Metodologia', icon: Activity, roles: ['admin', 'professor'], description: 'Biblioteca de Exercícios', color: 'text-indigo-500', category: 'training' },
  { id: 'events', label: 'Eventos', icon: Calendar, roles: ['admin', 'student', 'professor'], description: 'Agenda da Escola', color: 'text-blue-500', category: 'training' },
  { id: 'travel-list', label: 'Viagens', icon: ClipboardList, roles: ['admin', 'professor'], description: 'Logística de Saída', color: 'text-theme-primary', category: 'training' },
 
  // --- GRUPO: Gabinete & Saúde (Documentação e Fisiologia) ---
  { id: 'official-letters', label: 'Ofícios', icon: FileText, roles: ['admin'], description: 'Comunicação Oficial', color: 'text-purple-500', category: 'office' },
  { id: 'documents', label: 'Arquivos', icon: FileText, roles: ['admin'], description: 'PDFs e Manuais', color: 'text-purple-500', category: 'office' },
  { id: 'anamnesis', label: 'Ficha Médica', icon: Activity, roles: ['admin'], description: 'Saúde dos Atletas', color: 'text-theme-primary', category: 'office' },
  { id: 'membership-card', label: 'Identidade', icon: CreditCard, roles: ['admin'], description: 'Carteirinha Oficial', color: 'text-blue-500', category: 'office' },
  
  // --- GRUPO: Social & Relacionamento (Família Piruá) ---
  { id: 'contacts', label: 'Contatos', icon: MessageCircle, roles: ['admin'], description: 'Responsáveis (Zap)', color: 'text-green-500', category: 'community' },
  { id: 'birthdays', label: 'Aniversariantes', icon: Cake, roles: ['admin', 'professor'], description: 'Festa no Elenco', color: 'text-pink-500', category: 'community' },
  { id: 'sponsors', label: 'Patrocinadores', icon: Trophy, roles: ['admin'], description: 'Apoio e Parcerias', color: 'text-theme-primary', category: 'community' },
  
  // --- GRUPO: Espaço do Aluno ---
  { id: 'my-data', label: 'Meus Dados', icon: UserPlus, roles: ['student', 'professor'], description: 'Seu Perfil', category: 'student' },
  { id: 'attendance-history', label: 'Histórico', icon: History, roles: ['student', 'professor'], description: 'Sua Presença', category: 'student' },
  { id: 'my-card', label: 'Minha Carteirinha', icon: CreditCard, roles: ['student', 'professor'], description: 'Sua ID Digital', category: 'student' },
  { id: 'my-anamnesis', label: 'Minha Saúde', icon: Activity, roles: ['student', 'professor'], description: 'Ficha Médica', category: 'student' },
];
