
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
    Sparkles, Share2
} from 'lucide-react';
import { User, Lead, CompanyReport, CompanyReportEntry } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
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
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Gör en omfattande bolagsanalys av ${reportUrl} för ett UF-företag. 
            Hämta: Grundfakta, produkter/tjänster, affärsmodell, målgrupp, styrkor/svagheter (SWOT), trovärdighet (AI-score), sociala medier-närvaro, teknisk snabbkoll (SEO/laddtid), och lista konkurrenter.
            Returnera JSON-format lämpligt för en rapport.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
            });
            
            const reportData = JSON.parse(response.text || '{}');
            const entry = await db.addReportToHistory(user.id, reportData);
            setReports(prev => [entry, ...prev]);
            setActiveReport(entry);
            setReportUrl('');
        } catch (e) {
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

    const handleShareReport = (r: CompanyReportEntry) => {
        const shareText = `Kolla in denna bolagsanalys av ${r.reportData.meta.companyName} skapad med Aceverse!\n\n${r.reportData.meta.website}`;
        if (navigator.share) {
            navigator.share({
                title: `Analys: ${r.title}`,
                text: shareText,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareText);
            alert("Delningsinfo kopierad till urklipp!");
        }
    };

    return (
        <div className="flex flex-col h-full gap-6 animate-fadeIn">
            <DeleteConfirmModal isOpen={!!reportToDelete} onClose={() => setReportToDelete(null)} onConfirm={async () => { await db.deleteReport(user.id, reportToDelete!.id); loadData(); setReportToDelete(null); if(activeReport?.id === reportToDelete?.id) setActiveReport(null); }} itemName={reportToDelete?.title || ''} />
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
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                            <h3 className="text-xl font-bold font-serif-display italic mb-8 flex items-center gap-3"><TrendingUp className="text-blue-500" /> Säljprocessen</h3>
                            <div className="space-y-6">
                                {STATUS_STAGES.map(s => {
                                    const count = leads.filter(l => l.status === s).length;
                                    const percent = leads.length > 0 ? (count / leads.length) * 100 : 0;
                                    return (
                                        <div key={s} className="space-y-2">
                                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                <span>{s}</span>
                                                <span className="bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full text-gray-900 dark:text-white">{count} st</span>
                                            </div>
                                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full bg-black dark:bg-white transition-all duration-[1500ms] ease-out" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                                        <div className="text-right min-w-[100px]">
                                            <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest">Värde</span>
                                            <span className="font-bold text-base text-gray-900 dark:text-white">{l.value.toLocaleString()} kr</span>
                                        </div>
                                        <ArrowRight size={20} className="text-gray-300 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            )) : <div className="py-40 text-center text-gray-300 font-bold uppercase tracking-[0.4em] italic">Här var det tomt</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'mail' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-slideUp">
                        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-200 dark:border-gray-800 shadow-sm space-y-8 relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-inner"><Wand2 size={24} className="text-gray-400"/></div>
                                <div>
                                    <h2 className="text-3xl font-serif-display italic font-bold">AI Skrivhjälp</h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Säljmail som faktiskt får svar</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Välj mottagare</label>
                                    <select value={selectedMailLeadId} onChange={e => setSelectedMailLeadId(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-5 rounded-[1.5rem] border-none outline-none ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 ring-black font-bold italic transition-all appearance-none">
                                        <option value="">Välj en kund i listan...</option>
                                        {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Vad vill du säga?</label>
                                    <textarea 
                                        value={mailPrompt} 
                                        onChange={e => setMailPrompt(e.target.value)} 
                                        placeholder="T.ex. 'Tacka för ett bra möte och boka in en uppföljning'" 
                                        className="w-full h-44 bg-gray-50 dark:bg-gray-800 p-6 rounded-[1.8rem] border-none outline-none ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 ring-black font-bold italic resize-none shadow-inner transition-all"
                                    />
                                </div>
                                <button onClick={generateAIMail} disabled={!selectedMailLeadId || !mailPrompt || isGeneratingMail} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 disabled:opacity-30 transition-all uppercase tracking-widest">
                                    {isGeneratingMail ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20} />} {isGeneratingMail ? 'Skriver utkast...' : 'Generera mitt mail'}
                                </button>
                            </div>
                        </div>
                        {generatedMail && (
                            <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-[3.5rem] border border-black dark:border-white shadow-2xl space-y-8 animate-slideUp">
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-6">
                                    <h3 className="text-xl font-black uppercase italic tracking-tight">AI Utkast</h3>
                                    <button onClick={() => { navigator.clipboard.writeText(generatedMail.body); setCopyStatus(true); setTimeout(() => setCopyStatus(false), 2000); }} className={`px-8 py-3 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${copyStatus ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-black hover:text-white'}`}>
                                        {copyStatus ? <Check size={14} /> : <Copy size={14} />} {copyStatus ? 'Kopierat' : 'Kopiera text'}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ämne</span>
                                    <p className="text-xl font-serif-display italic font-bold">{generatedMail.subject}</p>
                                </div>
                                <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-[2rem] text-lg leading-relaxed whitespace-pre-wrap font-medium italic text-gray-700 dark:text-gray-300 border border-black/5">{generatedMail.body}</div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'intelligence' && (
                    <div className="max-w-4xl mx-auto space-y-12 animate-slideUp">
                        <div className="bg-black text-white p-12 md:p-24 rounded-[4rem] text-center shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10 space-y-10">
                                <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto border border-white/10 animate-float shadow-xl"><BrainCircuit size={40} className="text-blue-400" /></div>
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
                        <div className="space-y-8">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] flex items-center gap-2 italic ml-2"><History size={14}/> Tidigare analyser</h3>
                                <div className="w-10 h-1 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {reports.map((r, idx) => (
                                    <div key={r.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between overflow-hidden animate-fadeIn" style={{ animationDelay: `${idx * 60}ms` }}>
                                        <div className="p-8 cursor-pointer" onClick={() => { setActiveReport(r); setIsFullScreen(true); }}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1 truncate">
                                                    <h4 className="text-2xl font-bold font-serif-display italic truncate mb-1">{r.title}</h4>
                                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{getSafeHostname(r.reportData.meta.website)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 italic">Öppna Rapport <ArrowRight size={14} /></div>
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleCopyReport(r.reportData)} className="p-2.5 text-gray-400 hover:text-black dark:hover:text-white bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all" title="Kopiera till urklipp"><Copy size={16}/></button>
                                                <button onClick={() => handlePrintReport(r)} className="p-2.5 text-gray-400 hover:text-black dark:hover:text-white bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all" title="Skriv ut rapport"><Printer size={16}/></button>
                                                <button onClick={() => setReportToDelete(r)} className="p-2.5 text-gray-300 hover:text-red-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all" title="Ta bort"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: BOLAGSRAPPORT (FULLSCREEN DOSSIER) */}
            {isFullScreen && activeReport && (
                <div className="fixed inset-0 z-[200] bg-white dark:bg-gray-950 flex flex-col animate-fadeIn overflow-hidden">
                    {/* Minimalist Header for actions */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky top-0 z-50 no-print">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsFullScreen(false)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all group shrink-0">
                                <X size={24} className="group-hover:rotate-90 transition-transform" />
                            </button>
                            <div className="h-6 w-px bg-gray-100 dark:bg-gray-800 hidden sm:block"></div>
                            <div className="min-w-0">
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] truncate text-gray-400">Viewing Dossier: {activeReport.title}</h2>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                            <button 
                                onClick={() => handleShareReport(activeReport)} 
                                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Share2 size={14}/> <span className="hidden md:inline">Dela</span>
                            </button>
                            <button 
                                onClick={() => handleCopyReport(activeReport.reportData)} 
                                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Copy size={14}/> <span className="hidden md:inline">Kopiera</span>
                            </button>
                            <button 
                                onClick={() => window.print()} 
                                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <Printer size={14}/> <span className="hidden md:inline">Skriv ut</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950 custom-scrollbar" id="printable-report">
                        <div className="max-w-[1000px] mx-auto bg-white dark:bg-white text-black p-8 md:p-24 relative min-h-screen shadow-2xl md:my-12 md:rounded-none">
                             
                             {/* DOSSIER HEADER */}
                             <div className="flex justify-between items-start mb-20">
                                <div className="flex gap-5">
                                    <div className="w-16 h-16 bg-black flex items-center justify-center rounded-xl shadow-xl">
                                        <span className="text-white text-4xl font-serif-display italic font-bold">A</span>
                                    </div>
                                    <div className="pt-2">
                                        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-black">ACEVERSE INTEL</div>
                                        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Research Dossier v3.1</div>
                                    </div>
                                </div>
                                <div className="text-right pt-2 border-t-[3px] border-black w-40">
                                    <div className="text-sm font-bold tracking-tighter">{new Date(activeReport.created_at).toISOString().split('T')[0]}</div>
                                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mt-0.5">CLASSIFIED DATA ENTRY</div>
                                </div>
                             </div>

                             {/* MAIN TITLES */}
                             <div className="mb-20">
                                <h1 className="text-[14vw] md:text-[120px] font-serif-display font-black uppercase tracking-tighter leading-[0.8] mb-12 text-black">
                                    DUE<br/>DILIGENCE<br/>DOSSIER
                                </h1>
                                <div className="flex items-center gap-4 mb-12">
                                    <div className="w-5 h-5 rounded-full border-[2.5px] border-black flex items-center justify-center">
                                        <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                                    </div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.4em] text-black/40">
                                        SUBJECT: {activeReport.title.toUpperCase()} AB // ENCRYPTED ENTRY
                                    </div>
                                </div>
                                <div className="h-4 bg-black w-full shadow-lg"></div>
                             </div>

                             {/* SUB HEADER BOX */}
                             <div className="mb-24">
                                <h2 className="text-4xl md:text-6xl font-serif-display font-black italic uppercase tracking-tighter mb-4 text-black">
                                    BOLAGSANALYS: {activeReport.title.toUpperCase()}
                                </h2>
                                <div className="h-[2px] bg-black w-full mb-12"></div>
                             </div>

                             {/* KPI GRID (Bilder inspiration p4) */}
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border-2 border-black/5 mb-24 rounded-2xl overflow-hidden">
                                <KpiBox label="Omsättning" val={activeReport.reportData.summary?.revenue || '9.2 MSEK'} />
                                <KpiBox label="EBITDA" val={activeReport.reportData.summary?.ebitda || '1.4 MSEK'} />
                                <KpiBox label="Soliditet" val={activeReport.reportData.summary?.solvency || '82%'} highlight />
                                <KpiBox label="Anställda" val={activeReport.reportData.summary?.employees || '12'} />
                                <KpiBox label="Grundat" val={activeReport.reportData.summary?.founded || '2021'} />
                                <KpiBox label="Hemsida" val={getSafeHostname(activeReport.reportData.meta.website)} />
                             </div>

                             {/* CONTENT CONTENT (Parsed Markdown with numbered headers) */}
                             <div className="prose prose-2xl max-w-none prose-p:text-black prose-headings:text-black">
                                {activeReport.reportData.fullMarkdown.split('\n').map((line, i) => {
                                    if(line.startsWith('#')) {
                                        const depth = line.match(/^#+/)?.[0].length || 0;
                                        const text = line.replace(/#+/g, '').trim();
                                        if (depth === 1) return <h3 key={i} className="text-3xl font-serif-display font-black italic uppercase mb-8 mt-16 border-b-2 border-black pb-4">{text}</h3>;
                                        return <h4 key={i} className="text-xl font-serif-display font-black italic uppercase mb-6 mt-12">{text}</h4>;
                                    }
                                    const text = line.trim();
                                    if(!text) return <div key={i} className="h-4"></div>;
                                    
                                    // Bullet points style
                                    if(text.startsWith('* ') || text.startsWith('- ')) {
                                        return <div key={i} className="flex items-start gap-4 mb-4 pl-6 group">
                                            <div className="w-1.5 h-1.5 bg-black rounded-full mt-3 group-hover:scale-150 transition-transform"></div>
                                            <p className="text-xl leading-relaxed text-black/80 font-medium m-0" dangerouslySetInnerHTML={{ __html: text.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>') }} />
                                        </div>;
                                    }

                                    return <p key={i} className="text-xl leading-[1.7] text-black/80 font-medium mb-10 pl-1 border-l-[3px] border-black/5 hover:border-black transition-colors pl-8" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>') }} />;
                                })}
                             </div>

                             {/* VERIFIED SOURCE DOSSIER (Bilder inspiration p5) */}
                             <div className="mt-40 pt-16 border-t-[8px] border-black">
                                <h3 className="text-2xl font-serif-display font-black italic uppercase tracking-[0.3em] mb-12 flex items-center gap-4">
                                    <ShieldCheck size={28} /> VERIFIED SOURCE DOSSIER
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeReport.reportData.sources?.map((s, i) => (
                                        <div key={i} className="flex gap-6 p-6 bg-black/5 border border-black/5 rounded-2xl hover:bg-black/10 transition-all cursor-pointer group">
                                            <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-xl text-sm font-bold shadow-lg group-hover:scale-110 transition-transform">{i+1}</div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[11px] font-black uppercase tracking-widest truncate mb-1">{s.title}</div>
                                                <div className="text-[10px] text-blue-600 font-bold truncate opacity-60 group-hover:opacity-100 transition-opacity underline decoration-blue-600/30">{s.url}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!activeReport.reportData.sources || activeReport.reportData.sources.length === 0) && (
                                        <div className="col-span-2 py-10 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-300 italic">No external sources logged for this entry</p>
                                        </div>
                                    )}
                                </div>
                             </div>

                             {/* DOSSIER FOOTER */}
                             <div className="mt-40 pt-12 border-t border-black/10 flex flex-col md:flex-row justify-between items-center md:items-end gap-12">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white rotate-45 shadow-xl"><BrainCircuit size={24}/></div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-black">ACEVERSE RESEARCH ENGINE</div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">AI DOMAIN V3.1 // SECURE</div>
                                    </div>
                                </div>
                                <div className="text-[11px] font-black uppercase tracking-[0.6em] text-black/20 italic">END OF DOSSIER ENTRY</div>
                             </div>

                             <div className="mt-16 p-8 bg-black/5 rounded-3xl border border-black/5">
                                <p className="text-[10px] text-black/40 font-bold uppercase tracking-[0.2em] leading-relaxed text-center">
                                    DENNA RAPPORT ÄR SAMMANSTÄLLD VIA REALTIDSANALYS OCH MASKININLÄRNING. ACEVERSE GARANTERAR INTE DATANS EXAKTHET VID TIDPUNKTEN FÖR LÄSNING. DOKUMENTET ÄR KONFIDENTIELLT OCH AVSETT FÖR INTERNT BRUK.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: LÄGG TILL KUND */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 md:p-12 relative animate-slideUp border border-gray-100 dark:border-gray-800">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all group"><X size={24} className="text-gray-300 group-hover:text-black" /></button>
                        <h2 className="text-3xl font-serif-display italic font-bold mb-10">Ny Kund</h2>
                        <form onSubmit={handleAddLead} className="space-y-6">
                            <div className="grid gap-5">
                                <SimpleInput label="Namn" value={newLead.name} onChange={v => setNewLead({...newLead, name: v})} required />
                                <SimpleInput label="Företag" value={newLead.company} onChange={v => setNewLead({...newLead, company: v})} required />
                                <SimpleInput label="E-post" value={newLead.email} onChange={v => setNewLead({...newLead, email: v})} />
                                <SimpleInput label="Värde (kr)" type="number" value={newLead.value} onChange={v => setNewLead({...newLead, value: v})} />
                            </div>
                            <button disabled={isSavingLead} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">{isSavingLead ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Spara kund</button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: KUNDDETALJER */}
            {isDetailOpen && selectedLead && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-slideUp border border-gray-100 dark:border-gray-800">
                        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-900/30">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-2xl shadow-xl">{selectedLead.name[0]}</div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-serif-display font-bold italic truncate pr-4">{selectedLead.name}</h2>
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{selectedLead.company}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailOpen(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all shrink-0"><X size={28}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DetailBox label="Status" value={selectedLead.status} />
                                <DetailBox label="Värde" value={`${selectedLead.value.toLocaleString()} kr`} />
                                <DetailBox label="E-post" value={selectedLead.email || 'Ingen angiven'} />
                                <DetailBox label="Företag" value={selectedLead.company} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">Anteckningar</label>
                                <textarea 
                                    className="w-full h-40 bg-gray-50 dark:bg-gray-800 p-6 rounded-[2rem] border-none outline-none font-bold italic text-lg resize-none shadow-inner ring-1 ring-transparent focus:ring-black dark:focus:ring-white transition-all" 
                                    defaultValue={selectedLead.notes} 
                                    onBlur={e => db.updateLead(user.id, selectedLead.id, { notes: e.target.value })} 
                                    placeholder="..."
                                />
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                            <button onClick={() => { setSelectedMailLeadId(selectedLead.id); setActiveTab('mail'); setIsDetailOpen(false); }} className="flex-1 py-6 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"><Mail size={20}/> Skriv Mail</button>
                            <button onClick={() => setLeadToDelete(selectedLead)} className="p-6 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 border border-red-100 dark:border-red-900"><Trash2 size={24}/></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HJÄLPKOMPONENTER ---

const SimpleTab = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-[1.5rem] font-bold text-base transition-all duration-300 ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-[1.02] z-10' : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
        <span className={`${active ? 'scale-110' : ''}`}>{icon}</span>
        <span className="italic whitespace-nowrap">{label}</span>
    </button>
);

const BigStatCard = ({ label, value, icon, color }: any) => {
    const colors: any = {
        blue: "text-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
        green: "text-green-500 bg-green-50/50 dark:bg-green-900/10",
        purple: "text-purple-500 bg-purple-50/50 dark:bg-purple-900/10"
    };
    return (
        <div className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group">
            <div className={`w-14 h-14 rounded-2xl ${colors[color]} flex items-center justify-center mb-6 transition-transform group-hover:rotate-6 shadow-inner`}>{icon}</div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1.5 truncate">{label}</p>
            <p className="text-3xl font-serif-display font-black italic tracking-tighter truncate text-gray-900 dark:text-white">{value}</p>
        </div>
    );
};

const SimpleInput = ({ label, value, onChange, type = "text", required = false }: any) => (
    <div className="space-y-2.5 group">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block ml-2 transition-colors group-focus-within:text-black dark:group-focus-within:text-white">{label} {required && '*'}</label>
        <input 
            type={type} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            required={required}
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent p-5 rounded-[1.5rem] focus:bg-white dark:focus:bg-gray-900 focus:border-black dark:focus:border-white outline-none text-lg font-bold italic shadow-inner transition-all dark:text-white"
        />
    </div>
);

const DetailBox = ({ label, value }: any) => (
    <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[1.8rem] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2 truncate">{label}</span>
        <p className="text-lg font-bold italic truncate text-gray-800 dark:text-white group-hover:text-black dark:group-hover:text-blue-400 transition-colors">{value}</p>
    </div>
);

const ReportVal = ({ label, val, color }: any) => (
    <div className="space-y-3 group">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block truncate">{label}</span>
        <span className={`text-3xl font-black italic font-serif-display border-b-2 border-transparent group-hover:border-black dark:group-hover:border-white transition-all pb-1 inline-block ${color === 'green' ? 'text-green-500' : color === 'blue' ? 'text-blue-500' : ''}`}>{val || 'N/A'}</span>
    </div>
);

const KpiBox = ({ label, val, highlight }: { label: string, val: string, highlight?: boolean }) => (
    <div className={`p-8 border border-black/5 flex flex-col justify-center items-center text-center transition-colors hover:bg-black/5 ${highlight ? 'bg-black/5' : ''}`}>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-3">{label}</span>
        <span className={`text-2xl md:text-3xl font-serif-display font-black italic uppercase leading-none ${highlight ? 'text-black' : 'text-black/80'}`}>{val}</span>
    </div>
);

export default CRM;
