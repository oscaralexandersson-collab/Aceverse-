
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, Plus, Search, Filter, MoreHorizontal, Mail, Phone, 
    Globe, Linkedin, ArrowRight, BarChart3, PieChart, 
    FileText, Download, Loader2, Sparkles, Send, Copy,
    CheckCircle2, Megaphone, Briefcase, TrendingUp, Target,
    DollarSign, Calendar, RefreshCw, Edit2, Trash2, AlertCircle,
    Save, ExternalLink, Check, ClipboardList, X, Clock, Wand2,
    LayoutGrid, List, ChevronRight, MessageCircle, Star, Info
} from 'lucide-react';
import { User, Lead, CompanyReport, CompanyReportEntry } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../../contexts/LanguageContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface CRMProps {
    user: User;
}

const STATUS_STAGES = ['New', 'Contacted', 'Meeting', 'Closed'] as const;

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'mail' | 'intelligence'>('contacts');
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reports, setReports] = useState<CompanyReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Selected lead for detail view
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Contacts State
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLead, setNewLead] = useState<Partial<Lead>>({ status: 'New', value: 0, priority: 'Medium' });
    const [isSavingLead, setIsSavingLead] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

    // AI Mail State
    const [selectedMailLeadId, setSelectedMailLeadId] = useState<string>('');
    const [mailPrompt, setMailPrompt] = useState('');
    const [generatedMail, setGeneratedMail] = useState<{ subject: string, body: string } | null>(null);
    const [isGeneratingMail, setIsGeneratingMail] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);

    // Intelligence State
    const [reportUrl, setReportUrl] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [activeReport, setActiveReport] = useState<CompanyReportEntry | null>(null);
    const [reportToDelete, setReportToDelete] = useState<CompanyReportEntry | null>(null);

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
            console.error("Failed to load CRM data", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CONTACTS ACTIONS ---

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
                linkedin: newLead.linkedin || '',
                website: newLead.website || '',
                notes: newLead.notes || '',
                status: (newLead.status as any) || 'New',
                value: Number(newLead.value) || 0,
                priority: newLead.priority || 'Medium',
                leadScore: Math.floor(Math.random() * 40) + 30 // Initial AI score
            });
            setLeads(prev => [added, ...prev]);
            setIsAddModalOpen(false);
            setNewLead({ status: 'New', value: 0, priority: 'Medium' });
        } catch (e) {
            alert("Kunde inte spara kontakt.");
        } finally {
            setIsSavingLead(false);
        }
    };

    const handleUpdateStatus = async (leadId: string, newStatus: Lead['status']) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: newStatus });
        await db.updateLead(user.id, leadId, { status: newStatus });
    };

    const handleUpdatePriority = async (leadId: string, newPriority: Lead['priority']) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, priority: newPriority } : l));
        if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, priority: newPriority });
        await db.updateLead(user.id, leadId, { priority: newPriority });
    };

    const handleUpdateValue = async (leadId: string, newValue: number) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, value: newValue } : l));
        await db.updateLead(user.id, leadId, { value: newValue });
    };

    const confirmDeleteLead = async () => {
        if (!leadToDelete) return;
        const id = leadToDelete.id;
        setLeads(prev => prev.filter(l => l.id !== id));
        setLeadToDelete(null);
        if (selectedLead?.id === id) {
            setIsDetailOpen(false);
            setSelectedLead(null);
        }
        try {
            await db.deleteLead(user.id, id);
        } catch (e) {
            loadData();
        }
    };

    // --- AI MAIL ACTIONS ---

    const generateAIMail = async () => {
        const lead = leads.find(l => l.id === selectedMailLeadId);
        if (!lead) return;
        setIsGeneratingMail(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                ACT AS A SENIOR OUTREACH SPECIALIST.
                MISSION: Write a highly personal and professional sales email.
                RECIPIENT: ${lead.name}
                COMPANY: ${lead.company}
                CONTEXT: ${mailPrompt}
                LANGUAGE: Svenska.
                
                FORMAT RULES:
                - Subject Line must be catchy and short.
                - Body must be concise (max 150 words).
                - Use a professional yet modern tone.
                
                OUTPUT: Return ONLY a JSON object:
                { "subject": "string", "body": "string" }
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            setGeneratedMail(JSON.parse(response.text || '{}'));
        } catch (e) {
            alert("Kunde inte generera mail.");
        } finally {
            setIsGeneratingMail(false);
        }
    };

    const copyMail = () => {
        if (!generatedMail) return;
        navigator.clipboard.writeText(`Ämne: ${generatedMail.subject}\n\n${generatedMail.body}`);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const sendMail = () => {
        if (!generatedMail) return;
        const lead = leads.find(l => l.id === selectedMailLeadId);
        const email = lead?.email || "";
        const subject = encodeURIComponent(generatedMail.subject);
        const body = encodeURIComponent(generatedMail.body);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    // --- INTELLIGENCE ACTIONS ---

    const generateReport = async (customUrl?: string) => {
        const urlToUse = customUrl || reportUrl;
        if (!urlToUse) return;
        setIsGeneratingReport(true);
        setLoadingMessage('Steg 1/2: Research & Evidence Pack Collection...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const researchPrompt = `RESEARCH MISSION: Generate an "Evidence Pack" for ${urlToUse}. Find: legal name, financials, business model. OUTPUT: structured JSON.`;
            const researchResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: researchPrompt,
                config: { tools: [{googleSearch: {}}] }
            });
            const evidencePack = researchResponse.text;
            setLoadingMessage('Steg 2/2: Rendering Professional Markdown Report...');
            const writerPrompt = `ACT AS A SENIOR BUSINESS ANALYST. DATA: ${evidencePack}. MISSION: Render a Comprehensive Research Report in Markdown in Svenska.`;
            const writerResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: writerPrompt
            });
            const fullMarkdown = writerResponse.text || '';
            const finalReport: CompanyReport = {
                meta: {
                    companyName: urlToUse.replace(/https?:\/\/(www\.)?/, '').split('.')[0].toUpperCase(),
                    website: urlToUse,
                    generatedDate: new Date().toLocaleDateString(),
                    language: 'sv'
                },
                fullMarkdown,
                summary: { revenue: '-', ebitda: '-', solvency: '-', employees: '-', founded: '-' },
                sources: [] 
            };
            const entry = await db.addReportToHistory(user.id, finalReport);
            setReports(prev => [entry, ...prev]);
            setActiveReport(entry);
            setActiveTab('intelligence');
        } catch (e) {
            console.error(e);
            alert("Kunde inte generera rapporten.");
        } finally {
            setIsGeneratingReport(false);
            setLoadingMessage('');
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('printable-report');
        if (!element || !activeReport) return;
        setIsDownloading(true);
        try {
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Aceverse_Report_${activeReport.reportData.meta.companyName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            // @ts-ignore
            await window.html2pdf().from(element).set(opt).save();
        } catch (error) {
            console.error("PDF generation failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;
        const idToDelete = reportToDelete.id;
        setReports(prev => prev.filter(r => r.id !== idToDelete));
        if (activeReport?.id === idToDelete) setActiveReport(null);
        setReportToDelete(null);
        try {
            await db.deleteReport(user.id, idToDelete);
        } catch (err) {
            console.error(err);
            loadData();
        }
    };

    // --- MARKDOWN PARSER ---
    const parseInlineStyles = (text: string) => {
        let parts = (text || '').split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const renderMarkdown = (md: string) => {
        if (!md) return null;
        const lines = md.split('\n');
        const renderedElements: React.ReactNode[] = [];
        let currentTable: string[][] = [];
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim().length > 0 || line.indexOf('|') !== line.lastIndexOf('|'));
                if (!trimmed.match(/[a-zA-Z0-9]/)) return; 
                currentTable.push(cells.map(c => c.trim()));
                const nextLine = lines[i + 1]?.trim();
                if (!nextLine || !nextLine.startsWith('|')) {
                    renderedElements.push(
                        <div key={`table-${i}`} className="overflow-x-auto my-8">
                            <table className="min-w-full border-collapse border border-gray-200 text-sm shadow-sm rounded-lg overflow-hidden text-black">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>{currentTable[0].map((cell, ci) => <th key={ci} className="px-4 py-3 text-left font-bold text-gray-900 uppercase tracking-wider text-[10px]">{cell}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">{currentTable.slice(1).map((row, ri) => <tr key={ri} className="hover:bg-gray-50/50 transition-colors">{row.map((cell, ci) => <td key={ci} className="px-4 py-3 text-gray-700 font-medium">{parseInlineStyles(cell)}</td>)}</tr>)}</tbody>
                            </table>
                        </div>
                    );
                    currentTable = [];
                }
                return;
            }
            if (trimmed.startsWith('# ')) renderedElements.push(<h1 key={i} className="text-4xl font-serif-display font-bold mb-8 border-b-4 border-black pb-6 pt-12 text-black leading-tight uppercase tracking-tighter">{parseInlineStyles(trimmed.replace('# ', ''))}</h1>);
            else if (trimmed.startsWith('## ')) renderedElements.push(<h2 key={i} className="text-2xl font-serif-display font-bold mt-12 mb-6 text-gray-900 border-b-2 border-gray-100 pb-3">{parseInlineStyles(trimmed.replace('## ', ''))}</h2>);
            else if (trimmed.startsWith('### ')) renderedElements.push(<h3 key={i} className="text-lg font-bold mt-10 mb-4 text-gray-800 uppercase tracking-widest">{parseInlineStyles(trimmed.replace('### ', ''))}</h3>);
            else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) renderedElements.push(<li key={i} className="ml-6 text-sm text-gray-700 list-none mb-3 flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0"></span><span>{parseInlineStyles(trimmed.substring(2))}</span></li>);
            else if (trimmed !== '') renderedElements.push(<p key={i} className="text-sm leading-relaxed text-gray-700 mb-5 text-justify">{parseInlineStyles(trimmed)}</p>);
            else renderedElements.push(<div key={i} className="h-2" />);
        });
        return renderedElements;
    };

    const safeLeads = Array.isArray(leads) ? leads : [];
    const filteredLeads = safeLeads.filter(l => 
        (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (l.company || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pipelineTotal = safeLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const weightedPipeline = safeLeads.reduce((sum, l) => {
        const prob = l.status === 'New' ? 0.1 : l.status === 'Contacted' ? 0.3 : l.status === 'Meeting' ? 0.6 : 1.0;
        return sum + (Number(l.value) || 0) * prob;
    }, 0);
    const newLeadsCount = safeLeads.filter(l => l.status === 'New').length;

    const openDetails = (lead: Lead) => {
        setSelectedLead(lead);
        setIsDetailOpen(true);
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn relative">
            <DeleteConfirmModal isOpen={!!reportToDelete} onClose={() => setReportToDelete(null)} onConfirm={confirmDeleteReport} itemName={reportToDelete?.title || ''} />
            <DeleteConfirmModal isOpen={!!leadToDelete} onClose={() => setLeadToDelete(null)} onConfirm={confirmDeleteLead} itemName={leadToDelete?.name || ''} />

            {/* TABBAR & HEADER */}
            <div className="flex justify-between items-end mb-6 no-print px-1">
                <div>
                    <h1 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-1">{t('dashboard.crmContent.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.crmContent.subtitle')}</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg no-print">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={16} />} label={t('dashboard.crmContent.tabs.overview')} />
                    <TabButton active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} icon={<Users size={16} />} label={t('dashboard.crmContent.tabs.contacts')} />
                    <TabButton active={activeTab === 'mail'} onClick={() => setActiveTab('mail')} icon={<Mail size={16} />} label={t('dashboard.crmContent.tabs.mail')} />
                    <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={<FileText size={16} />} label="Intelligence" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.crmContent.pipeline')}</span>
                                    <DollarSign size={18} className="text-green-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{pipelineTotal.toLocaleString()} kr</div>
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">Viktat värde: <strong>{Math.round(weightedPipeline).toLocaleString()} kr</strong></p>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.crmContent.openDeals')}</span>
                                    <Target size={18} className="text-blue-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{safeLeads.length} st</div>
                                <p className="text-xs text-gray-500 mt-2">{newLeadsCount} nya denna vecka</p>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Genomsnittligt lead-score</span>
                                    <Sparkles size={18} className="text-purple-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {safeLeads.length > 0 ? Math.round(safeLeads.reduce((a,b) => a + (b.leadScore || 0), 0) / safeLeads.length) : 0}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">AI-beräknad potential</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pb-12">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><BarChart3 size={18}/> Statusfördelning</h3>
                                <div className="space-y-4">
                                    {STATUS_STAGES.map(s => {
                                        const count = safeLeads.filter(l => l.status === s).length;
                                        const pct = safeLeads.length > 0 ? (count / safeLeads.length) * 100 : 0;
                                        return (
                                            <div key={s}>
                                                <div className="flex justify-between text-sm mb-1.5 font-medium">
                                                    <span className="text-gray-600 dark:text-gray-400">{s}</span>
                                                    <span className="text-gray-900 dark:text-white">{count} ({Math.round(pct)}%)</span>
                                                </div>
                                                <div className="h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${s === 'Closed' ? 'bg-green-500' : 'bg-black dark:bg-white'}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Clock size={18}/> {t('dashboard.crmContent.activity')}</h3>
                                <div className="space-y-4">
                                    {safeLeads.length > 0 ? safeLeads.slice(0, 5).map((l, i) => (
                                        <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {(l.name || 'U').substring(0,1)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">Lade till lead: <strong>{l.name}</strong></p>
                                                <p className="text-xs text-gray-500">Företag: {l.company} • {new Date(l.dateAdded).toLocaleDateString()}</p>
                                            </div>
                                            <div className="ml-auto">
                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${l.priority === 'High' ? 'bg-red-50 text-red-600' : l.priority === 'Medium' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    {l.priority}
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="text-center py-10 text-gray-400 text-sm">{t('dashboard.crmContent.noActivity')}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CONTACTS TAB (Board or Table) */}
                {activeTab === 'contacts' && (
                    <div className="h-full flex flex-col space-y-4 animate-fadeIn">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center no-print">
                            <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <button 
                                    onClick={() => setViewMode('kanban')} 
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <LayoutGrid size={14}/> Kanban
                                </button>
                                <button 
                                    onClick={() => setViewMode('table')} 
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <List size={14}/> Tabell
                                </button>
                            </div>
                            
                            <div className="relative flex-1 md:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={t('dashboard.crmContent.search')} 
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-50 border border-gray-200 dark:border-gray-800 shadow-sm">
                                    <Download size={16} /> Export
                                </button>
                                <button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-xl hover:opacity-80 transition-opacity shadow-lg shadow-black/10"
                                >
                                    <Plus size={16} /> Nytt Lead
                                </button>
                            </div>
                        </div>

                        {viewMode === 'kanban' ? (
                            <div className="flex-1 overflow-x-auto pb-6">
                                <div className="flex gap-6 h-full min-w-max pr-6">
                                    {STATUS_STAGES.map(stage => (
                                        <div key={stage} className="w-80 flex flex-col h-full bg-gray-100/50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-200/50 dark:border-gray-800/50">
                                            <div className="flex justify-between items-center mb-4 px-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">{stage}</h3>
                                                    <span className="bg-white dark:bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                                        {filteredLeads.filter(l => l.status === stage).length}
                                                    </span>
                                                </div>
                                                <button className="text-gray-400 hover:text-black"><MoreHorizontal size={16}/></button>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                                {filteredLeads.filter(l => l.status === stage).map(lead => (
                                                    <div 
                                                        key={lead.id} 
                                                        onClick={() => openDetails(lead)}
                                                        className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${lead.priority === 'High' ? 'bg-red-50 text-red-600' : lead.priority === 'Medium' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                                                {lead.priority}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                                                <Sparkles size={10}/> {lead.leadScore}
                                                            </div>
                                                        </div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-black dark:group-hover:text-white mb-1">{lead.name}</h4>
                                                        <p className="text-xs text-gray-500 mb-4">{lead.company}</p>
                                                        
                                                        <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-gray-800">
                                                            <div className="flex -space-x-2">
                                                                {lead.email && <div className="w-6 h-6 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><Mail size={10}/></div>}
                                                                {lead.linkedin && <div className="w-6 h-6 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><Linkedin size={10}/></div>}
                                                            </div>
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{lead.value.toLocaleString()} kr</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredLeads.filter(l => l.status === stage).length === 0 && (
                                                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl h-24 flex items-center justify-center text-gray-400 text-xs italic">Inga leads här</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-fadeIn">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 dark:border-gray-800">
                                            <tr>
                                                <th className="px-6 py-4">Namn</th>
                                                <th className="px-6 py-4">Företag</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Prioritet</th>
                                                <th className="px-6 py-4">Score</th>
                                                <th className="px-6 py-4">Värde</th>
                                                <th className="px-6 py-4 text-right">Åtgärder</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {filteredLeads.map(l => (
                                                <tr key={l.id} onClick={() => openDetails(l)} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200 dark:border-gray-700">
                                                                {(l.name || 'U').substring(0,1)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white">{l.name}</div>
                                                                <div className="text-[10px] text-gray-400">{l.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400">{l.company}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            l.status === 'New' ? 'bg-blue-50 text-blue-600' :
                                                            l.status === 'Contacted' ? 'bg-orange-50 text-orange-600' :
                                                            l.status === 'Meeting' ? 'bg-purple-50 text-purple-600' :
                                                            'bg-green-50 text-green-600'
                                                        }`}>
                                                            {l.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold ${l.priority === 'High' ? 'text-red-600' : l.priority === 'Medium' ? 'text-blue-600' : 'text-gray-400'}`}>
                                                            {l.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1 font-mono font-bold text-purple-600">
                                                            <Sparkles size={12}/> {l.leadScore}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                        {l.value.toLocaleString()} kr
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.stopPropagation(); setLeadToDelete(l); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. AI MAIL TAB */}
                {activeTab === 'mail' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                            <h2 className="text-2xl font-serif-display mb-6 flex items-center gap-3">
                                <Wand2 className="text-purple-500" /> Outreach Assistant
                            </h2>
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Mottagare</label>
                                        <select 
                                            value={selectedMailLeadId}
                                            onChange={e => setSelectedMailLeadId(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- Välj en kontakt --</option>
                                            {safeLeads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tonalitet</label>
                                        <div className="flex gap-2">
                                            {['Professionell', 'Personlig', 'Kort & Koncist'].map(tonalitet => (
                                                <button key={tonalitet} className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-medium hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all">
                                                    {tonalitet}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Kontext för meddelandet</label>
                                    <textarea 
                                        value={mailPrompt}
                                        onChange={e => setMailPrompt(e.target.value)}
                                        placeholder="t.ex. Följ upp på vårt möte förra veckan gällande prissättningen..."
                                        className="w-full h-32 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-none resize-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white"
                                    />
                                </div>

                                <button 
                                    onClick={generateAIMail}
                                    disabled={!selectedMailLeadId || !mailPrompt || isGeneratingMail}
                                    className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
                                >
                                    {isGeneratingMail ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    {isGeneratingMail ? "Analyserar..." : "Generera utkast"}
                                </button>
                            </div>
                        </div>

                        {generatedMail && (
                            <div className="bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-3xl p-8 shadow-2xl animate-slideUp">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={18}/> Förhandsgranskning</h3>
                                    <div className="flex gap-2">
                                        <button onClick={copyMail} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all">
                                            {copyStatus ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} {copyStatus ? "Kopierat!" : "Kopiera"}
                                        </button>
                                        <button onClick={sendMail} className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:opacity-80 transition-all shadow-lg">
                                            <Send size={14} /> Skicka
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Ämne</span>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{generatedMail.subject}</div>
                                    </div>
                                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[200px] whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                        {generatedMail.body}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. INTELLIGENCE TAB */}
                {activeTab === 'intelligence' && (
                    <div className="h-full">
                        {!activeReport ? (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-900 p-10 rounded-2xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-black dark:text-white">
                                        <Sparkles size={32} />
                                    </div>
                                    <h3 className="font-serif-display text-2xl mb-4 text-gray-900 dark:text-white">Market Intelligence Engine</h3>
                                    <div className="flex max-w-lg mx-auto gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-full border border-gray-200 dark:border-gray-800">
                                        <input value={reportUrl} onChange={e => setReportUrl(e.target.value)} placeholder="Klistra in hemsida (t.ex. klarna.com)" className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-900 dark:text-white outline-none" />
                                        <button onClick={() => generateReport()} disabled={!reportUrl || isGeneratingReport} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                                            {isGeneratingReport ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                            {isGeneratingReport ? 'Arbetar...' : 'Analysera'}
                                        </button>
                                    </div>
                                    {isGeneratingReport && <div className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse uppercase tracking-widest">{loadingMessage}</div>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
                                    {reports.map(report => (
                                        <div key={report.id} onClick={() => setActiveReport(report)} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-all hover:shadow-lg cursor-pointer group border-b-4 border-b-black relative overflow-hidden">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate text-lg mb-1 pr-8">{report.title}</h4>
                                            <p className="text-xs text-gray-500">Market Intelligence Snapshot</p>
                                            <button onClick={(e) => { e.stopPropagation(); setReportToDelete(report); }} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-gray-100 dark:bg-black/40 rounded-2xl overflow-hidden animate-slideUp">
                                <div className="no-print bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveReport(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"><ArrowRight className="rotate-180" size={20} /></button>
                                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                                        <h2 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{activeReport.reportData.meta.companyName}</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleDownloadPDF} disabled={isDownloading} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-80 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50">
                                            {isDownloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14}/>} {isDownloading ? 'Laddar...' : 'Ladda ned PDF'}
                                        </button>
                                        <button onClick={() => setReportToDelete(activeReport)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 md:p-12">
                                    <div id="printable-report" className="bg-white p-12 md:p-24 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200 mx-auto max-w-5xl min-h-full text-black font-sans selection:bg-yellow-100 mb-20">
                                        <div className="border-b-8 border-black pb-8 mb-16 flex justify-between items-end">
                                            <div>
                                                <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-xs italic">A</div><span className="font-bold tracking-tighter text-xl text-black">ACEVERSE INTELLIGENCE</span></div>
                                                <h1 className="text-5xl font-serif-display font-bold uppercase tracking-tighter max-w-2xl leading-none text-black">Research Report</h1>
                                                <p className="text-gray-500 text-sm mt-4 font-medium uppercase tracking-widest">Target: {activeReport.reportData.meta.companyName} | {activeReport.reportData.meta.website}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end"><div className="font-bold border-t border-black pt-1 text-black">{activeReport.reportData.meta.generatedDate}</div><div className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Internal Use Only</div></div>
                                        </div>
                                        <div className="max-w-none report-content text-black">{renderMarkdown(activeReport.reportData.fullMarkdown)}</div>
                                        <div className="mt-24 pt-10 border-t-2 border-gray-100"><div className="flex items-center gap-2 text-gray-400 mb-4"><Sparkles size={16} /><span className="text-xs font-bold uppercase tracking-widest">AI Synthesis Engine</span></div><p className="text-[11px] text-gray-400 leading-relaxed italic">This document was automatically generated based on public data. Accuracy is high but verification is recommended for critical decisions.</p></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* DETAIL SLIDE-OVER */}
            <div className={`fixed inset-y-0 right-0 z-[100] w-full md:w-[500px] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-500 ease-in-out border-l border-gray-200 dark:border-gray-800 ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedLead && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="font-serif-display text-2xl text-gray-900 dark:text-white">Lead-detaljer</h2>
                            <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                            {/* Profile Header */}
                            <div className="flex items-center gap-6 pb-8 border-b border-gray-50 dark:border-gray-800">
                                <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-3xl font-serif text-gray-300">
                                    {selectedLead.name.substring(0,1)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedLead.name}</h3>
                                    <p className="text-gray-500 font-medium">{selectedLead.company}</p>
                                    <div className="flex gap-2 mt-3">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                                            <Sparkles size={12}/> {selectedLead.leadScore} / 100
                                        </div>
                                        <div className={`text-[10px] font-bold px-3 py-1 rounded-full border ${selectedLead.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            {selectedLead.priority} Priority
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Value Controls */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lead Status</label>
                                    <select 
                                        value={selectedLead.status} 
                                        onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as any)}
                                        className="w-full bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                                    >
                                        {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Beräknat Värde</label>
                                    <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                                        <input 
                                            type="number" 
                                            value={selectedLead.value} 
                                            onChange={(e) => handleUpdateValue(selectedLead.id, Number(e.target.value))}
                                            className="bg-transparent w-full outline-none"
                                        />
                                        <span className="text-xs">KR</span>
                                    </div>
                                </div>
                            </div>

                            {/* Intelligence Quick Action */}
                            <div className="p-6 bg-black text-white rounded-3xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><Search size={18}/> Lead Intelligence</h4>
                                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">Generera en automatisk forskningsrapport om {selectedLead.company} för att hitta säljvinklar.</p>
                                    <button 
                                        onClick={() => generateReport(selectedLead.website || selectedLead.company)}
                                        disabled={isGeneratingReport}
                                        className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingReport ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                                        {isGeneratingReport ? "Forskar..." : "Kör AI Research"}
                                    </button>
                                </div>
                                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 group-hover:scale-110 transition-transform"></div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Kontaktinformation</h4>
                                <div className="space-y-3">
                                    <ContactItem icon={<Mail size={18}/>} label="E-post" value={selectedLead.email} />
                                    <ContactItem icon={<Phone size={18}/>} label="Telefon" value={selectedLead.phone || "Saknas"} />
                                    <ContactItem icon={<Linkedin size={18}/>} label="LinkedIn" value={selectedLead.linkedin || "Saknas"} link={selectedLead.linkedin} />
                                    <ContactItem icon={<Globe size={18}/>} label="Webbplats" value={selectedLead.website || "Saknas"} link={selectedLead.website} />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Anteckningar</h4>
                                <textarea 
                                    className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none focus:ring-1 focus:ring-black transition-all text-sm leading-relaxed"
                                    placeholder="Lägg till anteckningar om möten, krav eller feedback..."
                                    defaultValue={selectedLead.notes}
                                    onBlur={(e) => db.updateLead(user.id, selectedLead.id, { notes: e.target.value })}
                                />
                            </div>

                            {/* History Simulation */}
                            <div className="space-y-4 pb-12">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aktivitetshistorik</h4>
                                <div className="space-y-4">
                                    <HistoryItem type="Creation" date={new Date(selectedLead.dateAdded).toLocaleDateString()} content="Lead skapat i systemet." />
                                    {selectedLead.status !== 'New' && <HistoryItem type="Stage Change" date="Idag" content={`Status ändrad till ${selectedLead.status}.`} />}
                                </div>
                            </div>
                        </div>

                        {/* Detail Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                            <button 
                                onClick={() => { setSelectedMailLeadId(selectedLead.id); setActiveTab('mail'); setIsDetailOpen(false); }} 
                                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                            >
                                <Mail size={18}/> Skriv Mail
                            </button>
                            <button 
                                onClick={() => { setLeadToDelete(selectedLead); }}
                                className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Backdrop for detail panel */}
            {isDetailOpen && (
                <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-xs" onClick={() => setIsDetailOpen(false)}></div>
            )}

            {/* ADD CONTACT MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white">Lägg till Lead</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleAddLead} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Fullständigt namn *</label>
                                        <input required value={newLead.name || ''} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Företag *</label>
                                        <input required value={newLead.company || ''} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
                                        <select value={newLead.status || 'New'} onChange={e => setNewLead({...newLead, status: e.target.value as any})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white">
                                            {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Värde (kr)</label>
                                        <input 
                                            type="number" 
                                            value={newLead.value || 0} 
                                            onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} 
                                            className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white" 
                                            placeholder="t.ex. 5000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Prioritet</label>
                                        <select value={newLead.priority || 'Medium'} onChange={e => setNewLead({...newLead, priority: e.target.value as any})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white">
                                            <option value="High">Hög</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Låg</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-post</label>
                                        <input value={newLead.email || ''} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border-none outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white" placeholder="namn@företag.se" />
                                    </div>
                                </div>
                                <button disabled={isSavingLead} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl">
                                    {isSavingLead ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} {isSavingLead ? "Sparar..." : "Lägg till Lead"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>
        {icon}
        {label}
    </button>
);

const ContactItem = ({ icon, label, value, link }: { icon: any, label: string, value: string, link?: string }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{icon}</div>
        <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            {link ? (
                <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">
                    {value}
                </a>
            ) : (
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">{value}</span>
            )}
        </div>
    </div>
);

const HistoryItem = ({ type, date, content }: { type: string, date: string, content: string }) => (
    <div className="relative pl-6 pb-6 border-l-2 border-gray-100 dark:border-gray-800 last:pb-0">
        <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{type}</span>
            <span className="text-[10px] text-gray-400">{date}</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{content}</p>
    </div>
);

export default CRM;
