
import React from 'react';

export type Page = 'home' | 'product' | 'solutions' | 'security' | 'customers' | 'news' | 'careers' | 'login' | 'dashboard' | 'contact' | 'about' | 'onboarding';
export type DashboardView = 'overview' | 'advisor' | 'crm' | 'ideas' | 'pitch' | 'settings';

export interface NavItem {
  label: string;
  page: Page;
  hasDropdown?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  bio?: string;
  avatar?: string;
  onboardingCompleted?: boolean;
  plan?: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  companyReport?: CompanyReport;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  notes?: string;
  // Fix: Added 'Ny', 'Kontaktad', 'Intresserad', 'Offert', 'Kund', 'Ej aktuell' to match usage in CRM.tsx
  status: 'Ny' | 'Kontaktad' | 'Intresserad' | 'Offert' | 'Kund' | 'Ej aktuell' | 'Nya' | 'Kontaktade' | 'Möte bokat' | 'Klart';
  priority: 'High' | 'Medium' | 'Low';
  value: number;
  lead_score: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  name: string;
  session_group: string;
  last_message_at: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  sources?: any[];
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  score: number;
  current_phase: string;
  chat_session_id?: string;
  snapshot: ProjectSnapshot;
  nodes: IdeaNode[];
  tasks: any[];
  created_at: string;
  is_active_track?: boolean;
  committed_at?: string;
}

export interface UFScore {
  feasibility: number; // 1-10
  risk: 'Låg' | 'Medel' | 'Hög';
  time_realism: 'Grön' | 'Gul' | 'Röd';
  copy_risk: 'Låg' | 'Medel' | 'Hög';
  complexity: 'Enkel' | 'Medel' | 'Avancerad';
  warning_point: string;
  motivation: string;
}

export interface ProjectSnapshot {
  problem_statement: string;
  icp: string;
  solution_hypothesis: string;
  uvp: string;
  one_pager: string;
  persona_summary: string;
  pricing_hypothesis: string;
  mvp_definition: string;
  open_questions: string[];
  next_step: string;
  uf_score?: UFScore;
  is_high_risk?: boolean;
}

export interface IdeaNode {
  id: string;
  node_type: string;
  label: string;
  parent_id: string | null;
  details: any;
}

export interface Pitch {
  id: string;
  user_id: string;
  name: string;
  pitch_type: 'deck' | 'speech' | 'email';
  content: string;
  chat_session_id?: string;
  context_score: number;
  created_at: string;
}

export interface CompanyReport {
  meta: {
    companyName: string;
    website: string;
    generatedDate: string;
    language: string;
  };
  fullMarkdown: string;
  summary: {
    revenue: string;
    ebitda: string;
    solvency: string;
    employees: string;
    founded: string;
  };
  sources?: { id: number; url: string; title: string; reliability: number }[];
}

export interface CompanyReportEntry {
  id: string;
  user_id: string;
  title: string;
  reportData: CompanyReport;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
}

export interface BrandDNA {
  id: string;
  meta: {
    brandName: string;
    siteUrl: string;
    generatedAt: string;
  };
  visual: {
    primaryColors: { hex: string }[];
    typography: {
      primaryFont: { name: string };
      secondaryFont: { name: string };
    };
    aesthetic?: string;
  };
  voice: {
    toneDescriptors: string[];
    doUse: string[];
    dontUse: string[];
  };
  product?: {
    description: string;
    uniqueValue: string;
  };
}

export interface CampaignIdea {
  id: string;
  name: string;
  angle: string;
}

export interface CampaignAsset {
  id: string;
  channel: string;
  content: {
    headline: string;
    body: string;
    hashtags: string[];
  };
  metrics: {
    ctr: string;
    roas: string;
  };
  image?: {
    prompt: string;
    url?: string;
  };
}

export interface MarketingCampaign {
  id: string;
  brandDnaId?: string;
  name: string;
  brief: {
    goal: string;
    audience: string;
    timeframe: string;
    constraints: string;
  };
  selectedIdea: CampaignIdea;
  assets: CampaignAsset[];
  dateCreated: string;
}

export interface UserSettings {
  notifications: { email: boolean; push: boolean; marketing: boolean };
  privacy: { publicProfile: boolean; dataSharing: boolean };
}

export interface UserData {
  profile: Partial<User>;
  leads: Lead[];
  ideas: Idea[];
  pitches: Pitch[];
  chatHistory: ChatMessage[];
  sessions: ChatSession[];
  settings?: UserSettings;
  reports?: CompanyReportEntry[];
  notifications?: Notification[];
  brandDNAs?: BrandDNA[];
  marketingCampaigns?: MarketingCampaign[];
}

export interface SearchResult { id: string; type: 'lead' | 'idea' | 'pitch'; title: string; subtitle: string; view: DashboardView; }
export interface ContactRequest { name: string; email: string; subject: string; message: string; }
export interface NavProps { currentPage: Page; onNavigate: (page: Page) => void; user?: User | null; }
export interface PageProps { onNavigate: (page: Page) => void; }

export interface DeckSpec {
  deck_title: string;
  language: string;
  slides: SlideSpec[];
}

export interface SlideSpec {
  slide_number: number;
  layout_id: string;
  title?: string;
  subtitle?: string;
  presenter_name?: string;
  presenter_role?: string;
  agenda_items?: string[];
  col_left?: string;
  col_right?: string;
  problems?: { title: string; body: string }[];
  solutions?: { title: string; body: string; icon_query?: string }[];
  services?: { title: string; body: string }[];
  narrative?: string;
  kpi_primary_value?: string;
  kpi_primary_caption?: string;
  kpi_secondary_value?: string;
  kpi_secondary_caption?: string;
  direct_bullets?: string[];
  indirect_bullets?: string[];
  advantages?: { title: string; body: string }[];
  kpis?: { value: string; label: string }[];
  chart?: { series_label: string; x_labels: string[]; y_values: number[] };
  timeline?: { label: string; body: string }[];
  bullets?: string[];
  pie?: { label: string; percent: number }[];
  team?: { name: string; role: string; bio: string; image_query?: string }[];
  phone?: string;
  website?: string;
  email?: string;
  address?: string;
}
