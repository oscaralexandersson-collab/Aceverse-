
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

// --- NEW PRESENTATION TYPES ---

export type SlideType = 
  | "title" | "agenda" | "section" | "bullets" | "bulletsImage" 
  | "twoColumn" | "kpi" | "timeline" | "comparison" | "chart" | "closing";

export interface SlideSpec {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  imageQuery?: string;
  left?: { heading?: string, bullets?: string[] };
  right?: { heading?: string, bullets?: string[] };
  kpis?: Array<{ value: string, label: string }>;
  timeline?: Array<{ label: string, text: string }>;
  table?: { headers: string[], rows: string[][] };
  chart?: { kind: "bar" | "line", title?: string, categories: string[], series: Array<{ name: string, values: number[] }> };
  speakerNotes?: string[];
  citations?: Array<{ url: string, title?: string, snippet?: string }>;
}

export interface DeckSpec {
  deck: {
    title: string;
    language: string;
    audience: string;
    objective: string;
    tone: string;
    slideCount: number;
  };
  theme: {
    palette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    logoDataUrl?: string;
  };
  sources?: {
    userProvided?: string[];
    urls?: string[];
  };
  slides: SlideSpec[];
}

export interface ClarificationQuestion {
  id: string;
  type: "single" | "multi" | "text";
  question: string;
  options?: string[];
  required: boolean;
}

export interface DeckOutline {
  deckTitle: string;
  sections: Array<{
    title: string;
    slides: Array<{
      type: SlideType;
      title: string;
      keyMessage: string;
    }>;
  }>;
}

// --- END NEW TYPES ---

export interface CompanyReport {
  meta: {
    companyName: string;
    orgNumber?: string;
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
  sources: { id: number; url: string; title: string; reliability: number }[];
}

export interface CompanyReportEntry {
    id: string;
    title: string;
    reportData: CompanyReport;
    created_at: string;
}

export interface ContactRequest {
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at?: string;
}

export interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user?: User | null;
}

export interface PageProps {
  onNavigate: (page: Page) => void;
}

export interface NavItem {
  label: string;
  page: Page;
  hasDropdown?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  notes?: string;
  status: 'New' | 'Contacted' | 'Meeting' | 'Closed';
  value: number;
  lastContact?: string;
  dateAdded: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  sessionId?: string; 
  sources?: { title: string; uri: string }[]; 
}

export interface ChatSession {
  id: string;
  name: string;
  group?: string; 
  lastMessageAt: number;
  preview?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  score: number;
  marketSize: string;
  competition: string;
  dateCreated: string;
  nodes?: any[]; 
  chatSessionId?: string; 
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

export interface Coach {
    id: string;
    name: string;
    role: string;
    avatarSeed: string;
    personality: string;
    instructions: string;
    skills: string[];
    isCustom?: boolean;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    date: string;
    read: boolean;
}

export interface Invoice {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending';
    pdfUrl: string;
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
        language: string;
        generatedAt: string;
    };
    visual: {
        primaryColors: { hex: string; role: string; usageHint: string }[];
        secondaryColors: { hex: string; role: string; usageHint: string }[];
        neutralColors: { hex: string; role: string }[];
        typography: {
            primaryFont: { name: string; family: string; usage: string };
            secondaryFont: { name: string; family: string; usage: string };
        };
        layoutStyle: {
            density: string;
            shapeStyle: string;
            photoStyle: string;
            notes: string;
        };
    };
    voice: {
        toneDescriptors: string[];
        formality: string;
        sentenceLength: { averageWords: number; style: string };
        doUse: string[];
        dontUse: string[];
    };
    messaging: {
        tagline: string;
        valueProps: { label: string; description: string }[];
        targetAudiences: { name: string; painPoints: string[] }[];
    };
}

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
        cta?: string;
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

export interface SearchResult {
    id: string;
    type: 'lead' | 'idea' | 'pitch' | 'campaign' | 'report';
    title: string;
    subtitle: string;
    view: DashboardView;
}

export interface PitchAnalysis {
    score: number; 
    breakdown_4c: {
        clear: number;
        compelling: number;
        credible: number;
        concise: number;
    };
    feedback_summary: string;
    strengths: string[];
    weaknesses: string[]; 
    audience_specific_tip: string;
    improved_hook?: string;
    improvedVersion?: string; 
}
