import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Users, Plus, Search, Mail, Phone, 
    Globe, Linkedin, ArrowRight, BarChart3, 
    FileText, Loader2, Send, Copy,
    CheckCircle2, Target, DollarSign, Wand2,
    LayoutGrid, List, Zap, 
    ChevronDown, Info,
    Check, Trash2, Save, X,
    Activity, Building2, TrendingUp, ShieldCheck,
    Calendar, History, Maximize2, BrainCircuit, Printer,
    Star, Rocket, Download, ExternalLink, AlertTriangle,
    Sparkles, Share2, Shield, Lock, FileSearch, Eye,
    ChevronRight, RefreshCw, PanelLeftClose, PanelLeftOpen,
    Menu, TrendingDown, Lightbulb, FileWarning, Timer,
    ArrowUpCircle, MessageSquare, Clock, User as UserIcon
} from 'lucide-react';
import { User, Lead, CompanyReport, CompanyReportEntry } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI, Type } from "@google/genai";
import { useLanguage } from '../../contexts/LanguageContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface CRMProps {
    user: User;
}

type CRMStatus = 'Ny' | 'Kontaktad' | 'Intresserad' | 'Offert' | 'Kund' | 'Ej aktuell';
type MailType = 'Första kontakt' | 'Uppföljning' | 'Skicka offert' | 'Tack' | 'Påminnelse' | 'Fritt mejl';

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reports, setReports] = useState<CompanyReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'leads' | 'deals' | 'customers'>('all');

    // Modals & Views
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isMailDrawerOpen, setIsMailDrawerOpen] = useState(false);
    const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
    
    // AI Mail State
    const [mailType, setMailType] = useState<MailType>('Första kontakt');
    const [generatedMail, setGeneratedMail] = useState('');
    const [isGeneratingMail, setIsGeneratingMail] = useState(false);
    const [mailError, setMailError] = useState(false);

    // Bolagskollen State
    const [reportUrl, setReportUrl] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportError, setReportError] = useState(false);
    const [activeReport, setActiveReport] = useState<CompanyReportEntry | null>(null);
    const [isFullScreenReport, setIsFullScreenReport] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            setLeads(Array.isArray(data.leads) ? data.leads : []);
            setReports(Array.isArray(data.reports) ? data.reports : []);
            if (data.reports && data.reports.length > 0) {
                setActiveReport(data.reports[0]);
            }
        } catch (e) {
            console.error("Kunde inte hämta data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalLeads = leads.filter(l => l.status !== 'Kund').length;
        const deals = leads.filter(l => l.status === 'Offert' || l.status === 'Intresserad').length;
        const customers = leads.filter(l => l.status === 'Kund').length;
        const revenue = leads.filter(l => l.status === 'Kund').reduce((acc, l) => acc + (l.value || 0), 0);
        return { totalLeads, deals, customers, revenue };
    }, [leads]);

    const filteredLeads = useMemo(() => {
        if (filter === 'all') return leads;
        if (filter === 'leads') return leads.filter(l => l.status === 'Ny' || l.status === 'Kontaktad');
        if (filter === 'deals') return leads.filter(l => l.status === 'Intresserad' || l.status === 'Offert');
        if (filter === 'customers') return leads.filter(l => l.status === 'Kund');
        return leads;
    }, [leads, filter]);

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        try {
            const added = await db.addLead(user.id, {
                name: formData.get('name') as string,
                company: formData.get('company') as string,
                email: formData.get('email') as string,
                status: 'Ny',
                value: Number(formData.get('value')) || 0,
                priority: 'Medium',
                lead_score: 70
            });
            setLeads(prev => [added, ...prev]);
            setIsAddModalOpen(false);
        } catch (e) {
            alert("Kunde inte spara kontakten.");
        }
    };

    const updateLeadStatus = async (id: string, newStatus: CRMStatus) => {
        try {
            await db.updateLead(user.id, id, { status: newStatus as any });
            setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus as any } : l));
            if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, status: newStatus as any });
        } catch (e) {
            alert("Kunde inte uppdatera status.");
        }
    };

    const generateAIMail = async () => {
        if (!selectedLead) return;
        setIsGeneratingMail(true);
        setMailError(false);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Skriv ett professionellt men ungt mejl (120-150 ord) på svenska.
                Mottagare: ${selectedLead.name} från företaget ${selectedLead.company}.
                Status i CRM: ${selectedLead.status}.
                Mejltyp: ${mailType}.
                
                KONTEXT OM MITT UF-FÖRETAG (från Bolagskollen):
                ${activeReport ? activeReport.reportData.fullMarkdown.substring(0, 500) : "Vi är ett drivet UF-företag."}
                
                REGLER:
                - Korta stycken.
                - Personlig ton.
                - Tydligt nästa steg i slutet.
                - Inga placeholders som [Namn], använd datan jag gav dig.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setGeneratedMail(response.text || '');
        } catch (e) {
            setMailError(true);
        } finally {
            setIsGeneratingMail(false);
        }
    };

    const generateReport = async () => {
        if (!reportUrl) return;
        setIsGeneratingReport(true);
        setReportError(false);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Gör en djuplodande bolagsanalys av ${reportUrl} för ett UF-företag. Svara på svenska i JSON.`,
                config: { 
                    tools: [{ googleSearch: {} }], 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            meta: { type: Type.OBJECT, properties: { companyName: { type: Type.STRING }, website: { type: Type.STRING }, generatedDate: { type: Type.STRING } } },
                            summary: { type: Type.OBJECT, properties: { revenue: { type: Type.STRING }, employees: { type: Type.STRING }, founded: { type: Type.STRING }, solvency: { type: Type.STRING }, ebitda: { type: Type.STRING } } },
                            fullMarkdown: { type: Type.STRING }
                        }
                    }
                }
            });
            const data = JSON.parse(response.text || '{}');
            const entry = await db.addReportToHistory(user.id, data);
            setReports(prev => [entry, ...prev]);
            setActiveReport(entry);
            setReportUrl('');
        } catch (e) {
            setReportError(true);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (isLoading) return (
        <div className="h-full flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-sm font-black uppercase tracking-widest text-gray-400 italic">Laddar din arbetsyta...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-8 animate-fadeIn pb-20">
            {/* 1. ÖVERSIKT */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Leads" 
                    value={stats.totalLeads} 
                    icon={<Users size={20} />} 
                    active={filter === 'leads'} 
                    onClick={() => setFilter(filter === 'leads' ? 'all' : 'leads')}
                />
                <StatCard 
                    label="Affärer" 
                    value={stats.deals} 
                    icon={<Target size={20} />} 
                    active={filter === 'deals'} 
                    onClick={() => setFilter(filter === 'deals' ? 'all' : 'deals')}
                />
                <StatCard 
                    label="Kunder" 
                    value={stats.customers} 
                    icon={<CheckCircle2 size={20} />} 
                    active={filter === 'customers'} 
                    onClick={() => setFilter(filter === 'customers' ? 'all' : 'customers')}
                />
                <StatCard 
                    label="Intäkter" 
                    value={`${stats.revenue} kr`} 
                    icon={<DollarSign size={20} />} 
                    active={false} 
                    onClick={() => {}}
                />
            </div>

            {/* 2. HUVUDYTA: KONTAKTLISTA */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden flex-1">
                <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-serif-display font-black italic uppercase tracking-tighter text-gray-950 dark:text-white">Mina Kontakter</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Här samlar du alla dina leads och kunder</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setIsIntelligenceOpen(true)}
                            className="flex-1 md:flex-none px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all"
                        >
                            <Zap size={16} /> Bolagskollen
                        </button>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex-1 md:flex-none px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus size={18} /> Lägg till kontakt
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredLeads.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                            <Users size={64} strokeWidth={1} className="mb-6" />
                            <h3 className="text-xl font-serif-display font-bold italic mb-2">Inga kontakter än</h3>
                            <p className="max-w-xs text-sm font-medium italic mb-8">Använd den här fliken för att hålla koll på alla företag och personer ni vill sälja till eller samarbeta med.</p>
                            <button onClick={() => setIsAddModalOpen(true)} className="px-10 py-4 border-2 border-black rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all">Lägg till första kontakten</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {filteredLeads.map((lead) => (
                                <div 
                                    key={lead.id} 
                                    onClick={() => setSelectedLead(lead)}
                                    className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer group flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center font-serif text-xl font-bold italic text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                                            {lead.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-950 dark:text-white leading-none mb-2">{lead.name}</h4>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{lead.company}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${getStatusColor(lead.status as any)}`}>{lead.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-12">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Senaste aktivitet</p>
                                            <p className="text-xs font-bold italic">{new Date(lead.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-200 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. KONTAKTVY (MODAL/DRAWER) */}
            {selectedLead && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-3xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-serif text-xl italic font-bold">
                                    {selectedLead.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-serif-display font-black italic uppercase tracking-tighter">{selectedLead.name}</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedLead.company}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLead(null)} className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all text-gray-400 hover:text-black"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 grid md:grid-cols-2 gap-12 custom-scrollbar">
                            {/* Left: Info */}
                            <div className="space-y-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-6 italic border-b pb-2">Status & Detaljer</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                            <span className="text-[8px] font-black text-gray-400 uppercase block mb-2">Nuvarande Status</span>
                                            <select 
                                                value={selectedLead.status} 
                                                onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as CRMStatus)}
                                                className="w-full bg-transparent font-bold italic outline-none text-sm cursor-pointer"
                                            >
                                                {['Ny', 'Kontaktad', 'Intresserad', 'Offert', 'Kund', 'Ej aktuell'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                            <span className="text-[8px] font-black text-gray-400 uppercase block mb-2">Värde</span>
                                            <p className="font-bold italic text-sm">{selectedLead.value || 0} kr</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Kontaktuppgifter</h4>
                                    <ContactItem icon={<Mail size={16}/>} label="E-post" value={selectedLead.email || 'Saknas'} />
                                    <ContactItem icon={<Phone size={16}/>} label="Telefon" value={selectedLead.phone || 'Saknas'} />
                                    <ContactItem icon={<Linkedin size={16}/>} label="LinkedIn" value={selectedLead.linkedin || 'Saknas'} />
                                </div>

                                <button 
                                    onClick={() => { setIsMailDrawerOpen(true); }}
                                    className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 hover:scale-105 transition-all"
                                >
                                    <Wand2 size={20} /> Skriv mejl med AI
                                </button>
                            </div>

                            {/* Right: Timeline & Notes */}
                            <div className="space-y-8 flex flex-col h-full">
                                <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 italic border-b pb-2">Historik & Anteckningar</h4>
                                <div className="flex-1 space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-1 h-12 bg-gray-100 rounded-full mt-2"></div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Skapad</p>
                                            <p className="text-sm font-medium italic">Kontakten lades till i CRM-systemet.</p>
                                            <span className="text-[9px] font-bold text-gray-300">{new Date(selectedLead.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-200">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Mina Anteckningar</p>
                                        <textarea 
                                            placeholder="Skriv något här för att komma ihåg till nästa gång..." 
                                            className="w-full bg-transparent resize-none h-32 outline-none text-sm font-medium italic"
                                        />
                                    </div>
                                </div>
                                <button className="w-full py-4 text-gray-300 hover:text-red-500 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Trash2 size={14}/> Ta bort kontakt</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. AI-MEJL SKRIVARE (OVERLAY) */}
            {isMailDrawerOpen && selectedLead && (
                <div className="fixed inset-0 z-[110] flex flex-col md:flex-row animate-fadeIn">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsMailDrawerOpen(false)}></div>
                    <div className="relative w-full md:w-[600px] h-full bg-white dark:bg-gray-950 shadow-3xl ml-auto flex flex-col overflow-hidden animate-slideInRight">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center"><Wand2 size={20}/></div>
                                <div>
                                    <h2 className="text-xl font-serif-display font-black italic uppercase">AI-Mejlskrivare</h2>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Till: {selectedLead.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMailDrawerOpen(false)} className="p-2 text-gray-300 hover:text-black transition-all"><X size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block italic">Välj mejltyp</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Första kontakt', 'Uppföljning', 'Skicka offert', 'Tack', 'Påminnelse', 'Fritt mejl'].map((type) => (
                                        <button 
                                            key={type} 
                                            onClick={() => setMailType(type as MailType)}
                                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${mailType === type ? 'bg-black text-white border-black shadow-xl scale-105' : 'bg-gray-50 border-transparent text-gray-400 hover:border-black/10'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 flex gap-6">
                                <Info size={24} className="text-blue-500 shrink-0" />
                                <p className="text-xs text-blue-800 dark:text-blue-300 font-bold italic leading-relaxed">AI kommer att använda information om ditt företag från Bolagskollen för att göra mejlet mer personligt och relevant.</p>
                            </div>

                            {!generatedMail && !isGeneratingMail ? (
                                <button 
                                    onClick={generateAIMail}
                                    className="w-full py-8 bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 hover:scale-105 transition-all"
                                >
                                    Skapa utkast <Zap size={20} fill="currentColor" />
                                </button>
                            ) : isGeneratingMail ? (
                                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                    <Loader2 className="animate-spin text-black mb-6" size={32} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Analysen sammanställs...</span>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-slideUp">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">AI Genererat Utkast</label>
                                        <button onClick={() => { navigator.clipboard.writeText(generatedMail); alert("Kopierat!"); }} className="text-[9px] font-black uppercase text-blue-500 flex items-center gap-2 hover:underline"><Copy size={12}/> Kopiera</button>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 min-h-[300px] text-sm leading-relaxed font-bold italic text-gray-700 dark:text-gray-300 shadow-inner">
                                        <textarea 
                                            value={generatedMail}
                                            onChange={(e) => setGeneratedMail(e.target.value)}
                                            className="w-full bg-transparent border-none outline-none min-h-[300px] resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { alert("Skickat (simulerat)!"); setIsMailDrawerOpen(false); }} className="flex-1 py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 active:scale-95"><Send size={18}/> Skicka mejl</button>
                                        <button onClick={generateAIMail} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] text-gray-400 hover:text-black transition-all shadow-md"><RefreshCw size={20}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. BOLAGSKOLLEN (SIDE PANEL) */}
            {isIntelligenceOpen && (
                <div className="fixed inset-0 z-[110] flex animate-fadeIn">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsIntelligenceOpen(false)}></div>
                    <div className="relative w-full max-w-4xl h-full bg-white dark:bg-gray-950 shadow-3xl flex flex-col overflow-hidden animate-slideInRight">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center"><Zap size={20} fill="currentColor" /></div>
                                <div>
                                    <h2 className="text-xl font-serif-display font-black italic uppercase">Bolagskollen</h2>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Research & Insikter</p>
                                </div>
                            </div>
                            <button onClick={() => setIsIntelligenceOpen(false)} className="p-2 text-gray-300 hover:text-black transition-all"><X size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
                            <div className="bg-black text-white p-12 rounded-[4rem] text-center relative overflow-hidden group">
                                <div className="relative z-10 space-y-8">
                                    <h3 className="text-4xl font-serif-display italic tracking-tighter uppercase leading-none">Analysera ett företag</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Klistra in en webbadress för att hämta all info du behöver för säljsamtalet</p>
                                    <div className="max-w-xl mx-auto flex flex-col md:flex-row gap-3 bg-white/10 p-3 rounded-[2.5rem] backdrop-blur-md">
                                        <input 
                                            value={reportUrl} 
                                            onChange={e => setReportUrl(e.target.value)} 
                                            placeholder="t.ex. apple.se..." 
                                            className="flex-1 bg-transparent px-6 py-4 text-xl outline-none placeholder:text-white/20 font-bold italic" 
                                        />
                                        <button 
                                            onClick={generateReport} 
                                            disabled={!reportUrl || isGeneratingReport}
                                            className="bg-white text-black px-10 py-4 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                                        >
                                            {isGeneratingReport ? <Loader2 className="animate-spin" size={20} /> : "Analysera"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {reports.length > 0 && (
                                <div className="space-y-6 pb-20">
                                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic border-b pb-2">Tidigare Analyser</h4>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {reports.map(r => (
                                            <div key={r.id} className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all">
                                                <div>
                                                    <h5 className="text-2xl font-serif-display font-black italic uppercase mb-2 truncate">{r.title}</h5>
                                                    <div className="flex gap-2 mb-6">
                                                        <span className="text-[8px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{r.reportData.summary.employees} anställda</span>
                                                        <span className="text-[8px] font-black uppercase text-green-500 bg-green-50 px-2 py-1 rounded-md">V. {r.reportData.summary.revenue}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                                    <span className="text-[9px] font-bold text-gray-300">{new Date(r.created_at).toLocaleDateString()}</span>
                                                    <button onClick={() => { setActiveReport(r); setIsFullScreenReport(true); }} className="p-3 bg-black text-white rounded-xl hover:scale-110 active:scale-90 transition-all shadow-lg"><Eye size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FULLSCREEN REPORT MODAL (SAME AS CRM VIEW) */}
            {isFullScreenReport && activeReport && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-fadeIn">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-serif text-2xl italic font-bold">A</div>
                            <h2 className="text-2xl font-serif-display font-black italic uppercase tracking-tighter leading-none">Bolagsanalys: {activeReport.title}</h2>
                        </div>
                        <button onClick={() => setIsFullScreenReport(false)} className="p-4 bg-black text-white rounded-full hover:scale-110 active:scale-90 transition-all shadow-2xl"><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 md:p-32 custom-scrollbar">
                        <div className="max-w-4xl mx-auto space-y-24">
                            <div className="border-b-[16px] border-black pb-16 pt-8">
                                <h1 className="text-7xl md:text-[10rem] font-serif-display font-black uppercase italic tracking-tighter leading-[0.8] mb-12">BOLAGS<br/>DOSSIER</h1>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                                    <div>
                                        <p className="text-4xl font-bold uppercase tracking-tight mb-2">{activeReport.reportData.meta.companyName}</p>
                                        <p className="text-lg font-mono text-gray-400">{activeReport.reportData.meta.website}</p>
                                    </div>
                                    <p className="text-2xl font-mono font-bold">{activeReport.reportData.meta.generatedDate}</p>
                                </div>
                            </div>
                            <div className="prose prose-2xl max-w-none">
                                {activeReport.reportData.fullMarkdown.split('\n').map((line, i) => (
                                    <p key={i} className="text-2xl leading-[1.7] text-gray-800 font-medium italic mb-10 border-l-2 border-gray-100 pl-8">{line}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. LÄGG TILL MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-lg rounded-[2.5rem] shadow-3xl p-10 relative border border-gray-100 dark:border-gray-800">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-50 rounded-full text-gray-300 hover:text-black transition-all"><X size={24} /></button>
                        <h2 className="text-3xl font-serif-display italic font-bold mb-10">Ny Kontakt</h2>
                        <form onSubmit={handleAddLead} className="space-y-6">
                            <SimpleInput name="name" label="Fullständigt Namn *" required />
                            <SimpleInput name="company" label="Företag" />
                            <SimpleInput name="email" label="E-postadress" type="email" />
                            <SimpleInput name="value" label="Uppskattat Värde (kr)" type="number" />
                            <button className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-6">Lägg till kontakt</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon, active, onClick }: { label: string, value: string | number, icon: any, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`p-8 rounded-[2.5rem] border transition-all text-left flex flex-col justify-between h-44 shadow-sm group ${active ? 'bg-black text-white border-black scale-105 shadow-2xl' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-xl'}`}
    >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-black group-hover:text-white'}`}>
            {icon}
        </div>
        <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${active ? 'text-white/40' : 'text-gray-300'}`}>{label}</p>
            <p className="text-3xl font-serif-display font-black italic tracking-tighter leading-none">{value}</p>
        </div>
    </button>
);

const ContactItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-black transition-all">{icon}</div>
        <div className="min-w-0">
            <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            <span className="block text-sm font-bold italic truncate text-gray-900 dark:text-white">{value}</span>
        </div>
    </div>
);

const SimpleInput = ({ label, name, type = "text", required = false }: { label: string, name: string, type?: string, required?: boolean }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block ml-2">{label}</label>
        <input 
            name={name}
            type={type}
            required={required}
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent p-5 rounded-[1.5rem] focus:bg-white dark:focus:bg-gray-900 focus:border-black outline-none font-bold italic transition-all dark:text-white"
        />
    </div>
);

const getStatusColor = (status: CRMStatus) => {
    switch (status) {
        case 'Ny': return 'bg-blue-50 text-blue-500';
        case 'Kontaktad': return 'bg-orange-50 text-orange-500';
        case 'Intresserad': return 'bg-purple-50 text-purple-500';
        case 'Offert': return 'bg-yellow-50 text-yellow-500';
        case 'Kund': return 'bg-green-50 text-green-500';
        case 'Ej aktuell': return 'bg-gray-50 text-gray-500';
        default: return 'bg-gray-50 text-gray-500';
    }
};

export default CRM;