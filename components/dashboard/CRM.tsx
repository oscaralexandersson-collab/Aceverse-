import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Users, Plus, Search, Filter, Mail, Phone, 
    Globe, Linkedin, ArrowRight, BarChart3, PieChart, 
    FileText, Download, Loader2, Sparkles, Send, Copy,
    CheckCircle2, Target, DollarSign, Clock, Wand2,
    LayoutGrid, List, ChevronRight, Zap, GripVertical, 
    ChevronUp, ChevronDown, Layers, HelpCircle, Info,
    Lightbulb, Check, ArrowUpRight, Trash2, Save, X
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

type SortField = 'name' | 'company' | 'value' | 'leadScore' | 'status' | 'dateAdded';
type SortDirection = 'asc' | 'desc';

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'mail' | 'intelligence'>('contacts');
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reports, setReports] = useState<CompanyReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Alla');
    const [priorityFilter, setPriorityFilter] = useState<string>('Alla');
    const [sortField, setSortField] = useState<SortField>('dateAdded');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLead, setNewLead] = useState<Partial<Lead>>({ status: 'Nya', value: 0, priority: 'Medium' });
    const [isSavingLead, setIsSavingLead] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);

    const [selectedMailLeadId, setSelectedMailLeadId] = useState<string>('');
    const [mailPrompt, setMailPrompt] = useState('');
    const [selectedTonality, setSelectedTonality] = useState('Professionell');
    const [generatedMail, setGeneratedMail] = useState<{ subject: string, body: string } | null>(null);
    const [isGeneratingMail, setIsGeneratingMail] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);
    const [suggestedPhrase, setSuggestedPhrase] = useState('');
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

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

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLeadId(leadId);
        e.dataTransfer.setData('leadId', leadId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedLeadId(null);
        setDragOverStage(null);
    };

    const handleDragOver = (e: React.DragEvent, stage: string) => {
        e.preventDefault();
        if (dragOverStage !== stage) setDragOverStage(stage);
    };

    const handleDrop = async (e: React.DragEvent, stage: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId') || draggedLeadId;
        if (!leadId) return;

        setDragOverStage(null);
        handleUpdateStatus(leadId, stage as any);
        if ('vibrate' in navigator) navigator.vibrate(10);
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
                linkedin: newLead.linkedin || '',
                website: newLead.website || '',
                notes: newLead.notes || '',
                status: (newLead.status as any) || 'Nya',
                value: Number(newLead.value) || 0,
                priority: newLead.priority || 'Medium',
                leadScore: Math.floor(Math.random() * 40) + 30 
            });
            setLeads(prev => [added, ...prev]);
            setIsAddModalOpen(false);
            setNewLead({ status: 'Nya', value: 0, priority: 'Medium' });
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
            await loadData(); // Full refresh to ensure sync
        } catch (e) {
            loadData();
        }
    };

    const confirmDeleteReport = async () => {
        if (!reportToDelete) return;
        const id = reportToDelete.id;
        setReports(prev => prev.filter(r => r.id !== id));
        if (activeReport?.id === id) setActiveReport(null);
        setReportToDelete(null);
        try {
            await db.deleteReport(user.id, id);
            await loadData();
        } catch (e) {
            loadData();
        }
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredLeads = useMemo(() => {
        let result = leads.filter(l => 
            (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
            (l.company || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (statusFilter !== 'Alla') {
            result = result.filter(l => l.status === statusFilter);
        }
        
        if (priorityFilter !== 'Alla') {
            result = result.filter(l => l.priority === priorityFilter);
        }

        return result.sort((a, b) => {
            let valA: any = a[sortField as keyof Lead];
            let valB: any = b[sortField as keyof Lead];
            
            if (sortField === 'value' || sortField === 'leadScore') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else if (sortField === 'dateAdded') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [leads, searchQuery, statusFilter, priorityFilter, sortField, sortDirection]);

    const pipelineTotal = leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

    const openDetails = (lead: Lead) => {
        setSelectedLead(lead);
        setIsDetailOpen(true);
    };

    const generateFollowUpSuggestion = async () => {
        const lead = leads.find(l => l.id === selectedMailLeadId);
        if (!lead) return;
        
        setIsGeneratingSuggestion(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Föreslå en kort (max 1 mening) personlig anledning att följa upp med ${lead.name} från ${lead.company}. Kontext: ${lead.notes || 'Inget specifikt.'}`,
            });
            setSuggestedPhrase(response.text?.trim() || '');
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingSuggestion(false);
        }
    };

    const useSuggestedPhrase = () => {
        setMailPrompt(prev => prev ? `${prev}\n\n${suggestedPhrase}` : suggestedPhrase);
        setSuggestedPhrase('');
    };

    const generateAIMail = async () => {
        const lead = leads.find(l => l.id === selectedMailLeadId);
        if (!lead || !mailPrompt) return;

        setIsGeneratingMail(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Skriv ett säljmail till ${lead.name} på ${lead.company}. 
                Tonalitet: ${selectedTonality}. 
                Användare (avsändare): ${user.firstName} ${user.lastName} från ${user.company || 'Aceverse'}.
                Prompt: ${mailPrompt}.
                Återge svaret som JSON med fälten "subject" och "body". Ingen annan text.`,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const result = JSON.parse(response.text || '{}');
            setGeneratedMail(result);
        } catch (e) {
            console.error(e);
            alert("Kunde inte generera mail.");
        } finally {
            setIsGeneratingMail(false);
        }
    };

    const copyMail = async () => {
        if (!generatedMail) return;
        const text = `Ämne: ${generatedMail.subject}\n\n${generatedMail.body}`;
        await navigator.clipboard.writeText(text);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const sendMail = () => {
        if (!generatedMail) return;
        const lead = leads.find(l => l.id === selectedMailLeadId);
        window.location.href = `mailto:${lead?.email || ""}?subject=${encodeURIComponent(generatedMail.subject)}&body=${encodeURIComponent(generatedMail.body)}`;
    };

    const generateReport = async () => {
        if (!reportUrl) return;
        setIsGeneratingReport(true);
        setLoadingMessage('Genomsöker nätet efter data...');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const searchRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Hitta detaljerad information om bolaget på ${reportUrl}: omsättning (senaste året), EBITDA, soliditet, antal anställda, grundat år, verksamhetsbeskrivning och marknadsposition.`,
                config: { 
                    tools: [{ googleSearch: {} }] 
                }
            });

            const groundingChunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const searchSources = groundingChunks
                .filter((chunk: any) => chunk.web)
                .map((chunk: any, index: number) => ({
                    id: index + 1,
                    url: chunk.web.uri,
                    title: chunk.web.title,
                    reliability: 100
                }));

            setLoadingMessage('Analyserar finansiell data...');

            const reportRes = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Skapa en professionell, djupgående bolagsrapport baserat på denna information:
                ${searchRes.text}
                
                Rapporten ska vara på svenska och formaterad i Markdown.
                Returnera resultatet som JSON med följande fält:
                {
                    "meta": { "companyName": "Bolagets Namn", "website": "${reportUrl}", "generatedDate": "${new Date().toLocaleDateString()}", "language": "sv" },
                    "fullMarkdown": "Markdown innehåll...",
                    "summary": { "revenue": "Omsättning", "ebitda": "EBITDA", "solvency": "Soliditet", "employees": "Antal anställda", "founded": "Grundat år" }
                }`,
                config: { responseMimeType: 'application/json' }
            });

            const reportData: CompanyReport = JSON.parse(reportRes.text || '{}');
            reportData.sources = searchSources;

            const entry = await db.addReportToHistory(user.id, reportData);
            setReports(prev => [entry, ...prev]);
            setActiveReport(entry);
            setReportUrl('');
        } catch (e) {
            console.error(e);
            alert("Rapportgenerering misslyckades.");
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
            const opt = { margin: [10, 10, 10, 10], filename: `Aceverse_Report_${activeReport.reportData.meta.companyName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            // @ts-ignore
            await window.html2pdf().from(element).set(opt).save();
        } catch (error) { console.error(error); } finally { setIsDownloading(false); }
    };

    const renderMarkdown = (md: string) => {
        if (!md) return null;
        const lines = md.split('\n');
        const renderedElements: React.ReactNode[] = [];
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) renderedElements.push(<h1 key={i} className="text-4xl font-serif-display font-bold mb-8 border-b-8 border-black pb-6 pt-12 text-black uppercase tracking-tighter">{trimmed.replace('# ', '')}</h1>);
            else if (trimmed.startsWith('## ')) renderedElements.push(<h2 key={i} className="text-2xl font-serif-display font-bold mt-12 mb-6 text-gray-900 border-b-2 border-gray-100 pb-3">{trimmed.replace('## ', '')}</h2>);
            else if (trimmed.startsWith('### ')) renderedElements.push(<h3 key={i} className="text-lg font-bold mt-10 mb-4 text-gray-800 uppercase tracking-widest">{trimmed.replace('### ', '')}</h3>);
            else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) renderedElements.push(<li key={i} className="ml-6 text-sm text-gray-700 list-none mb-3 flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0"></span><span>{trimmed.substring(2)}</span></li>);
            else if (trimmed !== '') renderedElements.push(<p key={i} className="text-sm leading-relaxed text-gray-700 mb-5 text-justify">{trimmed}</p>);
            else renderedElements.push(<div key={i} className="h-2" />);
        });
        return renderedElements;
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn relative selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <DeleteConfirmModal isOpen={!!reportToDelete} onClose={() => setReportToDelete(null)} onConfirm={confirmDeleteReport} itemName={reportToDelete?.title || ''} />
            <DeleteConfirmModal isOpen={!!leadToDelete} onClose={() => setLeadToDelete(null)} onConfirm={confirmDeleteLead} itemName={leadToDelete?.name || ''} />

            {/* HEADER - Executive Style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 no-print gap-8 px-2">
                <div className="space-y-1">
                    <h1 className="font-serif-display text-5xl text-gray-950 dark:text-white tracking-tighter uppercase italic leading-none">Kundflöde</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Hantering & Strategi</span>
                        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                        <span className="text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-[0.3em]">{leads.length} Kontakter</span>
                    </div>
                </div>
                <div className="flex bg-gray-100/40 dark:bg-gray-800/40 p-1.5 rounded-full no-print backdrop-blur-md border border-gray-200/50 dark:border-gray-800 shadow-sm">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={14} />} label="Överblick" />
                    <TabButton active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} icon={<Users size={14} />} label="Mina Kunder" />
                    <TabButton active={activeTab === 'mail'} onClick={() => setActiveTab('mail')} icon={<Mail size={14} />} label="Skrivhjälp" />
                    <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={<Sparkles size={14} />} label="Bolagskoll" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-2">
                {/* 1. OVERVIEW TAB - Executive Dashboard */}
                {activeTab === 'overview' && (
                    <div className="space-y-12 animate-fadeIn pb-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <MetricCard title="Värde i flödet" value={`${pipelineTotal.toLocaleString()} kr`} icon={<DollarSign size={20} />} trend="Alla affärer" />
                            <MetricCard title="Öppna förfrågningar" value={`${leads.length} st`} icon={<Target size={20} />} trend={`${leads.filter(l => l.status === 'Nya').length} helt nya`} />
                            <MetricCard title="AI Potential" value={leads.length > 0 ? `${Math.round(leads.reduce((a,b) => a + (b.leadScore || 0), 0) / leads.length)}%` : "0%"} icon={<Zap size={20} />} trend="Genomsnitt" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-12 shadow-sm transition-all hover:shadow-xl group">
                                <div className="flex justify-between items-center mb-12">
                                    <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">Process-överblick</h3>
                                    <PieChart size={16} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-8">
                                    {STATUS_STAGES.map(s => {
                                        const count = leads.filter(l => l.status === s).length;
                                        const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                                        return (
                                            <div key={s} className="group/row">
                                                <div className="flex justify-between text-[11px] mb-3 font-black uppercase tracking-widest transition-colors group-hover/row:text-black dark:group-hover/row:text-white">
                                                    <span className="text-gray-400">{s}</span>
                                                    <span className="text-black dark:text-white">{count} st</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-12 shadow-sm transition-all hover:shadow-xl group">
                                <div className="flex justify-between items-center mb-12">
                                    <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">Nyligen tillagda</h3>
                                    <Clock size={16} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-10">
                                    {leads.length > 0 ? leads.slice(0, 4).map((l, i) => (
                                        <div key={i} className="flex items-center gap-6 group cursor-pointer" onClick={() => openDetails(l)}>
                                            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-100 dark:border-gray-700 group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                                {l.name.substring(0,1)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-950 dark:text-white truncate uppercase italic leading-none">{l.name}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">{l.company}</p>
                                            </div>
                                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">{l.priority}</div>
                                        </div>
                                    )) : <div className="text-center py-20 text-gray-300 text-sm italic font-medium uppercase tracking-[0.4em] opacity-40">Ingen aktivitet än.</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CONTACTS TAB - Tactical Pipeline */}
                {activeTab === 'contacts' && (
                    <div className="h-full flex flex-col space-y-8 animate-fadeIn pb-12">
                        {/* Interactive Toolbar */}
                        <div className="flex flex-col xl:flex-row gap-6 justify-between items-center no-print">
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-1.5 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
                                <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'kanban' ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                    <LayoutGrid size={14}/> Tavla
                                </button>
                                <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'table' ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                    <List size={14}/> Lista
                                </button>
                            </div>
                            
                            <div className="relative flex-1 w-full md:max-w-xl group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={16} />
                                <input 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    placeholder="Sök kontakt eller bolag..." 
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full pl-14 pr-8 py-4 text-sm focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 outline-none transition-all text-gray-900 dark:text-white shadow-sm font-bold italic" 
                                />
                            </div>

                            <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-3 px-12 py-4 bg-black dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-[0.3em] rounded-full hover:opacity-80 transition-all shadow-2xl active:scale-95">
                                <Plus size={18} /> Lägg till
                            </button>
                        </div>

                        {viewMode === 'kanban' ? (
                            <div className="flex-1 overflow-x-auto pb-8 scrollbar-hide">
                                <div className="flex gap-8 h-full min-w-max pr-12">
                                    {STATUS_STAGES.map(stage => {
                                        const isOver = dragOverStage === stage;
                                        const stageLeads = filteredLeads.filter(l => l.status === stage);
                                        
                                        return (
                                            <div 
                                                key={stage} 
                                                onDragOver={(e) => handleDragOver(e, stage)}
                                                onDrop={(e) => handleDrop(e, stage)}
                                                onDragLeave={() => setDragOverStage(null)}
                                                className={`w-85 flex flex-col h-full rounded-[3rem] p-8 border transition-all duration-400 ${isOver ? 'bg-gray-100 dark:bg-gray-800 border-black dark:border-white scale-[1.01] shadow-2xl' : 'bg-gray-50/40 dark:bg-black/20 border-transparent'}`}
                                            >
                                                <div className="flex justify-between items-center mb-10 px-1">
                                                    <div className="flex items-center gap-4">
                                                        <h3 className="font-black text-[10px] text-gray-950 dark:text-white uppercase tracking-[0.3em]">{stage}</h3>
                                                        <span className="text-[10px] font-black text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">{stageLeads.length}</span>
                                                    </div>
                                                    <HelpCircle size={16} className="text-gray-300 cursor-help hover:text-black dark:hover:text-white transition-colors" title={`Dra kort hit när de är: ${stage}`} />
                                                </div>
                                                
                                                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                                    {stageLeads.map(lead => (
                                                        <div 
                                                            key={lead.id} 
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                                            onDragEnd={handleDragEnd}
                                                            onClick={() => openDetails(lead)} 
                                                            className={`bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden ${draggedLeadId === lead.id ? 'opacity-0 h-0 p-0 m-0 overflow-hidden' : 'hover:-translate-y-2'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-8">
                                                                <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white shadow-sm">
                                                                    {lead.name.substring(0,1)}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2.5">
                                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-black dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full uppercase tracking-widest italic shadow-inner">
                                                                        <Zap size={10} fill="currentColor"/> {lead.leadScore}%
                                                                    </div>
                                                                    {lead.priority === 'High' && (
                                                                        <span className="text-[8px] font-black px-2.5 py-1 rounded-full uppercase bg-black text-white dark:bg-white dark:text-black tracking-[0.1em] shadow-sm">Prio</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <h4 className="font-bold text-gray-950 dark:text-white text-base mb-1 truncate tracking-tight uppercase italic leading-none">{lead.name}</h4>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-10 truncate uppercase tracking-[0.3em] font-black">{lead.company}</p>
                                                            
                                                            <div className="flex justify-between items-center pt-8 border-t border-gray-50 dark:border-gray-800">
                                                                <div className="flex gap-4 opacity-20 group-hover:opacity-100 transition-all">
                                                                    {lead.email && <Mail size={16} />}
                                                                    {lead.linkedin && <Linkedin size={16} />}
                                                                </div>
                                                                <div className="text-[14px] font-black text-gray-950 dark:text-white tracking-tighter italic">{lead.value.toLocaleString()} kr</div>
                                                            </div>

                                                            <div className="absolute top-1/2 left-2 -translate-y-1/2 opacity-0 group-hover:opacity-20 transition-opacity">
                                                                <GripVertical size={20} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {stageLeads.length === 0 && !isOver && (
                                                        <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] flex flex-col items-center justify-center opacity-30 grayscale hover:opacity-50 transition-opacity cursor-pointer">
                                                            <Layers size={28} className="mb-3" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tom sektion</span>
                                                        </div>
                                                    )}

                                                    <button onClick={() => { setNewLead({ ...newLead, status: stage as any }); setIsAddModalOpen(true); }} className="w-full py-7 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-300 hover:text-black dark:hover:text-white hover:border-black transition-all group bg-white/10 hover:bg-white dark:hover:bg-gray-900 shadow-sm">
                                                        <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-6 animate-fadeIn">
                                <div className="flex flex-col md:flex-row items-center justify-between px-4 gap-6">
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-3">
                                            <Filter size={14} className="text-gray-400" />
                                            <div className="flex gap-2 p-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-full border border-gray-200/50 dark:border-gray-700 shadow-inner">
                                                {['Alla', ...STATUS_STAGES].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setStatusFilter(s)}
                                                        className={`px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] rounded-full transition-all ${statusFilter === s ? 'bg-black text-white dark:bg-white dark:text-black shadow-xl' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] italic opacity-60">
                                        Totalt: {filteredLeads.length} personer
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all hover:shadow-2xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 font-black uppercase text-[10px] tracking-[0.4em] border-b border-gray-100 dark:border-gray-800">
                                                <tr>
                                                    <th className="px-12 py-9 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('name')}>Namn</th>
                                                    <th className="px-12 py-9 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('company')}>Företag</th>
                                                    <th className="px-12 py-9">Status</th>
                                                    <th className="px-12 py-9 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('leadScore')}>AI Match</th>
                                                    <th className="px-12 py-9 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('value')}>Värde</th>
                                                    <th className="px-12 py-9 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {filteredLeads.map(l => (
                                                    <tr key={l.id} onClick={() => openDetails(l)} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all group cursor-pointer">
                                                        <td className="px-12 py-9">
                                                            <div className="flex items-center gap-8">
                                                                <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[12px] font-black text-gray-400 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white group-hover:scale-110 group-hover:rotate-6 shadow-sm">
                                                                    {l.name.substring(0,1)}
                                                                </div>
                                                                <div className="font-black text-gray-950 dark:text-white text-base tracking-tighter italic uppercase">{l.name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-12 py-9 text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{l.company}</td>
                                                        <td className="px-12 py-9">
                                                            <span className="px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] bg-black text-white dark:bg-white dark:text-black shadow-lg inline-block">
                                                                {l.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-12 py-9">
                                                            <div className="flex items-center gap-5">
                                                                <div className="flex-1 max-w-[150px] h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                                                    <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${l.leadScore}%` }}></div>
                                                                </div>
                                                                <span className="text-[12px] font-black text-gray-400 font-mono tracking-tighter">{l.leadScore}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-12 py-9 font-black text-gray-950 dark:text-white text-lg italic tracking-tighter">{l.value.toLocaleString()} kr</td>
                                                        <td className="px-12 py-9 text-right">
                                                            <div className="flex justify-end gap-5 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button onClick={(e) => { e.stopPropagation(); setLeadToDelete(l); }} className="p-4 text-gray-300 hover:text-red-500 transition-colors bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm"><Trash2 size={18}/></button>
                                                                <button className="p-4 text-gray-300 hover:text-black dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm"><ChevronRight size={20}/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. AI MAIL TAB - Tactile Writing Studio */}
                {activeTab === 'mail' && (
                    <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-12 px-4">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[4rem] p-16 md:p-24 shadow-sm relative overflow-hidden transition-all hover:shadow-2xl group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity"><Wand2 size={200} /></div>
                            <div className="flex justify-between items-center mb-20 relative z-10">
                                <div>
                                    <h2 className="text-5xl font-serif-display text-gray-950 dark:text-white uppercase tracking-tighter italic leading-none">Skrivhjälpen</h2>
                                    <p className="text-base text-gray-400 mt-4 font-bold uppercase tracking-[0.2em] italic">AI-driven säljcopy på sekunder</p>
                                </div>
                                <div className="w-20 h-20 bg-black dark:bg-white rounded-[2rem] flex items-center justify-center text-white dark:text-black shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500"><Wand2 size={36} /></div>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-24 relative z-10">
                                <div className="space-y-12">
                                    <div className="grid md:grid-cols-2 gap-12">
                                        <div className="space-y-4">
                                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] italic">Mottagare</label>
                                            <select value={selectedMailLeadId} onChange={e => setSelectedMailLeadId(e.target.value)} className="w-full bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-[2rem] border-2 border-transparent focus:border-black dark:focus:border-white text-sm font-black italic outline-none transition-all appearance-none cursor-pointer shadow-inner dark:text-white">
                                                <option value="">-- Välj person --</option>
                                                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] italic">Tonalitet</label>
                                            <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-full border border-gray-200/50 dark:border-gray-700 shadow-inner">
                                                {['Professionell', 'Personlig'].map(t => (
                                                    <button key={t} onClick={() => setSelectedTonality(t)} className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedTonality === t ? 'bg-black text-white dark:bg-white dark:text-black shadow-xl scale-105' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>{t}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] italic">Vad handlar mailet om?</label>
                                            <button onClick={generateFollowUpSuggestion} disabled={!selectedMailLeadId || isGeneratingSuggestion} className="text-[10px] font-black uppercase tracking-[0.2em] text-black dark:text-white hover:opacity-70 transition-all flex items-center gap-4 px-6 py-3 border-2 border-black/5 dark:border-white/5 rounded-full disabled:opacity-30 bg-white dark:bg-gray-800 shadow-sm active:scale-95">
                                                {isGeneratingSuggestion ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />} Ge förslag
                                            </button>
                                        </div>

                                        {suggestedPhrase && (
                                            <div className="p-10 bg-gray-50/50 dark:bg-gray-800/50 border-l-8 border-black dark:border-white rounded-3xl flex justify-between items-center animate-[slideUp_0.5s_ease-out] shadow-inner">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 font-black italic leading-relaxed pr-12">"{suggestedPhrase}"</p>
                                                <button onClick={useSuggestedPhrase} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:opacity-80 transition-all shadow-2xl shrink-0">Använd</button>
                                            </div>
                                        )}

                                        <textarea 
                                            value={mailPrompt} 
                                            onChange={e => setMailPrompt(e.target.value)} 
                                            placeholder="t.ex. 'Tacka för senast' eller 'Fråga om ett möte'..." 
                                            className="w-full h-72 bg-gray-50 dark:bg-gray-800 p-12 rounded-[3.5rem] border-2 border-transparent focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 resize-none outline-none transition-all text-base font-black italic leading-[2] shadow-inner dark:text-white" 
                                        />
                                    </div>

                                    <button onClick={generateAIMail} disabled={!selectedMailLeadId || !mailPrompt || isGeneratingMail} className="w-full py-8 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-[12px] uppercase tracking-[0.5em] hover:opacity-90 hover:-translate-y-2 transition-all disabled:opacity-30 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center gap-6 active:scale-[0.98]">
                                        {isGeneratingMail ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />} {isGeneratingMail ? "SKRIVER..." : "SKAPA UTKAST"}
                                    </button>
                                </div>

                                <div className="relative">
                                    {generatedMail ? (
                                        <div className="bg-gray-50/30 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-[4rem] p-16 h-full flex flex-col animate-[fadeIn_0.8s_ease-out] shadow-inner">
                                            <div className="flex justify-between items-center mb-12">
                                                <h3 className="font-black text-gray-300 uppercase tracking-[0.5em] text-[10px]">Färdigt utkast</h3>
                                                <div className="flex gap-4">
                                                    <button onClick={copyMail} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                                                        {copyStatus ? <Check size={16} className="text-green-500" /> : <Copy size={16} />} {copyStatus ? "KOPPIERAT" : "KOPIERA"}
                                                    </button>
                                                    <button onClick={sendMail} className="flex items-center gap-3 px-10 py-4 bg-black dark:bg-white text-white dark:text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:opacity-80 transition-all shadow-2xl active:scale-95">
                                                        <Send size={16} /> SKICKA
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-10 flex-1 flex flex-col">
                                                <div className="p-8 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] block mb-3">Ämnesrad</span>
                                                    <div className="text-lg font-black text-gray-950 dark:text-white italic tracking-tight uppercase leading-tight">{generatedMail.subject}</div>
                                                </div>
                                                <div className="p-16 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 flex-1 whitespace-pre-wrap text-base leading-[2.4] text-gray-800 dark:text-gray-200 font-black italic shadow-sm custom-scrollbar overflow-y-auto">
                                                    {generatedMail.body}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[5rem] flex flex-col items-center justify-center text-center p-24 space-y-10 opacity-30 grayscale group hover:opacity-50 transition-opacity">
                                            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-inner"><Mail size={56} className="text-gray-300" /></div>
                                            <div className="space-y-3">
                                                <p className="font-black text-gray-400 uppercase text-[12px] tracking-[0.5em]">Inget utkast ännu</p>
                                                <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.2em] max-w-xs mx-auto text-center">Välj en mottagare och ange kontext till vänster för att börja.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. INTELLIGENCE TAB - Premium Dossiers */}
                {activeTab === 'intelligence' && (
                    <div className="h-full pb-12 px-2">
                        {!activeReport ? (
                            <div className="space-y-16 animate-fadeIn">
                                <div className="bg-black text-white p-24 md:p-40 rounded-[5rem] text-center shadow-3xl relative overflow-hidden border border-white/5 group">
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] group-hover:opacity-20 transition-opacity"></div>
                                    <div className="relative z-10 max-w-3xl mx-auto">
                                        <div className="w-24 h-24 bg-white/10 rounded-[3rem] flex items-center justify-center mx-auto mb-12 backdrop-blur-xl border border-white/20 shadow-2xl rotate-12 group-hover:rotate-0 transition-all duration-700"><Sparkles size={44} className="text-white" /></div>
                                        <h2 className="font-serif-display text-7xl md:text-8xl mb-10 tracking-tighter italic uppercase leading-none">Bolagskoll</h2>
                                        <p className="text-gray-400 text-lg mb-20 leading-relaxed font-black uppercase tracking-[0.4em] text-[12px] max-w-xl mx-auto italic opacity-80">Fullständig bolagsanalys på sekunder. Powered by Real-Time Grounding.</p>
                                        
                                        <div className="flex flex-col md:flex-row gap-6 bg-white/10 backdrop-blur-3xl p-6 rounded-[5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                            <input 
                                                value={reportUrl} 
                                                onChange={e => setReportUrl(e.target.value)} 
                                                placeholder="Skriv in hemsida (t.ex. klarna.se)" 
                                                className="flex-1 bg-transparent px-10 py-6 text-2xl text-white outline-none placeholder:text-white/20 font-black italic tracking-tight" 
                                            />
                                            <button onClick={() => generateReport()} disabled={!reportUrl || isGeneratingReport} className="bg-white text-black px-20 py-6 rounded-full text-xs font-black uppercase tracking-[0.5em] hover:bg-gray-100 hover:scale-105 transition-all disabled:opacity-30 flex items-center justify-center gap-5 shadow-2xl active:scale-95">
                                                {isGeneratingReport ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                                {isGeneratingReport ? 'HÄMTAR DATA...' : 'ANALYSERA'}
                                            </button>
                                        </div>
                                        {isGeneratingReport && <div className="mt-16 text-[10px] font-black text-white/30 animate-pulse uppercase tracking-[0.8em]">{loadingMessage}</div>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                    {reports.map(report => (
                                        <div key={report.id} onClick={() => setActiveReport(report)} className="bg-white dark:bg-gray-900 rounded-[4rem] border border-gray-100 dark:border-gray-800 p-14 transition-all hover:shadow-[0_30px_80px_rgba(0,0,0,0.1)] hover:-translate-y-4 cursor-pointer group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={150} /></div>
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mb-12 text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:text-white group-hover:scale-110 transition-all border border-gray-100 shadow-sm"><FileText size={32}/></div>
                                            <h4 className="font-bold text-gray-950 dark:text-white truncate text-4xl mb-4 tracking-tighter italic uppercase leading-none">{report.title}</h4>
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] mb-12 italic">Färdig Analys</p>
                                            <div className="flex justify-between items-center pt-12 border-t border-gray-50 dark:border-gray-800">
                                                <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                                                <div className="flex gap-3">
                                                    <button onClick={(e) => { e.stopPropagation(); setReportToDelete(report); }} className="p-3 text-gray-200 hover:text-red-500 transition-colors bg-white dark:bg-gray-800 rounded-full border border-gray-100 shadow-sm"><Trash2 size={18} /></button>
                                                    <div className="p-3 text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-full border border-gray-100 shadow-sm"><ArrowUpRight size={22} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-[5rem] overflow-hidden border border-gray-100 shadow-[0_50px_150px_rgba(0,0,0,0.2)] animate-[slideUp_0.8s_ease-out]">
                                <div className="no-print bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-10 border-b border-gray-100 flex justify-between items-center sticky top-0 z-50">
                                    <div className="flex items-center gap-8">
                                        <button onClick={() => setActiveReport(null)} className="p-5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400 group active:scale-90"><ChevronRight className="rotate-180 group-hover:-translate-x-2 transition-transform" size={24} /></button>
                                        <div className="h-12 w-px bg-gray-100 dark:bg-gray-800" />
                                        <div>
                                            <h2 className="font-bold text-gray-950 dark:text-white text-3xl tracking-tighter uppercase italic leading-none">{activeReport.reportData.meta.companyName}</h2>
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] mt-2">Executive Snapshot Analysis</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <button onClick={handleDownloadPDF} disabled={isDownloading} className="px-12 py-4 bg-black dark:bg-white text-white dark:text-black text-[12px] font-black uppercase tracking-[0.4em] rounded-full hover:opacity-80 transition-all flex items-center gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] active:scale-95 disabled:opacity-50">
                                            {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18}/>} EXPORTERA PDF
                                        </button>
                                        <button onClick={() => setReportToDelete(activeReport)} className="p-5 bg-gray-50 dark:bg-gray-800 text-gray-300 rounded-full hover:text-black dark:hover:text-white transition-all shadow-inner border border-black/5 active:scale-90"><Trash2 size={24}/></button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 md:p-24 bg-gray-50/30 dark:bg-black/20 custom-scrollbar">
                                    <div id="printable-report" className="bg-white p-24 md:p-48 shadow-[0_80px_160px_rgba(0,0,0,0.05)] border border-gray-100 mx-auto max-w-5xl min-h-full text-black font-sans selection:bg-gray-200 mb-20 rounded-md">
                                        <div className="border-b-[20px] border-black pb-24 mb-32 flex justify-between items-end">
                                            <div className="space-y-16">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center text-white font-serif font-black text-5xl italic">A</div>
                                                    <span className="font-black tracking-[0.6em] text-[12px] uppercase text-black">Aceverse Intelligence</span>
                                                </div>
                                                <div>
                                                    <h1 className="text-9xl font-serif-display font-black uppercase tracking-tighter max-w-4xl leading-[0.7] text-black">RESEARCH<br/>REPORT</h1>
                                                    <p className="text-gray-400 text-[14px] mt-12 font-black uppercase tracking-[0.6em] italic">OBJECT: {activeReport.reportData.meta.companyName} // REAL-TIME ACCESS</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="font-black border-t-8 border-black pt-8 text-black text-xl uppercase tracking-[0.5em]">{activeReport.reportData.meta.generatedDate}</div>
                                                <div className="text-[12px] font-black text-gray-300 mt-5 uppercase tracking-[0.5em] italic">Confidential Property</div>
                                            </div>
                                        </div>
                                        <div className="max-w-none report-content text-black leading-[2.2] text-2xl font-medium italic space-y-16">
                                            {renderMarkdown(activeReport.reportData.fullMarkdown)}
                                        </div>
                                        <div className="mt-64 pt-24 border-t-[8px] border-black">
                                            <div className="flex items-center gap-6 text-gray-300 mb-10">
                                                <Sparkles size={36} />
                                                <span className="text-[12px] font-black uppercase tracking-[0.7em]">Neural Synthesis • Aceverse Engine</span>
                                            </div>
                                            <p className="text-[12px] text-gray-400 leading-relaxed font-black uppercase tracking-[0.5em] max-w-3xl italic opacity-60">Denna rapport är sammanställd av AI via neural länkning. Verifiera alltid kritiska affärsdata oberoende innan beslut.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* DETAIL SLIDE-OVER */}
            <div className={`fixed inset-y-0 right-0 z-[100] w-full md:w-[700px] bg-white dark:bg-gray-900 shadow-[0_0_200px_rgba(0,0,0,0.5)] transform transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) border-l border-gray-100 dark:border-gray-800 ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedLead && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-12 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900/95 backdrop-blur-3xl">
                            <span className="text-[12px] font-black uppercase tracking-[0.6em] text-gray-300 italic">Kundprofil // {selectedLead.name.split(' ')[0]}</span>
                            <button onClick={() => setIsDetailOpen(false)} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all border border-transparent hover:border-gray-100 active:scale-90 shadow-sm bg-white dark:bg-gray-900"><X size={36} strokeWidth={1} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-12 md:p-24 space-y-24 custom-scrollbar">
                            <div className="flex flex-col items-center text-center pb-20 border-b border-gray-50 dark:border-gray-800">
                                <div className="w-48 h-48 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-7xl font-serif text-gray-200 border-8 border-gray-50 dark:border-gray-700 shadow-inner italic mb-12 hover:scale-105 transition-transform duration-500">
                                    {selectedLead.name.substring(0,1)}
                                </div>
                                <h3 className="text-6xl font-serif-display font-black text-gray-950 dark:text-white mb-4 tracking-tighter uppercase italic leading-none">{selectedLead.name}</h3>
                                <p className="text-gray-400 font-black text-[14px] uppercase tracking-[0.6em] mb-12 italic">{selectedLead.company}</p>
                                <div className="flex flex-wrap justify-center gap-6">
                                    <div className="flex items-center gap-4 text-[11px] font-black text-black dark:text-white bg-gray-50 dark:bg-gray-800 px-8 py-4 rounded-full border border-black/5 shadow-inner uppercase tracking-[0.3em] italic transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <Zap size={16} fill="currentColor"/> Matchar: {selectedLead.leadScore}%
                                    </div>
                                    <div className={`text-[11px] font-black px-8 py-4 rounded-full border-2 uppercase tracking-[0.3em] shadow-sm italic transition-all ${selectedLead.priority === 'High' ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white scale-105' : 'bg-white text-gray-400 border-gray-100 dark:bg-gray-900 dark:border-gray-800'}`}>
                                        {selectedLead.priority === 'High' ? 'Viktig affär' : 'Normal'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="p-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-inner group">
                                    <label className="block text-[11px] font-black text-gray-300 uppercase tracking-[0.5em] mb-8 italic">Process-steg</label>
                                    <div className="relative">
                                        <select value={selectedLead.status} onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as any)} className="w-full bg-transparent font-black text-gray-950 dark:text-white text-3xl outline-none cursor-pointer tracking-tighter uppercase italic appearance-none">
                                            {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown size={24} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-200" />
                                    </div>
                                </div>
                                <div className="p-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-inner group">
                                    <label className="block text-[11px] font-black text-gray-300 uppercase tracking-[0.5em] mb-8 italic">Affärsvärde</label>
                                    <div className="flex items-end gap-4 font-black text-gray-950 dark:text-white text-3xl tracking-tighter uppercase italic">
                                        <input type="number" value={selectedLead.value} onChange={(e) => handleUpdateValue(selectedLead.id, Number(e.target.value))} className="bg-transparent w-full outline-none focus:text-black dark:focus:text-white transition-colors" />
                                        <span className="text-[12px] opacity-30 uppercase font-black tracking-[0.5em] mb-2">Kr</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-16">
                                <h4 className="text-[12px] font-black text-gray-300 uppercase tracking-[0.7em] italic">Kontaktinfo</h4>
                                <div className="space-y-12">
                                    <ContactRow icon={<Mail size={28}/>} label="E-post" value={selectedLead.email} />
                                    <ContactRow icon={<Phone size={28}/>} label="Telefon" value={selectedLead.phone || "Ej angivet"} />
                                    <ContactRow icon={<Linkedin size={28}/>} label="LinkedIn" value={selectedLead.linkedin || "Ingen länk"} link={selectedLead.linkedin} />
                                    <ContactRow icon={<Globe size={28}/>} label="Webbplats" value={selectedLead.website || "Ej angivet"} link={selectedLead.website} />
                                </div>
                            </div>

                            <div className="space-y-10 pb-40">
                                <h4 className="text-[12px] font-black text-gray-300 uppercase tracking-[0.7em] italic">Anteckningar</h4>
                                <textarea className="w-full h-80 p-16 bg-gray-50/50 dark:bg-gray-800/30 rounded-[4.5rem] border border-gray-100 dark:border-gray-800 outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 transition-all text-base font-black italic leading-[2.2] text-gray-700 dark:text-gray-300 shadow-inner custom-scrollbar" placeholder="Skriv fritt om personen eller mötet..." defaultValue={selectedLead.notes} onBlur={(e) => db.updateLead(user.id, selectedLead.id, { notes: e.target.value })} />
                            </div>
                        </div>

                        <div className="p-12 border-t border-gray-100 dark:border-gray-800 flex gap-8 bg-white dark:bg-gray-900/95 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
                            <button onClick={() => { setSelectedMailLeadId(selectedLead.id); setActiveTab('mail'); setIsDetailOpen(false); }} className="flex-1 py-7 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-[12px] uppercase tracking-[0.5em] flex items-center justify-center gap-6 hover:opacity-90 hover:-translate-y-2 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95">
                                <Mail size={24}/> SKRIV SÄLJMAIL
                            </button>
                            <button onClick={() => { setLeadToDelete(selectedLead); }} className="p-7 bg-gray-50 dark:bg-gray-800 text-gray-300 rounded-full hover:text-red-500 transition-all shadow-inner border border-black/5 active:scale-90">
                                <Trash2 size={28}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Backdrop */}
            {isDetailOpen && (
                <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setIsDetailOpen(false)}></div>
            )}

            {/* ADD CONTACT MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fadeIn" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[5rem] shadow-[0_100px_200px_rgba(0,0,0,0.5)] overflow-hidden animate-[slideUp_0.5s_ease-out] border border-white/10">
                        <div className="p-16 md:p-24 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Plus size={300} /></div>
                            <div className="flex justify-between items-center mb-16 relative z-10">
                                <h2 className="font-serif-display text-6xl text-gray-950 dark:text-white tracking-tighter uppercase italic leading-none">Lägg till kund</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-300 hover:text-black dark:hover:text-white active:scale-90"><X size={44} strokeWidth={1} /></button>
                            </div>
                            <form onSubmit={handleAddLead} className="space-y-16 relative z-10">
                                <div className="grid md:grid-cols-2 gap-16">
                                    <div className="space-y-4">
                                        <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.5em] italic">Fullständigt Namn *</label>
                                        <input required value={newLead.name || ''} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-7 rounded-[2rem] border-2 border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black italic shadow-inner" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.5em] italic">Företagsnamn *</label>
                                        <input required value={newLead.company || ''} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-7 rounded-[2rem] border-2 border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black italic shadow-inner" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.5em] italic">Process-steg</label>
                                        <div className="relative group">
                                            <select value={newLead.status || 'Nya'} onChange={e => setNewLead({...newLead, status: e.target.value as any})} className="w-full bg-gray-50 dark:bg-gray-800 p-7 rounded-[2rem] border-2 border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black uppercase tracking-[0.5em] shadow-inner appearance-none cursor-pointer">
                                                {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <ChevronDown size={20} className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.5em] italic">Affärsvärde (kr)</label>
                                        <input type="number" value={newLead.value || 0} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-800 p-7 rounded-[2rem] border-2 border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black tracking-tighter shadow-inner" />
                                    </div>
                                    <div className="space-y-4 col-span-2">
                                        <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.5em] italic">Kontakt e-post</label>
                                        <input value={newLead.email || ''} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-7 rounded-[2rem] border-2 border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black italic shadow-inner" placeholder="hej@företag.se" />
                                    </div>
                                </div>
                                <button disabled={isSavingLead} className="w-full py-9 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-[0.6em] hover:opacity-90 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-8 shadow-3xl active:scale-[0.98] mt-10">
                                    {isSavingLead ? <Loader2 className="animate-spin" size={28}/> : <Save size={28}/>} SPARRA I KUNDFLÖDET
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
    <button onClick={onClick} className={`flex items-center gap-3 px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 italic ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-2xl scale-110' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
        {icon}
        {label}
    </button>
);

const MetricCard = ({ title, value, icon, trend }: any) => (
    <div className="bg-white dark:bg-gray-900 p-12 rounded-[4.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group transition-all hover:shadow-2xl hover:-translate-y-2">
        <div className="flex justify-between items-start mb-12">
            <div className="w-18 h-18 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-200 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white dark:group-hover:text-white group-hover:scale-110 group-hover:rotate-6 shadow-sm p-4">
                {icon}
            </div>
            <div className="text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.3em] bg-gray-50 text-gray-400 dark:bg-gray-800 border border-transparent group-hover:border-black/5 group-hover:text-black dark:group-hover:text-white italic transition-all shadow-inner">{trend}</div>
        </div>
        <span className="text-[12px] font-black text-gray-300 uppercase tracking-[0.6em] mb-4 block italic">{title}</span>
        <div className="text-7xl font-serif-display font-black text-gray-950 dark:text-white tracking-tighter italic leading-none">{value}</div>
    </div>
);

const ContactRow = ({ icon, label, value, link }: any) => (
    <div className="flex items-center gap-14 group">
        <div className="w-18 h-18 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-200 group-hover:bg-black group-hover:text-white dark:group-hover:text-white transition-all border border-black/5 dark:border-white/5 group-hover:scale-110 group-hover:rotate-12 shadow-sm p-4">{icon}</div>
        <div className="flex-1 min-w-0">
            <span className="block text-[11px] font-black text-gray-300 uppercase tracking-[0.6em] mb-2 italic">{label}</span>
            {link ? (
                <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="text-2xl font-black text-gray-950 dark:text-white hover:underline truncate block tracking-tighter italic uppercase leading-none">
                    {value}
                </a>
            ) : (
                <span className="text-2xl font-black text-gray-950 dark:text-white truncate block tracking-tighter italic uppercase leading-none">{value}</span>
            )}
        </div>
    </div>
);

export default CRM;