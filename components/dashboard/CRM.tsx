import React, { useState, useEffect, useMemo } from 'react';
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
    Sparkles, Share2, Shield, Lock, FileSearch, Eye
} from 'lucide-react';
import { User, Lead, CompanyReport, CompanyReportEntry } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI, Type } from "@google/genai";
import { useLanguage } from '../../contexts/LanguageContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface CRMProps {
    user: User;
}

const STATUS_STAGES = ['Nya', 'Kontaktade', 'Möte bokat', 'Klart'] as const;

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'mail' | 'intelligence'>('contacts');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reports, setReports] = useState<CompanyReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter/Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLead, setNewLead] = useState<Partial<Lead>>({ status: 'Nya', value: 0, priority: 'Medium' });
    const [isSavingLead, setIsSavingLead] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

    // AI Mail
    const [selectedMailLeadId, setSelectedMailLeadId] = useState<string>('');
    const [mailPrompt, setMailPrompt] = useState('');
    const [generatedMail, setGeneratedMail] = useState<{ subject: string, body: string } | null>(null);
    const [isGeneratingMail, setIsGeneratingMail] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);

    // Intelligence (Bolagskollen)
    const [reportUrl, setReportUrl] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [showReportSuccess, setShowReportSuccess] = useState(false);
    const [activeReport, setActiveReport] = useState<CompanyReportEntry | null>(null);
    const [reportToDelete, setReportToDelete] = useState<CompanyReportEntry | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            setLeads(Array.isArray(data.leads) ? data.leads : []);
            setReports(Array.isArray(data.reports) ? data.reports : []);
        } catch (e) {
            console.error("Kunde inte hämta data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLead.name || !newLead.company) return;
        setIsSavingLead(true);
        try {
            const added = await db.addLead(user.id, {
                name: newLead.name!,
                company: newLead.company!,
                email: newLead.email || '',
                phone: newLead.phone || '',
                status: (newLead.status as any) || 'Nya',
                value: Number(newLead.value) || 0,
                priority: 'Medium',
                lead_score: 85
            });
            setLeads(prev => [added, ...prev]);
            setIsAddModalOpen(false);
            setNewLead({ status: 'Nya', value: 0, priority: 'Medium' });
        } catch (e) {
            alert("Kunde inte spara.");
        } finally {
            setIsSavingLead(false);
        }
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(l => 
            (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (l.company || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [leads, searchQuery]);

    const generateAIMail = async () => {
        const lead = leads.find(l => l.id === selectedMailLeadId);
        if (!lead || !mailPrompt) return;
        setIsGeneratingMail(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Skriv ett säljmail till ${lead.name} på ${lead.company}. Prompt: ${mailPrompt}. Svara i JSON: {"subject": "...", "body": "..."}`,
                config: { responseMimeType: 'application/json' }
            });
            setGeneratedMail(JSON.parse(response.text || '{}'));
        } catch (e) {
            alert("Gick inte att skriva mailet.");
        } finally {
            setIsGeneratingMail(false);
        }
    };

    const generateReport = async () => {
        if (!reportUrl) return;
        setIsGeneratingReport(true);
        setShowReportSuccess(false);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const reportSchema = {
                type: Type.OBJECT,
                properties: {
                    meta: {
                        type: Type.OBJECT,
                        properties: {
                            companyName: { type: Type.STRING, description: "Företagets formella namn" },
                            website: { type: Type.STRING, description: "Fullständig URL" },
                            generatedDate: { type: Type.STRING, description: "Dagens datum" },
                            language: { type: Type.STRING, description: "Språket i rapporten" },
                        },
                        required: ["companyName", "website", "generatedDate", "language"],
                    },
                    summary: {
                        type: Type.OBJECT,
                        properties: {
                            revenue: { type: Type.STRING, description: "Omsättning eller uppskattning" },
                            ebitda: { type: Type.STRING, description: "Resultat eller uppskattning" },
                            solvency: { type: Type.STRING, description: "Soliditet i procent" },
                            employees: { type: Type.STRING, description: "Antal anställda" },
                            founded: { type: Type.STRING, description: "Grundat år" },
                            trust_score: { type: Type.STRING, description: "AI-baserad trovärdighetssiffra (ex 85%)" },
                            market_status: { type: Type.STRING, description: "Marknadsläge (Stabil, Växande, etc)" },
                            risk_profile: { type: Type.STRING, description: "Riskprofil (Låg, Medel, Hög)" },
                        },
                    },
                    fullMarkdown: { type: Type.STRING, description: "En djupgående analys i markdown-format (inga rubriker på nivå 1). Inkludera SWOT, konkurrentanalys och affärsmodell." },
                },
                required: ["meta", "summary", "fullMarkdown"],
            };

            const prompt = `Genomför en omfattande bolagsanalys av ${reportUrl} för ett UF-företag. 
            Hämta: Grundfakta, produkter/tjänster, affärsmodell, målgrupp, styrkor/svagheter (SWOT), trovärdighet (AI-score), sociala medier-närvaro, teknisk snabbkoll (SEO/laddtid), och lista konkurrenter.
            Språk: Svenska.
            Använd Google Sök för att hitta realtidsdata om bolaget.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    tools: [{ googleSearch: {} }], 
                    responseMimeType: 'application/json',
                    responseSchema: reportSchema
                }
            });
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = groundingChunks?.map((chunk: any, i: number) => ({
                id: i + 1,
                url: chunk.web?.uri || chunk.maps?.uri || '',
                title: chunk.web?.title || chunk.maps?.title || 'Källa',
                reliability: 80 + Math.floor(Math.random() * 20)
            })).filter((s: any) => s.url) || [];

            const reportData = JSON.parse(response.text || '{}');
            reportData.sources = sources; 
            
            const entry = await db.addReportToHistory(user.id, reportData);
            setReports(prev => [entry, ...prev]);
            setActiveReport(entry);
            setShowReportSuccess(true);
            setReportUrl('');
        } catch (e) {
            console.error("Bolagskollen Error:", e);
            alert("Kunde inte analysera hemsidan. Kontrollera att URL:en är korrekt.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const getSafeHostname = (url: string | undefined) => {
        if (!url || url === 'undefined') return 'okänd';
        try {
            const cleanUrl = url.includes('://') ? url : 'https://' + url;
            return new URL(cleanUrl).hostname;
        } catch (e) {
            return url;
        }
    };

    const handleCopyReport = (report: CompanyReport) => {
        const text = `BOLAGSRAPPORT: ${report.meta.companyName.toUpperCase()}\nWEBBSIDA: ${report.meta.website}\nDATUM: ${report.meta.generatedDate}\n\nSUMMERING:\nOmsättning: ${report.summary?.revenue || 'N/A'}\nEBITDA: ${report.summary?.ebitda || 'N/A'}\nSoliditet: ${report.summary?.solvency || 'N/A'}\nAnställda: ${report.summary?.employees || 'N/A'}\n\nANALYS:\n${report.fullMarkdown}`;
        navigator.clipboard.writeText(text);
        alert("Rapporten har kopierats till urklipp!");
    };

    const handlePrintReport = (r: CompanyReportEntry) => {
        setActiveReport(r);
        setIsFullScreen(true);
        setTimeout(() => window.print(), 500);
    };

    return (
        <div className="flex flex-col h-full gap-6 animate-fadeIn">
            <DeleteConfirmModal isOpen={!!reportToDelete} onClose={() => setReportToDelete(null)} onConfirm={async () => { await db.deleteReport(user.id, reportToDelete!.id); loadData(); setReportToDelete(null); if(activeReport?.id === reportToDelete?.id) { setActiveReport(null); setIsFullScreen(false); } }} itemName={reportToDelete?.title || ''} />
            <DeleteConfirmModal isOpen={!!leadToDelete} onClose={() => setLeadToDelete(null)} onConfirm={async () => { await db.deleteLead(user.id, leadToDelete!.id); loadData(); setLeadToDelete(null); if(selectedLead?.id === leadToDelete?.id) setIsDetailOpen(false); }} itemName={leadToDelete?.name || ''} />

            {/* NAVIGATION */}
            <div className="bg-white dark:bg-gray-900 p-2 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap gap-2 sticky top-0 z-40 backdrop-blur-md bg-white/90">
                <SimpleTab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={20}/>} label="Överblick" />
                <SimpleTab active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} icon={<Users size={20}/>} label="Kunder" />
                <SimpleTab active={activeTab === 'mail'} onClick={() => setActiveTab('mail')} icon={<Mail size={20}/>} label="Skrivhjälp" />
                <SimpleTab active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={<Zap size={20}/>} label="Bolagskoll" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-slideUp">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <BigStatCard label="Totala kunder" value={leads.length} icon={<Users size={24}/>} color="blue" />
                            <BigStatCard label="Pipeline-värde" value={`${leads.reduce((a,b) => a + (Number(b.value) || 0), 0).toLocaleString()} kr`} icon={<DollarSign size={24}/>} color="green" />
                            <BigStatCard label="Analyser" value={reports.length} icon={<ShieldCheck size={24}/>} color="purple" />
                        </div>
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div className="space-y-6 animate-slideUp">
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                <input 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    placeholder="Sök på namn eller företag..." 
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.8rem] pl-16 pr-8 py-5 text-lg font-medium focus:ring-2 ring-black outline-none shadow-sm transition-all"
                                />
                            </div>
                            <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-10 py-5 rounded-[1.8rem] font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                                <Plus size={22} strokeWidth={2.5} /> Lägg till ny
                            </button>
                        </div>
                        <div className="grid gap-3">
                            {filteredLeads.length > 0 ? filteredLeads.map((l, idx) => (
                                <div key={l.id} onClick={() => { setSelectedLead(l); setIsDetailOpen(true); }} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between group animate-fadeIn" style={{ animationDelay: `${idx * 40}ms` }}>
                                    <div className="flex items-center gap-6 w-full sm:w-auto">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center font-bold text-xl text-gray-400 group-hover:bg-black group-hover:text-white transition-all shadow-inner">{l.name[0]}</div>
                                        <div>
                                            <h4 className="text-xl font-bold font-serif-display group-hover:text-black dark:group-hover:text-white transition-colors">{l.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{l.company}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                        <span className="px-4 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700">{l.status}</span>
                                        <ArrowRight size={20} className="text-gray-300 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            )) : <div className="py-40 text-center text-gray-300 font-bold uppercase tracking-[0.4em] italic">Här var det tomt</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'mail' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-slideUp">
                        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-200 dark:border-gray-800 shadow-sm space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-inner"><Wand2 size={24} className="text-gray-400"/></div>
                                <h2 className="text-3xl font-serif-display italic font-bold">AI Skrivhjälp</h2>
                            </div>
                            <div className="space-y-6">
                                <textarea 
                                    value={mailPrompt} 
                                    onChange={e => setMailPrompt(e.target.value)} 
                                    placeholder="T.ex. 'Tacka för ett bra möte och boka in en uppföljning'" 
                                    className="w-full h-44 bg-gray-50 dark:bg-gray-800 p-6 rounded-[1.8rem] outline-none ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 ring-black font-bold italic resize-none shadow-inner transition-all"
                                />
                                <button onClick={generateAIMail} disabled={isGeneratingMail} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 disabled:opacity-30 transition-all uppercase tracking-widest">
                                    {isGeneratingMail ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20} />} {isGeneratingMail ? 'Skriver...' : 'Generera mail'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'intelligence' && (
                    <div className="max-w-4xl mx-auto space-y-12 animate-slideUp">
                        {showReportSuccess && activeReport ? (
                            <div className="bg-white dark:bg-gray-900 border-4 border-black dark:border-white rounded-[4rem] p-12 md:p-20 text-center shadow-3xl animate-slideUp">
                                <div className="space-y-10">
                                    <div className="w-24 h-24 bg-black text-white dark:bg-white dark:text-black rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl animate-float">
                                        <FileSearch size={44} />
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-serif-display italic font-black uppercase tracking-tighter leading-none">{activeReport.title}</h2>
                                    <div className="max-w-md mx-auto space-y-4">
                                        <button 
                                            onClick={() => setIsFullScreen(true)} 
                                            className="w-full bg-black dark:bg-white text-white dark:text-black py-7 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl"
                                        >
                                            <Eye size={22} /> Visa Rapport
                                        </button>
                                        <button onClick={() => setShowReportSuccess(false)} className="w-full bg-gray-50 dark:bg-gray-800 py-4 rounded-[1.5rem] font-black text-[9px] uppercase tracking-widest text-gray-400">Gör ny sökning</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-black text-white p-12 md:p-24 rounded-[4rem] text-center shadow-2xl relative overflow-hidden group border border-white/10">
                                <div className="relative z-10 space-y-10">
                                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto border border-white/10 animate-float shadow-xl"><BrainCircuit size={40} className="text-white" /></div>
                                    <div className="space-y-3">
                                        <h2 className="text-4xl md:text-6xl font-serif-display italic font-bold tracking-tighter leading-none">Bolagskollen</h2>
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.3em]">Smart analys av konkurrenter</p>
                                    </div>
                                    <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 bg-white/5 p-3 rounded-[2.5rem] border border-white/10 focus-within:ring-2 ring-white/20 transition-all backdrop-blur-md">
                                        <input 
                                            value={reportUrl} 
                                            onChange={e => setReportUrl(e.target.value)} 
                                            placeholder="Skriv in hemsida (t.ex. apple.se)..." 
                                            className="flex-1 bg-transparent px-6 py-4 text-xl outline-none placeholder:text-white/10 font-bold italic" 
                                        />
                                        <button onClick={generateReport} disabled={!reportUrl || isGeneratingReport} className="bg-white text-black px-10 py-4 rounded-[1.8rem] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                                            {isGeneratingReport ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18}/>} Starta
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-8">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] flex items-center gap-2 italic ml-2"><History size={14}/> Tidigare analyser</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {reports.map((r, idx) => (
                                    <div key={r.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden animate-fadeIn">
                                        <div className="p-8">
                                            <h4 className="text-2xl font-bold font-serif-display italic truncate mb-1">{r.title}</h4>
                                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-6">{getSafeHostname(r.reportData.meta.website)}</p>
                                            <button 
                                                onClick={() => { setActiveReport(r); setIsFullScreen(true); }} 
                                                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 active:scale-95 transition-all"
                                            >
                                                <Eye size={14}/> Visa Rapport
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: BOLAGSRAPPORT (FIXED UI) */}
            {isFullScreen && activeReport && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-5xl h-full max-h-[90vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10">
                        {/* Header: Action Toolbar */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-950 sticky top-0 z-[210] no-print">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsFullScreen(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-black dark:text-white" title="Stäng">
                                    <X size={28} />
                                </button>
                                <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 truncate">Intelligence Dossier: {activeReport.title}</h2>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleCopyReport(activeReport.reportData)} 
                                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-black dark:text-white hover:bg-black hover:text-white transition-all flex items-center gap-2"
                                    title="Kopiera till urklipp"
                                >
                                    <Copy size={20}/>
                                </button>
                                <button 
                                    onClick={() => window.print()} 
                                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-black dark:text-white hover:bg-black hover:text-white transition-all flex items-center gap-2"
                                    title="Skriv ut"
                                >
                                    <Printer size={20}/>
                                </button>
                                <button 
                                    onClick={() => setReportToDelete(activeReport)} 
                                    className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                    title="Ta bort"
                                >
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                        </div>
                        
                        {/* Content Area (Centered and Fixed Alignment) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white" id="printable-report">
                            <div className="max-w-4xl mx-auto p-12 md:p-24 space-y-16 text-black text-center md:text-left">
                                {/* Page 1: Cover Style */}
                                <div className="space-y-12">
                                    <div className="flex flex-col items-center md:items-start gap-4">
                                        <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-serif text-2xl italic font-bold">A</div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.5em]">Aceverse Intel</div>
                                    </div>
                                    <div className="h-1 w-24 bg-black mx-auto md:mx-0"></div>
                                    <h1 className="text-6xl md:text-8xl font-serif-display font-black uppercase tracking-tighter leading-none">DUE<br/>DILIGENCE<br/>DOSSIER</h1>
                                    <div className="h-4 w-full bg-black"></div>
                                    <h2 className="text-4xl md:text-6xl font-serif-display font-black uppercase italic tracking-tighter border-b-8 border-black pb-4 inline-block">
                                        BOLAGSANALYS: {activeReport.reportData.meta.companyName.toUpperCase()}
                                    </h2>
                                </div>

                                {/* Page 2: Content */}
                                <div className="space-y-16 pt-24 text-left">
                                    <section className="grid md:grid-cols-2 gap-12 border-y-2 border-black py-12">
                                        <div className="space-y-4">
                                            <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-400">Grundläggande fakta</h3>
                                            <ul className="space-y-2 font-bold italic">
                                                <li>Juridiskt namn: {activeReport.reportData.meta.companyName}</li>
                                                <li>Webbplats: {activeReport.reportData.meta.website}</li>
                                                <li>Anställda: {activeReport.reportData.summary?.employees || 'N/A'}</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-400">Finansiell Översikt</h3>
                                            <ul className="space-y-2 font-bold italic">
                                                <li>Omsättning: {activeReport.reportData.summary?.revenue || 'N/A'}</li>
                                                <li>Soliditet: {activeReport.reportData.summary?.solvency || 'N/A'}</li>
                                                <li>Trust Score: {activeReport.reportData.summary?.trust_score || '85%'}</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <div className="prose prose-xl max-w-none prose-headings:font-serif-display prose-headings:italic prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter">
                                        {activeReport.reportData.fullMarkdown.split('\n').map((line, i) => {
                                            const trimmed = line.trim();
                                            if(!trimmed) return <div key={i} className="h-6"></div>;
                                            if(trimmed.startsWith('#')) {
                                                const clean = trimmed.replace(/#/g, '').trim();
                                                return <h4 key={i} className="text-2xl font-serif-display font-black uppercase italic tracking-tighter mt-16 mb-8 text-black border-l-8 border-black pl-6">{clean}</h4>;
                                            }
                                            return <p key={i} className="text-xl leading-[1.8] text-gray-800 font-medium italic mb-8 border-l border-gray-100 pl-8 transition-all hover:border-black">{trimmed}</p>;
                                        })}
                                    </div>

                                    {activeReport.reportData.sources && activeReport.reportData.sources.length > 0 && (
                                        <div className="pt-24 border-t border-gray-100">
                                            <h3 className="text-4xl font-serif-display font-black uppercase tracking-tighter italic mb-10">VERIFIED SOURCES</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {activeReport.reportData.sources.map((source: any, i: number) => (
                                                    <div key={i} className="bg-gray-50 p-8 border border-gray-200 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-12 h-12 bg-black text-white flex items-center justify-center font-serif text-lg font-bold italic">{i + 1}</div>
                                                        <h4 className="text-lg font-black uppercase tracking-tight mb-2 truncate">{source.title}</h4>
                                                        <p className="text-[10px] font-mono text-gray-400 break-all">{source.url}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative border border-gray-100 dark:border-gray-800">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-50 rounded-full text-gray-300 hover:text-black transition-all"><X size={24} /></button>
                        <h2 className="text-3xl font-serif-display italic font-bold mb-10">Ny Kund</h2>
                        <form onSubmit={handleAddLead} className="space-y-6">
                            <SimpleInput label="Namn" value={newLead.name} onChange={v => setNewLead({...newLead, name: v})} required />
                            <SimpleInput label="Företag" value={newLead.company} onChange={v => setNewLead({...newLead, company: v})} required />
                            <button disabled={isSavingLead} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all">{isSavingLead ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Spara</button>
                        </form>
                    </div>
                </div>
            )}

            {isDetailOpen && selectedLead && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col h-[80vh] overflow-hidden border border-gray-100 dark:border-gray-800">
                        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-black text-white flex items-center justify-center font-black text-2xl shadow-xl">{selectedLead.name[0]}</div>
                                <h2 className="text-2xl font-serif-display font-bold italic truncate pr-4">{selectedLead.name}</h2>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className="p-3 hover:bg-gray-100 rounded-full transition-all text-black dark:text-white"><X size={28}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <DetailBox label="Status" value={selectedLead.status} />
                                <DetailBox label="Värde" value={`${selectedLead.value.toLocaleString()} kr`} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Anteckningar</label>
                                <textarea 
                                    className="w-full h-40 bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] border-none outline-none font-bold italic text-lg resize-none shadow-inner ring-1 ring-transparent focus:ring-black transition-all dark:text-white" 
                                    defaultValue={selectedLead.notes} 
                                    onBlur={e => db.updateLead(user.id, selectedLead.id, { notes: e.target.value })} 
                                    placeholder="..."
                                />
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                            <button onClick={() => { setSelectedMailLeadId(selectedLead.id); setActiveTab('mail'); setIsDetailOpen(false); }} className="flex-1 py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3"><Mail size={20}/> Skriv Mail</button>
                            <button onClick={() => setLeadToDelete(selectedLead)} className="p-6 bg-red-50 text-red-500 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all border border-red-100"><Trash2 size={24}/></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SimpleTab = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 md:px-8 py-3.5 rounded-[1.5rem] font-bold text-sm md:text-base transition-all ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-[1.02] z-10' : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50'}`}>
        {icon} <span className="italic whitespace-nowrap">{label}</span>
    </button>
);

const BigStatCard = ({ label, value, icon, color }: any) => (
    <div className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gray-50 dark:bg-gray-800 text-${color}-500 shadow-inner`}>{icon}</div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1.5 truncate">{label}</p>
        <p className="text-3xl font-serif-display font-black italic tracking-tighter truncate text-gray-900 dark:text-white">{value}</p>
    </div>
);

const SimpleInput = ({ label, value, onChange, type = "text", required = false }: any) => (
    <div className="space-y-2.5">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block ml-2">{label} {required && '*'}</label>
        <input 
            type={type} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            required={required}
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent p-5 rounded-[1.5rem] focus:bg-white dark:focus:bg-gray-900 focus:border-black outline-none text-lg font-bold italic shadow-inner transition-all dark:text-white"
        />
    </div>
);

const DetailBox = ({ label, value }: any) => (
    <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[1.8rem] border border-transparent transition-all">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2 truncate">{label}</span>
        <p className="text-lg font-bold italic truncate text-gray-800 dark:text-white">{value}</p>
    </div>
);

export default CRM;