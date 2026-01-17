
import React from 'react';

export type Page = 'home' | 'product' | 'solutions' | 'security' | 'customers' | 'news' | 'careers' | 'login' | 'dashboard' | 'contact' | 'about' | 'onboarding';
export type DashboardView = 'overview' | 'advisor' | 'crm' | 'ideas' | 'pitch' | 'settings' | 'marketing' | 'report';

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

// --- REPORT BUILDER TYPES (NEW) ---

export type ReportSectionType = 
  | 'intro'         // Innehållsförteckning (auto) & Info
  | 'ceo_words'     // VD-ordet
  | 'business_idea' // Affärsidé & Mål
  | 'execution'     // Genomförande & Marknad
  | 'financials'    // Ekonomi & Analys
  | 'learnings'     // Lärdomar & Utveckling
  | 'future'        // Avveckling / Framtid
  | 'signatures';   // Underskrifter

export interface ReportSectionData {
  id: ReportSectionType;
  title: string;
  content: string;
  status: 'empty' | 'draft' | 'complete';
  score?: number; // 1-10
  feedback?: {
    analysis: string; // New: Deep dive text
    jury_perspective: string; // New: How a jury sees this
    strengths: string[];
    weaknesses: string[];
    concrete_examples: string[]; // New: "Try writing this instead..."
  };
  lastUpdated?: string;
}

export interface FinancialData {
  revenue: number;
  costs: number;
  result: number;
  equity: number;
  debt: number;
}

export interface FullReportProject {
  id: string; // UUID
  user_id: string;
  workspace_id?: string;
  company_name: string;
  sections: Record<ReportSectionType, ReportSectionData>;
  financials?: FinancialData;
  created_at: string;
  updated_at: string;
}

// --- WORKSPACE TYPES (NEW) ---

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  role?: 'admin' | 'member' | 'viewer'; // Augmented on fetch
  memberCount?: number; // NEW: Count of members
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  user?: User; // Join
}

// --- PITCH ENGINE TYPES ---

export type PitchFormat = 'SCEN' | 'MONTER' | 'INVESTERARE' | 'KUND';

export interface PitchProject {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  title: string;
  target_audience: string;
  format: PitchFormat;
  time_limit_seconds: number;
  created_at: string;
  // Join
  versions?: PitchVersion[];
}

export interface PitchVersion {
  id: string;
  project_id: string;
  version_number: number;
  transcript: string;
  analysis_data?: PitchAnalysis;
  created_at: string;
}

export interface PitchAnalysis {
  jury_simulation: {
    understanding: string;
    doubts: string;
    memorable: string;
    risk: string;
  };
  structure_check: {
    hook: { score: number, feedback: string };
    problem: { score: number, feedback: string };
    solution: { score: number, feedback: string };
    value: { score: number, feedback: string };
    proof: { score: number, feedback: string };
    team: { score: number, feedback: string };
    closing: { score: number, feedback: string };
  };
  improvements: {
    original_text: string;
    improved_text: string;
    reason: string;
    priority: number;
  }[];
}

// --- CORE CRM TYPES ---

export type ContactType = 'PERSON' | 'COMPANY';
export type DealStage = 'QUALIFY' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type ActivityType = 'DM' | 'CALL' | 'MEETING' | 'FOLLOW_UP' | 'NOTE';
export type UfEventType = 'UF_FAIR' | 'DEADLINE' | 'COMPETITION' | 'OTHER';

// NEW: Mail Types
export type MailTemplateType = 'COLD_INTRO' | 'THANK_MEETING' | 'PARTNERSHIP_REQUEST' | 'FOLLOW_UP' | 'BOOK_MEETING';
export type MailTone = 'FORMAL' | 'FRIENDLY' | 'ENTHUSIASTIC' | 'SHORT';

export interface MailRecipient {
  id: string;
  origin: 'CONTACT' | 'DEAL';
  name: string;
  email?: string;
  company?: string;
  lastInteraction?: string;
  context?: string; // e.g., Deal stage or Contact notes
}

export interface MailDraftRequest {
  recipient: MailRecipient;
  template: MailTemplateType;
  tone: MailTone;
  extraContext?: string;
  meetingTime?: string; // New field for specific dates
  senderName: string;
  senderCompany: string;
}

export interface Contact {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  type: ContactType;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  role?: string;
  company?: string; // If type is PERSON, which company they belong to
  channel?: string;
  notes?: string;
  ambassador_potential?: number; // 0-5
  last_interaction_at?: string;
  created_at: string;
}

export interface Lead {
  // Keeping legacy Lead type for backward compatibility
  id: string;
  user_id: string;
  name: string;
  company: string;
  email?: string;
  status: string;
  priority: string;
  value: number;
  lead_score: number;
  created_at: string;
  workspace_id?: string; // NEW
}

export interface Deal {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  contact_id?: string;
  title: string;
  company?: string;
  value: number;
  probability: number; // 0-100
  stage: DealStage;
  deadline_at?: string;
  created_at: string;
  // Joins
  contact?: Contact;
}

export interface SalesEvent {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  contact_id?: string;
  channel: string;
  product_name: string;
  quantity: number;
  amount: number;
  occurred_at: string;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  type: ActivityType;
  subject: string;
  description?: string;
  related_type?: 'CONTACT' | 'DEAL' | 'LEAD';
  related_id?: string;
  occurred_at: string;
}

export interface SustainabilityLog {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  related_type?: string;
  related_id?: string;
  category: 'REUSE' | 'LOCAL' | 'SOCIAL' | 'MATERIAL';
  impact_description: string;
  saved_co2_approx?: number;
  created_at: string;
}

export interface UfEvent {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
  title: string;
  date_at: string;
  type: UfEventType;
  description?: string;
}

export interface Badge {
  id: string;
  badge_id: string;
  awarded_at: string;
}

export interface UserPoint {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  kind: 'FOLLOW_UP' | 'DEADLINE' | 'STALE_DEAL' | 'UF_EVENT' | 'TODAY_FOCUS';
  title: string;
  description: string;
  priority: number; // 1-100
  ctaLabel: string;
  ctaAction: () => void;
}

// --- EXISTING TYPES ---

export interface ChatSession {
  id: string;
  user_id: string;
  workspace_id?: string | null; // NEW: Null means private
  visibility?: 'private' | 'shared'; // NEW
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
  workspace_id?: string; // NEW
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

// Deprecated Pitch interface (keeping for type safety during migration)
export interface Pitch {
  id: string;
  user_id: string;
  workspace_id?: string; // NEW
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
  workspace_id?: string; // NEW
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
  user_id?: string;
  workspace_id?: string; // NEW
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
  user_id?: string;
  workspace_id?: string; // NEW
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
  workspaces?: Workspace[]; // NEW
  leads: Lead[];
  contacts: Contact[];
  deals: Deal[];
  salesEvents: SalesEvent[];
  activities: Activity[];
  sustainabilityLogs: SustainabilityLog[];
  ufEvents: UfEvent[];
  points: number;
  badges: Badge[];
  ideas: Idea[];
  pitches: Pitch[]; // Keeping for legacy
  pitchProjects?: PitchProject[]; // NEW
  chatHistory: ChatMessage[];
  sessions: ChatSession[];
  settings?: UserSettings;
  reports?: CompanyReportEntry[];
  fullReports?: FullReportProject[]; // NEW: The Report Builder projects
  notifications?: Notification[];
  brandDNAs?: BrandDNA[];
  marketingCampaigns?: MarketingCampaign[];
}

export interface SearchResult { id: string; type: 'lead' | 'idea' | 'pitch'; title: string; subtitle: string; view: DashboardView; }
export interface ContactRequest { name: string; email: string; subject: string; message: string; }
export interface NavProps { currentPage: Page; onNavigate: (page: Page) => void; user?: User | null; }
export interface PageProps { onNavigate: (page: Page) => void; }

// Old DeckSpec for backwards compat
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
