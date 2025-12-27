
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Users, Plus, Search, Filter, Mail, Phone, 
    Globe, Linkedin, ArrowRight, BarChart3, PieChart, 
    FileText, Download, Loader2, Send, Copy,
    CheckCircle2, Target, DollarSign, Clock, Wand2,
    LayoutGrid, List, ChevronRight, Zap, GripVertical, 
    ChevronDown, Layers, HelpCircle, Info,
    Lightbulb, Check, ArrowUpRight, Trash2, Save, X,
    Activity, Building2, TrendingUp, ShieldCheck,
    Calendar, History, Maximize2, Minimize2, BrainCircuit, ExternalLink, Link2, Printer, Eye
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

type SortField = 'name' | 'company' | 'value' | 'lead_score' | 'status' | 'created_at';
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
    const [sortField, setSortField] = useState<SortField>('created_at');
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
    const [generationProgress, setGenerationProgress] = useState(0);
    const [thinkingMode, setThinkingMode] = useState<'fast' | 'extended'>('fast');
    const [isDownloading, setIsDownloading] = useState(false);
    const [reportCopyStatus, setReportCopyStatus] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
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
                lead_score: Math.floor(Math.random() * 40) + 30 
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
            await loadData();
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
            
            if (sortField === 'value' || sortField === 'lead_score') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else if (sortField === 'created_at') {
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

    const cleanJsonResponse = (text: string) => {
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) return match[0];
            return text;
        } catch (e) {
            return text;
        }
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

            const result = JSON.parse(cleanJsonResponse(response.text || '{}'));
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
        
        const isExtended = thinkingMode === 'extended';
        const MAX_TIME = 295000;
        setGenerationProgress(isExtended ? 5 : 10);
        setLoadingMessage(isExtended ? 'Initierar djupanalys (max 5 min)...' : 'Startar blixtsnabb analys...');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const modelName = isExtended ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
            const budget = isExtended ? 20000 : 0; 
            
            setGenerationProgress(isExtended ? 15 : 30);
            setLoadingMessage(isExtended ? 'Genomsöker källor noggrant...' : 'Hämtar och sammanställer data...');

            const prompt = `Gör en omfattande bolagsanalys av ${reportUrl}.
            Hitta: omsättning, EBITDA, soliditet, antal anställda, grundat år, verksamhet och marknadsposition.
            
            TIDSGRÄNS: Du har ABSOLUT MAX 5 minuter på dig (inklusive tänkande). Om du börjar närma dig tidsgränsen, AVBRYT djupanalysen och leverera omedelbart en komplett, sammanhängande och användbar rapport baserad på de data du hunnit bearbeta. 
            
            REGLER FOR EXTENDED THINKING:
            - MAX 20 reasoning-steg.
            - Försök inte göra rapporten perfekt, prioritera att bli klar i tid.
            - Markera i texten om delar är "stabilt underlag" eller "preliminära/approximerade".
            - FASTNA ALDRIG på sista steget.
            
            Rapporten ska vara på svenska och formaterad i Markdown. Använd inte asterisker (*) för listor, använd bindestreck (-) istället.
            Returnera resultatet som JSON:
            {
                "meta": { "companyName": "Bolagets Namn", "website": "${reportUrl}", "generatedDate": "${new Date().toLocaleDateString()}", "language": "sv" },
                "fullMarkdown": "Markdown innehåll...",
                "summary": { "revenue": "Omsättning", "ebitda": "EBITDA", "solvency": "Soliditet", "employees": "Antal anställda", "founded": "Grundat år" }
            }`;

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("PROCESS_TIMEOUT")), MAX_TIME)
            );

            let progInterval: any;
            if (isExtended) {
                progInterval = setInterval(() => {
                    setGenerationProgress(prev => {
                        const increment = Math.max(0.01, (98 - prev) / 250); 
                        return prev + increment;
                    });
                }, 1000);
            } else {
                progInterval = setInterval(() => {
                    setGenerationProgress(prev => Math.min(prev + 2, 90));
                }, 500);
            }

            const response = await Promise.race([
                ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: { 
                        tools: [{ googleSearch: {} }],
                        responseMimeType: 'application/json',
                        thinkingConfig: { thinkingBudget: budget }
                    }
                }),
                timeoutPromise
            ]) as any;

            if (progInterval) clearInterval(progInterval);
            
            setGenerationProgress(95);
            setLoadingMessage('Slutför rapporten...');

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const searchSources = groundingChunks
                .filter((chunk: any) => chunk.web)
                .map((chunk: any, index: number) => ({
                    id: index + 1,
                    url: chunk.web.uri,
                    title: chunk.web.title,
                    reliability: 100
                }));

            const rawJson = cleanJsonResponse(response.text || '{}');
            const reportData: CompanyReport = JSON.parse(rawJson);
            reportData.sources = searchSources;

            const entry = await db.addReportToHistory(user.id, reportData);
            
            setGenerationProgress(100);
            setReports(prev => [entry, ...prev]);
            setActiveReport(entry);
            setReportUrl('');
        } catch (e: any) {
            console.error(e);
            if (e.message === "PROCESS_TIMEOUT") {
                alert("Analysen tog för lång tid (över 5 minuter). Vänligen prova igen med 'Snabb' läge eller kontrollera webbadressen.");
            } else {
                alert("Rapportgenerering misslyckades. Kontrollera att hemsidan är korrekt.");
            }
        } finally {
            setIsGeneratingReport(false);
            setGenerationProgress(0);
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
                html2canvas: { scale: 2, useCORS: true, logging: false }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
            };
            // @ts-ignore
            await window.html2pdf().from(element).set(opt).save();
        } catch (error) { console.error(error); } finally { setIsDownloading(false); }
    };

    const handlePrintReport = () => {
        const element = document.getElementById('printable-report');
        if (!element) return;
        
        // Hämta hela HTML-innehållet för rapporten
        const content = element.innerHTML;
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            alert("Vänligen tillåt popup-fönster för att skriva ut rapporten.");
            return;
        }

        // Injicera nödvändig CSS och struktur för att rendera rapporten korrekt i det nya fönstret
        printWindow.document.write(`
            <html>
                <head>
                    <title>Aceverse Bolagsanalys - ${activeReport?.reportData.meta.companyName || ''}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Playfair+Display:ital,wght@0,900;1,900&display=swap" rel="stylesheet">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { background: white !important; margin: 0; padding: 20px; font-family: 'Inter', sans-serif; }
                        .font-serif-display { font-family: 'Playfair Display', serif; }
                        @media print {
                            body { padding: 0; }
                            @page { margin: 1cm; }
                        }
                        .no-print { display: none !important; }
                        .break-after-page { page-break-after: always; }
                    </style>
                </head>
                <body>
                    <div class="max-w-4xl mx-auto bg-white">
                        ${content}
                    </div>
                    <script>
                        window.onload = () => {
                            // Ge Tailwind och typsnitt en kort stund att rendera
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 800);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleCopyReport = async () => {
        if (!activeReport) return;
        const text = `
BOLAGSANALYS: ${activeReport.reportData.meta.companyName}
Webbplats: ${activeReport.reportData.meta.website}
Datum: ${activeReport.reportData.meta.generatedDate}

SAMMANFATTNING:
- Omsättning: ${activeReport.reportData.summary.revenue}
- EBITDA: ${activeReport.reportData.summary.ebitda}
- Soliditet: ${activeReport.reportData.summary.solvency}
- Anställda: ${activeReport.reportData.summary.employees}
- Grundat: ${activeReport.reportData.summary.founded}

INNEHÅLL:
${activeReport.reportData.fullMarkdown.replace(/#/g, '')}
        `.trim();
        
        try {
            await navigator.clipboard.writeText(text);
            setReportCopyStatus(true);
            setTimeout(() => setReportCopyStatus(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const renderMarkdown = (md: string) => {
        if (!md) return null;
        const cleanMd = md.replace(/\*/g, '');
        const lines = cleanMd.split('\n');
        const renderedElements: React.ReactNode[] = [];
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) renderedElements.push(<h1 key={i} className="text-3xl md:text-5xl font-serif-display font-black mb-10 border-b-8 border-black pb-8 pt-6 text-black uppercase tracking-tighter break-words overflow-wrap-anywhere w-full">{trimmed.replace('# ', '')}</h1>);
            else if (trimmed.startsWith('## ')) renderedElements.push(<h2 key={i} className="text-2xl md:text-3xl font-serif-display font-bold mt-12 mb-6 text-gray-900 border-b-2 border-gray-100 pb-3 break-words uppercase tracking-tight overflow-wrap-anywhere w-full">{trimmed.replace('## ', '')}</h2>);
            else if (trimmed.startsWith('### ')) renderedElements.push(<h3 key={i} className="text-lg md:text-xl font-bold mt-10 mb-4 text-gray-800 uppercase tracking-widest border-l-4 border-black pl-3 break-words overflow-wrap-anywhere w-full">{trimmed.replace('### ', '')}</h3>);
            else if (trimmed.startsWith('- ')) renderedElements.push(<li key={i} className="ml-6 text-sm md:text-base text-gray-700 list-none mb-3 flex items-start gap-3 break-words overflow-wrap-anywhere w-full"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2.5 shrink-0"></span><span className="font-medium leading-relaxed">{trimmed.substring(2)}</span></li>);
            else if (trimmed !== '') renderedElements.push(<p key={i} className="text-sm md:text-base leading-relaxed text-gray-700 mb-6 text-justify font-medium italic break-words overflow-wrap-anywhere w-full">{trimmed}</p>);
            else renderedElements.push(<div key={i} className="h-4" />);
        });
        return renderedElements;
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn relative selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <DeleteConfirmModal isOpen={!!reportToDelete} onClose={() => setReportToDelete(null)} onConfirm={confirmDeleteReport} itemName={reportToDelete?.title || ''} />
            <DeleteConfirmModal isOpen={!!leadToDelete} onClose={() => setLeadToDelete(null)} onConfirm={confirmDeleteLead} itemName={leadToDelete?.name || ''} />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 no-print gap-6 px-4">
                <div className="space-y-1">
                    <h1 className="font-serif-display text-4xl text-gray-950 dark:text-white tracking-tight uppercase italic leading-none">Kundflöde</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Pipeline & Intelligence</span>
                        <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                        <span className="text-gray-900 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest">{leads.length} Kontakter</span>
                    </div>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl no-print backdrop-blur-md border border-gray-200/50 dark:border-gray-700 shadow-sm overflow-x-auto max-w-full hide-scrollbar">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={14} />} label="Överblick" />
                    <TabButton active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} icon={<Users size={14} />} label="Mina Kunder" />
                    <TabButton active={activeTab === 'mail'} onClick={() => setActiveTab('mail')} icon={<Mail size={14} />} label="Skrivhjälp" />
                    <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={<Zap size={14} />} label="Bolagskoll" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-10 animate-fadeIn pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <MetricCard title="Värde i flödet" value={`${pipelineTotal.toLocaleString()} kr`} icon={<DollarSign size={24} />} trend="Ackumulerat" />
                            <MetricCard title="Öppna förfrågningar" value={`${leads.length} st`} icon={<Target size={24} />} trend={`${leads.filter(l => l.status === 'Nya').length} Nya idag`} />
                            <MetricCard title="AI Match-index" value={leads.length > 0 ? `${Math.round(leads.reduce((a,b) => a + (b.lead_score || 0), 0) / leads.length)}%` : "0%"} icon={<Zap size={24} />} trend="Matchningsgrad" />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-10 shadow-sm transition-all hover:shadow-lg group">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="font-black text-[11px] text-gray-400 uppercase tracking-widest flex items-center gap-3">Pipeline Fördelning</h3>
                                    <PieChart size={18} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-6">
                                    {STATUS_STAGES.map(s => {
                                        const count = leads.filter(l => l.status === s).length;
                                        const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                                        return (
                                            <div key={s} className="space-y-2">
                                                <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                                                    <span className="text-gray-500">{s}</span>
                                                    <span className="text-black dark:text-white">{count} st</span>
                                                </div>
                                                <div className="h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-10 shadow-sm transition-all hover:shadow-lg group">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="font-black text-[11px] text-gray-400 uppercase tracking-widest flex items-center gap-3">Senaste Interaktioner</h3>
                                    <Clock size={18} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-8">
                                    {leads.length > 0 ? leads.slice(0, 4).map((l, i) => (
                                        <div key={i} className="flex items-center gap-5 group cursor-pointer" onClick={() => openDetails(l)}>
                                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[12px] font-black text-gray-400 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white shadow-sm">
                                                {l.name.substring(0,1)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-950 dark:text-white truncate uppercase italic">{l.name}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{l.company}</p>
                                            </div>
                                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">{l.priority}</div>
                                        </div>
                                    )) : <div className="text-center py-10 text-gray-300 text-xs font-bold uppercase tracking-widest opacity-40">Ingen aktivitet än.</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CONTACTS TAB */}
                {activeTab === 'contacts' && (
                    <div className="h-full flex flex-col space-y-8 animate-fadeIn pb-10">
                        {/* Toolbar */}
                        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center no-print">
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                    <LayoutGrid size={14}/> Tavla
                                </button>
                                <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                    <List size={14}/> Lista
                                </button>
                            </div>
                            
                            <div className="relative flex-1 w-full max-w-2xl group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={16} />
                                <input 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    placeholder="Sök kontakt eller bolag..." 
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl pl-14 pr-8 py-4 text-sm focus:border-black dark:focus:border-white focus:bg-white outline-none transition-all text-gray-900 dark:text-white shadow-sm font-bold italic" 
                                />
                            </div>

                            <button onClick={() => setIsAddModalOpen(true)} className="w-full lg:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:opacity-80 transition-all shadow-xl active:scale-95">
                                <Plus size={18} /> Lägg till
                            </button>
                        </div>

                        {viewMode === 'kanban' ? (
                            <div className="flex-1 overflow-x-auto pb-10 hide-scrollbar">
                                <div className="flex gap-6 h-full min-w-max pr-10">
                                    {STATUS_STAGES.map(stage => {
                                        const isOver = dragOverStage === stage;
                                        const stageLeads = filteredLeads.filter(l => l.status === stage);
                                        
                                        return (
                                            <div 
                                                key={stage} 
                                                onDragOver={(e) => handleDragOver(e, stage)}
                                                onDrop={(e) => handleDrop(e, stage)}
                                                onDragLeave={() => setDragOverStage(null)}
                                                className={`w-[320px] flex flex-col h-full rounded-[2rem] p-6 border transition-all duration-300 ${isOver ? 'bg-gray-100 dark:bg-gray-800 border-black dark:border-white scale-[1.02] shadow-2xl' : 'bg-gray-50/50 dark:bg-black/20 border-transparent'}`}
                                            >
                                                <div className="flex justify-between items-center mb-8 px-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-black text-[10px] text-gray-950 dark:text-white uppercase tracking-widest">{stage}</h3>
                                                        <span className="text-[10px] font-black text-gray-400 bg-white dark:bg-gray-900 px-2.5 py-0.5 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">{stageLeads.length}</span>
                                                    </div>
                                                    <HelpCircle size={14} className="text-gray-300 cursor-help hover:text-black dark:hover:text-white transition-colors" />
                                                </div>
                                                
                                                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                                                    {stageLeads.map(lead => (
                                                        <div 
                                                            key={lead.id} 
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                                            onDragEnd={handleDragEnd}
                                                            onClick={() => openDetails(lead)} 
                                                            className={`bg-white dark:bg-gray-900 p-6 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden ${draggedLeadId === lead.id ? 'opacity-30' : 'hover:-translate-y-1'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white shadow-sm">
                                                                    {lead.name.substring(0,1)}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <div className="flex items-center gap-1 text-[8px] font-black text-black dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg uppercase tracking-wider italic shadow-inner">
                                                                        <Zap size={10} fill="currentColor"/> {lead.lead_score}%
                                                                    </div>
                                                                    {lead.priority === 'High' && (
                                                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase bg-black text-white dark:bg-white dark:text-black tracking-wider shadow-sm">Prio</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <h4 className="font-bold text-gray-950 dark:text-white text-sm mb-1 truncate tracking-tight uppercase italic leading-none">{lead.name}</h4>
                                                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-6 truncate uppercase tracking-widest font-black">{lead.company}</p>
                                                            
                                                            <div className="flex justify-between items-center pt-5 border-t border-gray-50 dark:border-gray-800">
                                                                <div className="flex gap-3 opacity-20 group-hover:opacity-100 transition-all">
                                                                    {lead.email && <Mail size={14} />}
                                                                    {lead.linkedin && <Linkedin size={14} />}
                                                                </div>
                                                                <div className="text-[12px] font-black text-gray-950 dark:text-white tracking-tight italic">{lead.value.toLocaleString()} kr</div>
                                                            </div>

                                                            <div className="absolute top-1/2 left-1.5 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                                                                <GripVertical size={16} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {stageLeads.length === 0 && !isOver && (
                                                        <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center opacity-20 grayscale hover:opacity-40 transition-opacity cursor-pointer">
                                                            <Layers size={24} className="mb-2" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Tom Sektion</span>
                                                        </div>
                                                    )}

                                                    <button onClick={() => { setNewLead({ ...newLead, status: stage as any }); setIsAddModalOpen(true); }} className="w-full py-5 rounded-[1.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-300 hover:text-black dark:hover:text-white hover:border-black transition-all bg-white/5 hover:bg-white dark:hover:bg-gray-900 shadow-sm group">
                                                        <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-6 animate-fadeIn">
                                <div className="flex flex-col sm:flex-row items-center justify-between px-4 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Filter size={14} className="text-gray-400" />
                                        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700 shadow-inner overflow-x-auto hide-scrollbar">
                                            {['Alla', ...STATUS_STAGES].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatusFilter(s)}
                                                    className={`px-5 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${statusFilter === s ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic opacity-60">
                                        Totalt: {filteredLeads.length} personer
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all hover:shadow-lg">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 dark:border-gray-800">
                                                <tr>
                                                    <th className="px-8 py-6 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('name')}>Namn</th>
                                                    <th className="px-8 py-6 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('company')}>Företag</th>
                                                    <th className="px-8 py-6">Status</th>
                                                    <th className="px-8 py-6 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('lead_score')}>AI Match</th>
                                                    <th className="px-8 py-6 cursor-pointer group hover:text-black dark:hover:text-white" onClick={() => toggleSort('value')}>Värde</th>
                                                    <th className="px-8 py-6 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {filteredLeads.map(l => (
                                                    <tr key={l.id} onClick={() => openDetails(l)} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all group cursor-pointer">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white shadow-sm">
                                                                    {l.name.substring(0,1)}
                                                                </div>
                                                                <div className="font-black text-gray-950 dark:text-white text-sm tracking-tight italic uppercase">{l.name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-[11px] font-black uppercase tracking-wider text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{l.company}</td>
                                                        <td className="px-8 py-6">
                                                            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black shadow-md inline-block">
                                                                {l.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 max-w-[100px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${l.lead_score}%` }}></div>
                                                                </div>
                                                                <span className="text-[11px] font-black text-gray-400 font-mono">{l.lead_score}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 font-black text-gray-950 dark:text-white text-sm italic tracking-tight">{l.value.toLocaleString()} kr</td>
                                                        <td className="px-8 py-6 text-right">
                                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button onClick={(e) => { e.stopPropagation(); setLeadToDelete(l); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                                <button className="p-2 text-gray-300 hover:text-black dark:hover:text-white transition-colors"><ChevronRight size={18}/></button>
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

                {/* 3. AI MAIL TAB */}
                {activeTab === 'mail' && (
                    <div className="max-w-6xl mx-auto space-y-10 animate-fadeIn pb-10">
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-10 md:p-16 shadow-sm relative overflow-hidden transition-all hover:shadow-xl group">
                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><Wand2 size={150} /></div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 relative z-10 gap-6">
                                <div>
                                    <h2 className="text-4xl font-serif-display text-gray-950 dark:text-white uppercase tracking-tight italic leading-none">Skrivhjälpen</h2>
                                    <p className="text-sm text-gray-400 mt-2 font-bold uppercase tracking-widest italic">AI-driven säljcopy på sekunder</p>
                                </div>
                                <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black shadow-2xl rotate-3 group-hover:rotate-0 transition-all duration-500"><Zap size={28} /></div>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-16 relative z-10">
                                <div className="space-y-10">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Mottagare</label>
                                            <select value={selectedMailLeadId} onChange={e => setSelectedMailLeadId(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-transparent focus:border-black dark:focus:border-white text-sm font-black italic outline-none transition-all appearance-none cursor-pointer shadow-inner dark:text-white">
                                                <option value="">-- Välj person --</option>
                                                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tonalitet</label>
                                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700 shadow-inner">
                                                {['Professionell', 'Personlig'].map(t => (
                                                    <button key={t} onClick={() => setSelectedTonality(t)} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedTonality === t ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>{t}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Vad handlar mailet om?</label>
                                            <button onClick={generateFollowUpSuggestion} disabled={!selectedMailLeadId || isGeneratingSuggestion} className="text-[9px] font-black uppercase tracking-widest text-black dark:text-white hover:opacity-70 transition-all flex items-center gap-2 px-4 py-2 border border-black/5 dark:border-white/5 rounded-full disabled:opacity-30 bg-white dark:bg-gray-800 shadow-sm active:scale-95">
                                                {isGeneratingSuggestion ? <Loader2 size={10} className="animate-spin" /> : <Lightbulb size={10} />} Ge förslag
                                            </button>
                                        </div>

                                        {suggestedPhrase && (
                                            <div className="p-6 bg-gray-50 dark:bg-gray-800 border-l-4 border-black dark:border-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center animate-[slideUp_0.4s_ease-out] shadow-inner gap-4">
                                                <p className="text-xs text-gray-700 dark:text-gray-300 font-bold italic leading-relaxed">"{suggestedPhrase}"</p>
                                                <button onClick={useSuggestedPhrase} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-all shadow-lg shrink-0">Använd</button>
                                            </div>
                                        )}

                                        <textarea 
                                            value={mailPrompt} 
                                            onChange={e => setMailPrompt(e.target.value)} 
                                            placeholder="t.ex. 'Tacka för senast' eller 'Fråga om ett möte'..." 
                                            className="w-full h-64 bg-gray-50 dark:bg-gray-800 p-8 rounded-[2rem] border border-transparent focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 resize-none outline-none transition-all text-sm font-black italic leading-relaxed shadow-inner dark:text-white" 
                                        />
                                    </div>

                                    <button onClick={generateAIMail} disabled={!selectedMailLeadId || !mailPrompt || isGeneratingMail} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 hover:-translate-y-1 transition-all disabled:opacity-30 shadow-xl flex items-center justify-center gap-4 active:scale-[0.98]">
                                        {isGeneratingMail ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />} {isGeneratingMail ? "SKRIVER..." : "SKAPA UTKAST"}
                                    </button>
                                </div>

                                <div className="relative">
                                    {generatedMail ? (
                                        <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-10 h-full flex flex-col animate-[fadeIn_0.6s_ease-out] shadow-inner">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                                                <h3 className="font-black text-gray-300 uppercase tracking-widest text-[9px]">Färdigt utkast</h3>
                                                <div className="flex gap-3 w-full sm:w-auto">
                                                    <button onClick={copyMail} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                                                        {copyStatus ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} {copyStatus ? "KOPPIERAT" : "KOPIERA"}
                                                    </button>
                                                    <button onClick={sendMail} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:opacity-80 transition-all shadow-lg active:scale-95">
                                                        <Send size={14} /> SKICKA
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-8 flex-1 flex flex-col">
                                                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2">Ämnesrad</span>
                                                    <div className="text-base font-black text-gray-950 dark:text-white italic tracking-tight uppercase leading-tight">{generatedMail.subject}</div>
                                                </div>
                                                <div className="p-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-bold italic shadow-sm overflow-y-auto custom-scrollbar">
                                                    {generatedMail.body}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-30 group hover:opacity-50 transition-opacity">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-inner"><Mail size={40} className="text-gray-300" /></div>
                                            <div className="space-y-2">
                                                <p className="font-black text-gray-400 uppercase text-[10px] tracking-widest">Inget utkast ännu</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider max-w-[200px] mx-auto text-center leading-relaxed">Välj en mottagare och ange kontext till vänster för att börja.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. INTELLIGENCE TAB (BOLAGSKOLLEN) */}
                {activeTab === 'intelligence' && (
                    <div className="h-full pb-12 px-2 animate-fadeIn">
                        {!activeReport ? (
                            <div className="space-y-16">
                                <div className="bg-black text-white p-20 md:p-32 rounded-[4rem] text-center shadow-3xl relative overflow-hidden border border-white/5 group transition-all hover:scale-[1.01]">
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] group-hover:opacity-20 transition-opacity"></div>
                                    <div className="relative z-10 max-w-4xl mx-auto">
                                        <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 backdrop-blur-xl border border-white/20 shadow-2xl rotate-12 group-hover:rotate-0 transition-all duration-700">
                                            <Zap size={36} className="text-white" />
                                        </div>
                                        <h2 className="font-serif-display text-6xl md:text-7xl mb-8 tracking-tighter italic uppercase leading-none">Bolagsanalys</h2>
                                        <p className="text-gray-400 text-sm mb-16 leading-relaxed font-black uppercase tracking-[0.4em] italic opacity-80">Djupgående Research & Financial Insights • Real-Time Grounding</p>
                                        
                                        <div className="flex flex-col items-center gap-8">
                                            <div className="flex flex-col items-center gap-4">
                                                {/* Thinking Mode Switcher */}
                                                <div className="flex items-center gap-1 p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                                                    <button 
                                                        onClick={() => setThinkingMode('fast')}
                                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${thinkingMode === 'fast' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white'}`}
                                                    >
                                                        <Zap size={14} className={thinkingMode === 'fast' ? 'fill-current' : ''} /> Snabb
                                                    </button>
                                                    <button 
                                                        onClick={() => setThinkingMode('extended')}
                                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${thinkingMode === 'extended' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white'}`}
                                                    >
                                                        <BrainCircuit size={14} className={thinkingMode === 'extended' ? 'fill-current' : ''} /> Extended Thinking
                                                    </button>
                                                </div>
                                                {/* Explanation Text */}
                                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-center max-w-sm italic">
                                                    {thinkingMode === 'extended' 
                                                        ? 'Extended Thinking är mer träffsäker men tar ca 3-5 minuter då den analyserar på djupet.' 
                                                        : 'Snabbt läge ger omedelbara resultat för enklare överblick.'}
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-4 bg-white/10 backdrop-blur-3xl p-4 rounded-[4rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus-within:ring-2 ring-white/20 transition-all w-full max-w-2xl">
                                                <input 
                                                    value={reportUrl} 
                                                    onChange={e => setReportUrl(e.target.value)} 
                                                    placeholder="Skriv in hemsida (t.ex. klarna.se)" 
                                                    className="flex-1 bg-transparent px-8 py-5 text-xl text-white outline-none placeholder:text-white/20 font-black italic tracking-tight" 
                                                />
                                                <button 
                                                    onClick={() => generateReport()} 
                                                    disabled={!reportUrl || isGeneratingReport} 
                                                    className="bg-white text-black px-16 py-5 rounded-full text-xs font-black uppercase tracking-[0.5em] hover:bg-gray-100 hover:scale-105 transition-all disabled:opacity-30 flex items-center justify-center gap-4 shadow-2xl active:scale-95"
                                                >
                                                    {isGeneratingReport ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                                    {isGeneratingReport ? 'ARBETAR...' : 'STARTA ANALYS'}
                                                </button>
                                            </div>
                                        </div>
                                        {isGeneratingReport && (
                                            <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden relative border border-white/5">
                                                    <div 
                                                        className="absolute top-0 left-0 h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.8)] relative" 
                                                        style={{ width: `${generationProgress}%` }}
                                                    >
                                                        {/* Animated Shimmer Overlap */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center w-full px-1">
                                                    <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em] animate-pulse italic flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                                        {loadingMessage}
                                                    </div>
                                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{Math.round(generationProgress)}%</div>
                                                </div>
                                                {thinkingMode === 'extended' && (
                                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-2">Detta brukar ta mellan 3 och 5 minuter.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex justify-between items-center px-4">
                                        <h3 className="font-black text-[11px] text-gray-400 uppercase tracking-[0.5em] flex items-center gap-3">
                                            <History size={16} /> Arkiverade Rapporter
                                        </h3>
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{reports.length} st sparade</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {reports.map(report => (
                                            <div key={report.id} onClick={() => setActiveReport(report)} className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:-translate-y-2 cursor-pointer group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none"><Building2 size={120} /></div>
                                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mb-8 text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:text-white transition-all border border-gray-100/50 shadow-sm">
                                                    <FileText size={28}/>
                                                </div>
                                                <h4 className="font-bold text-gray-950 dark:text-white truncate text-3xl mb-3 tracking-tighter italic uppercase leading-none">{report.title}</h4>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 italic">Research Dossier</p>
                                                
                                                <div className="flex flex-wrap gap-2 mb-8 h-8 overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity">
                                                    {report.reportData.sources?.slice(0, 3).map((s, i) => (
                                                        <span key={i} className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                            <Link2 size={8} /> {new URL(s.url).hostname.replace('www.', '')}
                                                        </span>
                                                    ))}
                                                    {report.reportData.sources && report.reportData.sources.length > 3 && (
                                                        <span className="text-[8px] font-black text-gray-400 px-2 py-1">+{report.reportData.sources.length - 3} till</span>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center pt-8 border-t border-gray-50 dark:border-gray-800">
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                                        <Clock size={12} /> {new Date(report.created_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setReportToDelete(report); }} 
                                                            className="p-2.5 text-gray-200 hover:text-red-500 transition-colors bg-white dark:bg-gray-800 rounded-full border border-gray-100 shadow-sm"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className="p-2.5 text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-full border border-gray-100 shadow-sm">
                                                            <ArrowUpRight size={18} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {reports.length === 0 && !isGeneratingReport && (
                                            <div className="col-span-full py-32 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] flex flex-col items-center justify-center text-center opacity-20 grayscale transition-opacity">
                                                <Layers size={48} className="mb-4" />
                                                <p className="font-black text-xs uppercase tracking-[0.6em]">Inga tidigare analyser</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[99999] rounded-none bg-white' : 'rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-gray-100 animate-[slideUp_0.6s_ease-out]'}`}>
                                {/* Sticky Header - Hidden in Fullscreen */}
                                {!isFullScreen && (
                                    <div className="no-print bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 z-50">
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => { setActiveReport(null); setIsFullScreen(false); }} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400 group active:scale-90">
                                                <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
                                            </button>
                                            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800" />
                                            <div>
                                                <h2 className="font-bold text-gray-950 dark:text-white text-2xl tracking-tighter uppercase italic leading-none">{activeReport.reportData.meta.companyName}</h2>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">Comprehensive Intelligence</span>
                                                    <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                    <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.4em] flex items-center gap-1"><ShieldCheck size={10}/> Verified Data</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => setIsFullScreen(true)} className="px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.4em] rounded-full hover:opacity-80 transition-all flex items-center gap-3 shadow-xl active:scale-95 no-print">
                                                <Maximize2 size={16}/> LÄS I HELSKÄRM
                                            </button>
                                            <button onClick={() => setReportToDelete(activeReport)} className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-300 rounded-full hover:text-black dark:hover:text-white transition-all shadow-inner border border-black/5 active:scale-90 no-print">
                                                <Trash2 size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Fullscreen Toolbar - Enhanced Accessibility & Visibility */}
                                {isFullScreen && (
                                    <div className="fixed top-[100px] right-12 z-[1000000] flex flex-col gap-5 no-print items-center">
                                        <div className="bg-white/80 backdrop-blur-xl border border-black/10 p-2 rounded-full shadow-3xl flex flex-col gap-3">
                                            <button 
                                                onClick={handleCopyReport}
                                                className="p-3.5 bg-white text-black rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all border border-black/5"
                                                title="Kopiera rapport"
                                            >
                                                {reportCopyStatus ? <Check size={26} className="text-green-500" /> : <Copy size={26} />}
                                            </button>
                                            
                                            <button 
                                                onClick={handlePrintReport} 
                                                className="p-3.5 bg-white text-black rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all border border-black/5"
                                                title="Skriv ut rapport"
                                            >
                                                <Printer size={26} strokeWidth={2.5} />
                                            </button>

                                            <button 
                                                onClick={handleDownloadPDF} 
                                                disabled={isDownloading}
                                                className="p-3.5 bg-white text-black rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all border border-black/5 disabled:opacity-50"
                                                title="Ladda ned som PDF"
                                            >
                                                {isDownloading ? <Loader2 className="animate-spin" size={26} /> : <Download size={26} />}
                                            </button>
                                        </div>
                                        
                                        <button 
                                            onClick={() => setIsFullScreen(false)} 
                                            className="p-5 bg-black text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center font-black uppercase text-sm tracking-widest border border-white/20 w-40"
                                            aria-label="Stäng helskärm"
                                        >
                                            <X size={24} strokeWidth={3} className="mr-2" /> STÄNG
                                        </button>
                                    </div>
                                )}

                                <div className="flex-1 flex overflow-hidden min-h-0">
                                    {/* Sidebar Summary - Only visible in Non-Fullscreen */}
                                    {!isFullScreen && (
                                        <div className="w-80 bg-[#ECE3D0] dark:bg-black/40 border-r border-gray-100 dark:border-gray-800 p-10 overflow-y-auto no-print hidden lg:block custom-scrollbar">
                                            <h3 className="font-black text-[10px] text-gray-500 uppercase tracking-[0.5em] mb-10 italic">Data Snapshot</h3>
                                            <div className="space-y-12">
                                                <SidebarMetric label="Omsättning" value={activeReport.reportData.summary.revenue} icon={<DollarSign size={14}/>} />
                                                <SidebarMetric label="EBITDA" value={activeReport.reportData.summary.ebitda} icon={<TrendingUp size={14}/>} />
                                                <SidebarMetric label="Soliditet" value={activeReport.reportData.summary.solvency} icon={<Activity size={14}/>} />
                                                <SidebarMetric label="Anställda" value={activeReport.reportData.summary.employees} icon={<Users size={14}/>} />
                                                <SidebarMetric label="Grundat" value={activeReport.reportData.summary.founded} icon={<Calendar size={14}/>} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Main Content Area - Isolated White Canvas */}
                                    <div className={`flex-1 overflow-y-auto bg-white custom-scrollbar transition-all min-h-0 ${isFullScreen ? 'flex flex-col items-center justify-start p-0 py-40' : 'flex items-center justify-center p-12'}`}>
                                        {!isFullScreen ? (
                                            <div className="max-w-md text-center space-y-8 animate-fadeIn">
                                                <div className="w-24 h-24 bg-black dark:bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                                                    <FileText size={40} className="text-white dark:text-black" />
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-serif-display font-black text-black dark:text-white uppercase italic tracking-tighter mb-4">Analys Klar</h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">För att garantera högsta läsbarhet och fokus krävs helskärmsläge för att granska denna research-rapport.</p>
                                                </div>
                                                <button 
                                                    onClick={() => setIsFullScreen(true)}
                                                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
                                                >
                                                    <Maximize2 size={18} /> ÖPPNA FULLSTÄNDIG RAPPORT
                                                </button>
                                            </div>
                                        ) : (
                                            <div 
                                                id="printable-report" 
                                                className="bg-white shadow-none mx-auto text-black font-sans selection:bg-gray-100 overflow-visible break-words relative transition-all w-full max-w-5xl rounded-none py-16 px-6 sm:px-12 md:px-24 lg:px-32 flex flex-col items-center"
                                            >
                                                {/* --- COVER PAGE --- */}
                                                <div className="min-h-[85vh] w-full flex flex-col justify-between border-[15px] border-black p-8 sm:p-12 md:p-16 lg:p-20 mb-32 transition-all bg-white break-after-page">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white font-serif font-black text-4xl italic shadow-2xl">A</div>
                                                            <div className="space-y-1">
                                                                <span className="font-black tracking-[0.6em] text-[11px] uppercase text-black block">Aceverse Intel</span>
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] block">Research Dossier v3.1</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-2 border-black pl-4 sm:pl-0 sm:pr-4 py-1">
                                                            <div className="text-[10px] font-black text-black uppercase tracking-[0.5em] mb-1">Dossier ID:</div>
                                                            <div className="text-[11px] font-mono font-bold text-gray-500 uppercase">#{activeReport.id.substring(0,10)}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 flex flex-col justify-center py-16">
                                                        <div className="space-y-8 max-w-full overflow-hidden">
                                                            <div className="h-2 w-32 bg-black"></div>
                                                            <h1 className="text-6xl sm:text-8xl md:text-9xl font-serif-display font-black uppercase tracking-tighter leading-[0.85] text-black break-words overflow-wrap-anywhere">
                                                                BOLAGS<br/>ANALYS
                                                            </h1>
                                                            <div className="flex flex-col md:flex-row md:items-center gap-6 mt-12 pt-12 border-t border-gray-100">
                                                                <div className="flex items-center gap-4 text-black">
                                                                    <ShieldCheck size={24} strokeWidth={2.5} />
                                                                    <span className="text-base sm:text-lg font-black uppercase tracking-[0.4em] italic">Subjekt:</span>
                                                                </div>
                                                                <div className="text-3xl sm:text-4xl md:text-5xl font-serif-display font-black text-black italic break-words overflow-wrap-anywhere uppercase">
                                                                    {activeReport.reportData.meta.companyName}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col md:flex-row justify-between items-end gap-12 pt-16 border-t-[5px] border-black">
                                                        <div className="grid grid-cols-2 gap-x-12 gap-y-8 w-full md:w-auto">
                                                            <div className="space-y-1">
                                                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Datum</span>
                                                                <span className="text-lg sm:text-xl font-black uppercase tracking-widest text-black whitespace-nowrap">{activeReport.reportData.meta.generatedDate}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Klassificering</span>
                                                                <span className="text-lg sm:text-xl font-black uppercase tracking-widest text-black">Audit</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right w-full md:w-auto">
                                                            <span className="block text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic mb-2">Authenticated by</span>
                                                            <div className="font-serif-display text-2xl sm:text-3xl font-black italic uppercase leading-none">Aceverse AI</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* --- DOCUMENT BODY --- */}
                                                <div className="report-content w-full text-black leading-[1.8] text-lg font-medium space-y-16 max-w-full overflow-hidden px-4 sm:px-0 bg-white">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-16 border-y-2 border-gray-100 mb-20 bg-white p-6 sm:p-10 rounded-2xl transition-all">
                                                        <ReportInternalMetric label="Omsättning" value={activeReport.reportData.summary.revenue} />
                                                        <ReportInternalMetric label="EBITDA" value={activeReport.reportData.summary.ebitda} />
                                                        <ReportInternalMetric label="Soliditet" value={activeReport.reportData.summary.solvency} />
                                                        <ReportInternalMetric label="Anställda" value={activeReport.reportData.summary.employees} />
                                                        <ReportInternalMetric label="Grundat" value={activeReport.reportData.summary.founded} />
                                                        <ReportInternalMetric label="Hemsida" value={activeReport.reportData.meta.website} />
                                                    </div>

                                                    <div className="space-y-12">
                                                        {renderMarkdown(activeReport.reportData.fullMarkdown)}
                                                    </div>
                                                </div>

                                                {/* --- SOURCES --- */}
                                                {activeReport.reportData.sources && activeReport.reportData.sources.length > 0 && (
                                                    <div className="mt-32 pt-16 border-t-[8px] border-black no-print bg-white w-full">
                                                        <h4 className="text-2xl font-black uppercase tracking-[0.3em] text-black mb-12 italic px-4 sm:px-0">Verified Source Dossier</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-0">
                                                            {activeReport.reportData.sources.map((source: any) => (
                                                                <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-5 p-6 bg-white hover:bg-black hover:text-white transition-all duration-300 rounded-2xl border-2 border-gray-100 group overflow-hidden">
                                                                    <div className="w-10 h-10 rounded-xl bg-black text-white group-hover:bg-white group-hover:text-black flex items-center justify-center text-xs font-black shrink-0 transition-colors">{source.id}</div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-black uppercase tracking-tight truncate mb-1">{source.title}</div>
                                                                        <div className="text-[10px] opacity-40 truncate font-mono">{source.url}</div>
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-48 pt-16 border-t-[4px] border-black px-4 sm:px-0 bg-white w-full">
                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                                        <div className="flex items-center gap-4 text-gray-400">
                                                            <Activity size={24} className="text-black" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Aceverse Research Engine // v3.1-Stable</span>
                                                        </div>
                                                        <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">End of Intelligence Dossier</div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 leading-relaxed font-black uppercase tracking-[0.4em] mt-8 max-w-2xl italic opacity-60 text-center sm:text-left">
                                                        Informationen är sammanställd via realtidsanalys och maskininlärning. Aceverse garanterar inte datans exakthet vid tidpunkten för läsning. Dokumentet är konfidentiellt.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* DETAIL SLIDE-OVER */}
            <div className={`fixed inset-y-0 right-0 z-[100] w-full md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) border-l border-gray-100 dark:border-gray-800 ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedLead && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Kundprofil // {selectedLead.name.split(' ')[0]}</span>
                            <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all active:scale-90"><X size={24} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar">
                            <div className="flex flex-col items-center text-center pb-10 border-b border-gray-50 dark:border-gray-800">
                                <div className="w-32 h-32 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-4xl font-serif text-gray-300 border border-gray-100 dark:border-gray-700 shadow-inner italic mb-6">
                                    {selectedLead.name.substring(0,1)}
                                </div>
                                <h3 className="text-3xl font-serif-display font-black text-gray-950 dark:text-white mb-1 uppercase italic tracking-tight">{selectedLead.name}</h3>
                                <p className="text-gray-400 font-black text-[12px] uppercase tracking-widest mb-8 italic">{selectedLead.company}</p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-black dark:text-white bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl border border-black/5 uppercase tracking-wider italic">
                                        <Zap size={14} fill="currentColor"/> Matchar: {selectedLead.lead_score}%
                                    </div>
                                    <div className={`text-[9px] font-black px-4 py-2 rounded-xl border uppercase tracking-wider italic ${selectedLead.priority === 'High' ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'bg-white text-gray-400 border-gray-100 dark:bg-gray-900 dark:border-gray-800'}`}>
                                        {selectedLead.priority === 'High' ? 'Viktig affär' : 'Normal'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner group">
                                    <label className="block text-[9px] font-black text-gray-300 uppercase tracking-widest mb-6 italic">Process-steg</label>
                                    <div className="relative">
                                        <select value={selectedLead.status} onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as any)} className="w-full bg-transparent font-black text-gray-950 dark:text-white text-xl outline-none cursor-pointer tracking-tight uppercase italic appearance-none">
                                            {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300" />
                                    </div>
                                </div>
                                <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner group">
                                    <label className="block text-[9px] font-black text-gray-300 uppercase tracking-widest mb-6 italic">Affärsvärde</label>
                                    <div className="flex items-end gap-2 font-black text-gray-950 dark:text-white text-xl tracking-tight uppercase italic">
                                        <input type="number" value={selectedLead.value} onChange={(e) => handleUpdateValue(selectedLead.id, Number(e.target.value))} className="bg-transparent w-full outline-none" />
                                        <span className="text-[10px] opacity-30 uppercase font-black tracking-widest mb-1">Kr</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <h4 className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Kontaktinfo</h4>
                                <div className="space-y-8">
                                    <ContactRow icon={<Mail size={20}/>} label="E-post" value={selectedLead.email} />
                                    <ContactRow icon={<Phone size={20}/>} label="Telefon" value={selectedLead.phone || "Ej angivet"} />
                                    <ContactRow icon={<Linkedin size={20}/>} label="LinkedIn" value={selectedLead.linkedin || "Ingen länk"} link={selectedLead.linkedin} />
                                    <ContactRow icon={<Globe size={20}/>} label="Webbplats" value={selectedLead.website || "Ej angivet"} link={selectedLead.website} />
                                </div>
                            </div>

                            <div className="space-y-6 pb-20">
                                <h4 className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Anteckningar</h4>
                                <textarea className="w-full h-48 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700 outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 transition-all text-sm font-bold italic leading-relaxed text-gray-700 dark:text-gray-300 shadow-inner custom-scrollbar" placeholder="Skriv fritt om personen eller mötet..." defaultValue={selectedLead.notes} onBlur={(e) => db.updateLead(user.id, selectedLead.id, { notes: e.target.value })} />
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-white dark:bg-gray-900 shadow-xl">
                            <button onClick={() => { setSelectedMailLeadId(selectedLead.id); setActiveTab('mail'); setIsDetailOpen(false); }} className="flex-1 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-4 hover:opacity-90 transition-all active:scale-95">
                                <Mail size={18}/> SKRIV SÄLJMAIL
                            </button>
                            <button onClick={() => { setLeadToDelete(selectedLead); }} className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-300 rounded-2xl hover:text-red-500 transition-all active:scale-90">
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Backdrop */}
            {isDetailOpen && (
                <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setIsDetailOpen(false)}></div>
            )}

            {/* ADD CONTACT MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-[slideUp_0.4s_ease-out] border border-gray-100 dark:border-gray-800">
                        <div className="p-10 md:p-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Plus size={200} /></div>
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <h2 className="font-serif-display text-4xl text-gray-950 dark:text-white uppercase italic leading-none">Ny Kund</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-90"><X size={28} /></button>
                            </div>
                            <form onSubmit={handleAddLead} className="space-y-10 relative z-10">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Namn</label>
                                        <input required value={newLead.name || ''} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-transparent focus:border-black dark:focus:border-white outline-none font-bold italic shadow-inner dark:text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Företag</label>
                                        <input required value={newLead.company || ''} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-transparent focus:border-black dark:focus:border-white outline-none font-bold italic shadow-inner dark:text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Status</label>
                                        <div className="relative group">
                                            <select value={newLead.status || 'Nya'} onChange={e => setNewLead({...newLead, status: e.target.value as any})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black uppercase tracking-widest shadow-inner appearance-none cursor-pointer">
                                                {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Värde (kr)</label>
                                        <input type="number" value={newLead.value || 0} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-black italic shadow-inner" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest italic">E-post</label>
                                        <input value={newLead.email || ''} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-transparent focus:border-black dark:focus:border-white transition-all text-gray-950 dark:text-white outline-none font-bold italic shadow-inner" placeholder="hej@företag.se" />
                                    </div>
                                </div>
                                <button disabled={isSavingLead} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-4 shadow-xl active:scale-[0.98] mt-4">
                                    {isSavingLead ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} SPARA KONTAKT
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarMetric = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = value && value.length > 25;

    return (
        <div className="space-y-3 group">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors border border-gray-300 dark:border-gray-700 shadow-sm">{icon}</div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">{label}</span>
            </div>
            <div className={`text-lg font-black text-gray-950 dark:text-white italic tracking-tight pl-1 ${!isExpanded && isLong ? 'truncate' : 'break-words overflow-wrap-anywhere'}`}>
                {value || 'N/A'}
            </div>
            {isLong && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[9px] font-black uppercase text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1 pl-1 transition-colors"
                >
                    {isExpanded ? 'Visa mindre' : 'Visa mer'}
                    <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
    );
};

const ReportInternalMetric = ({ label, value }: { label: string, value: string }) => (
    <div className="space-y-1">
        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</span>
        <span className="block text-base font-black text-black break-words">{value || 'N/A'}</span>
    </div>
);

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 italic whitespace-nowrap ${active ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
        {icon}
        {label}
    </button>
);

const MetricCard = ({ title, value, icon, trend }: any) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group transition-all hover:shadow-lg hover:-translate-y-1">
        <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-300 border border-gray-100 dark:border-gray-700 transition-all group-hover:bg-black group-hover:text-white dark:group-hover:text-white shadow-sm">
                {icon}
            </div>
            <div className="text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest bg-gray-50 dark:bg-gray-800 text-gray-400 border border-transparent italic transition-all shadow-inner">{trend}</div>
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block italic">{title}</span>
        <div className="text-4xl font-serif-display font-black text-gray-950 dark:text-white tracking-tight italic leading-none">{value}</div>
    </div>
);

const ContactRow = ({ icon, label, value, link }: any) => (
    <div className="flex items-center gap-6 group">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:text-white transition-all border border-gray-100 dark:border-gray-700 shadow-sm shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
            <span className="block text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 italic">{label}</span>
            {link ? (
                <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-950 dark:text-white hover:underline truncate block uppercase italic">
                    {value}
                </a>
            ) : (
                <span className="text-sm font-bold text-gray-950 dark:text-white truncate block uppercase italic">{value}</span>
            )}
        </div>
    </div>
);

export default CRM;
