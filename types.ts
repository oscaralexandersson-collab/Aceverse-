

export type Page = 'home' | 'product' | 'solutions' | 'security' | 'customers' | 'about' | 'contact' | 'login' | 'dashboard' | 'onboarding' | 'careers';

export interface PageProps {
  onNavigate: (page: Page) => void;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  industry?: string;
  businessType?: 'B2B' | 'B2C' | 'Hybrid';
  bio?: string;
  avatar?: string;
  onboardingCompleted: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  companyReport?: CompanyReport;
}

export interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
}

export interface NavItem {
  label: string;
  page: Page;
  hasDropdown: boolean;
}

export interface UserData {
  profile: any;
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
  pitches: Pitch[];
  pitchProjects: PitchProject[];
  chatHistory: ChatMessage[];
  sessions: ChatSession[];
  settings?: UserSettings;
  reports: any[];
  fullReports: FullReportProject[];
  brandDNAs: BrandDNA[];
  marketingCampaigns: MarketingCampaign[];
  memories?: AIMemory[];
  notifications?: Notification[];
  teamMessages?: TeamMessage[];
  channels?: Channel[];
  tasks?: Task[];
}

export type DashboardView = 'overview' | 'ideas' | 'advisor' | 'marketing' | 'crm' | 'pitch' | 'settings' | 'report' | 'team';

export interface Task {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  title: string;
  description: string;
  due_date?: string;
  status: 'pending' | 'completed';
  linked_tool?: DashboardView;
  task_type?: 'GENERATE_MARKETING' | 'UPDATE_PLAN' | 'PITCH_PRACTICE';
  metadata?: any; 
  created_at: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}

export interface TeamMessage {
  id: string;
  workspace_id: string;
  channel_id?: string; 
  user_id: string;
  content: string;
  created_at: string;
  user?: User; 
  is_system?: boolean;
}

export interface UfEvent {
  id: string;
  title: string;
  date_at: string;
  type: 'UF_FAIR' | 'DEADLINE' | 'COMPETITION' | 'OTHER';
  workspace_id?: string | null;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  kind: 'UF_EVENT' | 'DEADLINE' | 'ACTION' | 'AI_TASK';
  ctaLabel: string;
  ctaAction: () => void;
  linked_tool?: DashboardView;
  metadata?: any;
}

export interface Contact {
  id: string;
  name: string;
  type: 'PERSON' | 'COMPANY';
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  workspace_id?: string | null;
  last_interaction_at?: string;
  created_at: string;
}

export type DealStage = 'QUALIFY' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number;
  workspace_id?: string | null;
  created_at: string;
}

export interface SalesEvent {
  id: string;
  product_name: string;
  quantity: number;
  amount: number;
  channel: string;
  occurred_at: string;
  workspace_id?: string | null;
  customer_count?: number;
}

export interface SustainabilityLog {
  id: string;
  category: string;
  impact_description: string;
  workspace_id?: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned_at: string;
}

export interface MailRecipient {
  id: string;
  origin: 'CONTACT' | 'DEAL';
  name: string;
  email?: string;
  company?: string;
  context?: string;
  lastInteraction?: string;
}

export type MailTemplateType = 'COLD_INTRO' | 'THANK_MEETING' | 'PARTNERSHIP_REQUEST' | 'FOLLOW_UP' | 'BOOK_MEETING';
export type MailTone = 'FORMAL' | 'FRIENDLY' | 'ENTHUSIASTIC' | 'SHORT';

export interface ChatSession {
  id: string;
  name: string;
  session_group: string;
  workspace_id?: string | null;
  last_message_at?: number;
  visibility?: 'private' | 'shared';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'model';
  text: string;
  timestamp: number;
  session_id: string;
  user_id: string;
  created_at: string;
}

export interface Idea {
  id: string;
  title: string;
  chat_session_id?: string;
  current_phase: 'A' | 'B' | 'C';
  snapshot: {
    problem_statement: string;
    // Fix: Added detailed_business_concept to Idea snapshot to resolve missing property error in IdeaLab
    detailed_business_concept: string;
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
  };
  workspace_id?: string | null;
  is_active_track?: boolean;
  committed_at?: string;
  created_at: string;
}

export interface UFScore {
  feasibility: number;
  risk: 'Låg' | 'Medel' | 'Hög';
  time_realism: 'Grön' | 'Gul' | 'Röd';
  copy_risk: 'Låg' | 'Medel' | 'Hög';
  complexity: 'Enkel' | 'Medel' | 'Avancerad';
  warning_point: string;
  motivation?: string;
}

export type PitchFormat = 'SCEN' | 'MONTER' | 'INVESTERARE';

export interface PitchProject {
  id: string;
  title: string;
  format: PitchFormat;
  target_audience: string;
  time_limit_seconds: number;
  workspace_id?: string | null;
  created_at: string;
  versions?: PitchVersion[];
}

export interface PitchVersion {
  id: string;
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
  structure_check: Record<string, { score: number; feedback: string }>;
  improvements: Array<{ original_text: string; improved_text: string; reason: string; priority: number }>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'MENTION' | 'SYSTEM' | 'ALERT';
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  read: boolean;
  created_at: string;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    publicProfile: boolean;
    dataSharing: boolean;
  };
}

export interface BrandDNA {
  id: string;
  meta: {
    brandName: string;
    siteUrl: string;
    generatedAt: string;
  };
  visual: {
    primaryColors: Array<{hex: string}>;
    typography: { primaryFont: { name: string }, secondaryFont: { name: string } };
    aesthetic: string;
  };
  voice: {
    toneDescriptors: string[];
    doUse: string[];
    dontUse: string[];
  };
  product: {
    description: string;
    uniqueValue: string;
  };
  workspace_id?: string | null;
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
  selectedIdea?: CampaignIdea;
  assets: CampaignAsset[];
  dateCreated: string;
  workspace_id?: string | null;
  status: 'DRAFT' | 'PUBLISHED';
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
    cta?: string;
  };
  metrics?: {
    ctr: string;
    roas: string;
  };
  image?: {
    prompt: string;
    url?: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  memberCount?: number;
  role?: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  user?: User;
}

export type ReportSectionType = 'intro' | 'ceo_words' | 'business_idea' | 'execution' | 'financials' | 'learnings' | 'future' | 'signatures';

export interface ReportSectionData {
  id: string;
  title: string;
  content: string;
  status: 'empty' | 'draft' | 'complete';
  score?: number;
  feedback?: {
    analysis: string;
    jury_perspective: string;
    strengths: string[];
    weaknesses: string[];
    concrete_examples: string[];
  };
}

export interface FullReportProject {
  id: string;
  user_id: string;
  company_name: string;
  workspace_id?: string | null;
  sections: Record<ReportSectionType, ReportSectionData>;
  financials: {
    revenue: number;
    costs: number;
    result: number;
    equity: number;
    debt: number;
  };
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  created_at: string;
}

export interface Activity {
  id: string;
  occurred_at: string;
}

export interface Pitch {
  id: string;
  created_at: string;
}

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface CompanyReport {
  meta?: {
    generatedDate: string;
    companyName: string;
    website?: string;
  };
  summary?: {
    founded: string;
    employees: string;
    revenue: string;
    ebitda: string;
    solvency: string;
  };
  sources?: Array<{title: string}>;
}

export interface CompanyReportEntry {
  // Placeholder
}

export interface MailDraftRequest {
  recipient: MailRecipient;
  template: MailTemplateType;
  tone: MailTone;
  extraContext: string;
  meetingTime?: string;
  senderName: string;
  senderCompany: string;
}

export interface DeckSpec {
  deck_title?: string;
  language?: string;
  slides?: Array<{
    layout_id: string;
    title?: string;
    subtitle?: string;
    body?: string;
    problems?: Array<{title: string, body: string}>;
    solutions?: Array<{title: string, body: string, icon_query?: string}>;
    narrative?: string;
    agenda_items?: string[];
    team?: Array<{name: string, role: string, bio: string, image_query?: string}>;
    bullets?: string[];
    [key: string]: any; 
  }>;
}

export interface AIMemory {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  content: string;
  source_type: 'CRM' | 'PITCH' | 'IDEA' | 'CHAT' | 'SYSTEM' | 'REPORT';
  source_id?: string;
  importance: number;
  created_at: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  htmlLink: string;
}

export interface GoogleContact {
  resourceName: string;
  names?: { displayName: string, givenName: string, familyName: string }[];
  emailAddresses?: { value: string }[];
  phoneNumbers?: { value: string }[];
  organizations?: { name: string, title: string }[];
}
