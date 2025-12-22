
import React from 'react';

export type Page = 'home' | 'product' | 'solutions' | 'security' | 'customers' | 'news' | 'careers' | 'login' | 'dashboard' | 'contact' | 'about' | 'onboarding';

export type DashboardView = 'overview' | 'advisor' | 'crm' | 'ideas' | 'pitch' | 'settings' | 'marketing';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  company?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  onboardingCompleted?: boolean;
  plan?: 'free' | 'pro' | 'enterprise';
  companyReport?: CompanyReport; 
}

// --- NAVIGATION TYPES ---

export interface NavItem {
  label: string;
  page: Page;
  hasDropdown: boolean;
}

export interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user?: User | null;
}

export interface PageProps {
  onNavigate: (page: Page) => void;
}

// --- IDEA LAB PRO TYPES ---

export type IdeaPhaseId = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface IdeaNode {
  id: string;
  node_type: 'problem' | 'impact' | 'scale' | 'solution' | 'persona' | 'competitor' | 'evidence' | 'task' | 'decision';
  label: string;
  parent_id: string | null;
  details: {
    text: string;
    status: 'draft' | 'approved';
    tags?: string[];
  };
  x?: number;
  y?: number;
}

export interface IdeaEdge {
  from: string;
  to: string;
  type: 'contains' | 'supports' | 'contradicts' | 'depends_on';
}

export interface IdeaCard {
  card_id: string;
  title: string;
  sections: Array<{ heading: string; bullets: string[] }>;
}

export interface IdeaTask {
  id: string;
  phase_id: string;
  title: string;
  completed: boolean;
}

export interface IdeaEvidence {
  id: string;
  source_type: 'reddit' | 'x' | 'web' | 'user_interview';
  url: string;
  quote: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export interface ProjectSnapshot {
  one_pager: string;
  problem_statement: string;
  icp: string;
  persona_summary: string;
  solution_hypothesis: string;
  uvp: string;
  pricing_hypothesis: string;
  mvp_definition: string;
  open_questions: string[];
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  score: number;
  currentPhase: IdeaPhaseId;
  dateCreated: string;
  chatSessionId?: string;
  snapshot: ProjectSnapshot;
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  cards: IdeaCard[];
  tasks: IdeaTask[];
  evidence: IdeaEvidence[];
  privacy_mode: boolean;
}

// --- PRESENTATION TYPES ---

export interface ClarificationQuestion {
  id: string;
  type: 'single' | 'multi' | 'text';
  question: string;
  options?: string[];
  required: boolean;
}

export interface DeckOutline {
  deckTitle: string;
  sections: {
      title: string;
      slides: {
          type: string;
          title: string;
          keyMessage: string;
      }[];
  }[];
}

export interface SlideSpec {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  kpis?: { label: string; value: string }[];
  speakerNotes?: string[];
  left?: { bullets: string[] };
  right?: { bullets: string[] };
}

export interface DeckSpec {
  deck: {
      title: string;
      audience: string;
  };
  slides: SlideSpec[];
  theme: any;
}

// --- MARKETING TYPES ---

export interface CampaignIdea {
  id: string;
  name: string;
  angle: string;
  primaryGoal: string;
  suggestedChannels: string[];
  coreMessage: string;
  exampleHeadline: string;
}

export interface CampaignAsset {
  id: string;
  channel: 'instagram_feed' | 'linkedin_post' | 'email_intro';
  content: {
      headline?: string;
      body: string;
      cta: string;
      hashtags?: string[];
      notes?: string;
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
  brief: any; 
  selectedIdea: CampaignIdea; 
  assets: CampaignAsset[]; 
  dateCreated: string; 
}

// --- CHAT & DATA TYPES ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  sessionId?: string; 
  sources?: { title: string; uri: string }[]; 
}

export interface Pitch {
  id: string;
  type: 'deck' | 'speech' | 'email';
  name: string;
  content: string; // JSON string of DeckSpec
  dateCreated: string;
  chatSessionId?: string; 
  contextScore?: number;
}

export interface UserData {
  leads: Lead[];
  ideas: Idea[];
  pitches: Pitch[];
  chatHistory: ChatMessage[];
  coaches: Coach[];
  sessions: ChatSession[];
  notifications?: Notification[];
  invoices?: Invoice[];
  settings?: UserSettings;
  marketingCampaigns?: MarketingCampaign[]; 
  brandDNAs?: BrandDNA[]; 
  reports?: CompanyReportEntry[]; 
}

// Helper types
export interface Lead { id: string; name: string; company: string; email: string; phone?: string; linkedin?: string; website?: string; notes?: string; status: 'New' | 'Contacted' | 'Meeting' | 'Closed'; value: number; lastContact?: string; dateAdded: string; }
export interface ChatSession { id: string; name: string; group?: string; lastMessageAt: number; preview?: string; }
export interface Coach { id: string; name: string; role: string; avatarSeed: string; personality: string; instructions: string; skills: string[]; isCustom?: boolean; }
export interface Notification { id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; date: string; read: boolean; }
export interface Invoice { id: string; date: string; amount: number; status: 'paid' | 'pending'; pdfUrl: string; }
export interface UserSettings { notifications: { email: boolean; push: boolean; marketing: boolean; }; privacy: { publicProfile: boolean; dataSharing: boolean; }; }
export interface BrandDNA { id: string; meta: { brandName: string; siteUrl: string; language: string; generatedAt: string; }; visual: { primaryColors: { hex: string; role: string; usageHint: string }[]; secondaryColors: { hex: string; role: string; usageHint: string }[]; neutralColors: { hex: string; role: string }[]; typography: { primaryFont: { name: string; family: string; usage: string }; secondaryFont: { name: string; family: string; usage: string }; }; layoutStyle: { density: string; shapeStyle: string; photoStyle: string; notes: string; }; }; voice: { toneDescriptors: string[]; formality: string; sentenceLength: { averageWords: number; style: string }; doUse: string[]; dontUse: string[]; }; messaging: { tagline: string; valueProps: { label: string; description: string }[]; targetAudiences: { name: string; painPoints: string[] }[]; }; }
export interface CompanyReport { meta: { companyName: string; website: string; generatedDate: string; language: string; }; fullMarkdown: string; summary: { revenue: string; ebitda: string; solvency: string; employees: string; founded: string; }; sources: { id: number; url: string; title: string; reliability: number }[]; }
export interface CompanyReportEntry { id: string; title: string; reportData: CompanyReport; created_at: string; }
export interface SearchResult { id: string; type: 'lead' | 'idea' | 'pitch' | 'campaign' | 'report'; title: string; subtitle: string; view: DashboardView; }
export interface ContactRequest { id?: string; name: string; email: string; subject: string; message: string; created_at?: string; }
