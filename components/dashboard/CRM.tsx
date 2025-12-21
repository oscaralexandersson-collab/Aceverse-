
import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, Filter, MoreHorizontal, Mail, Phone, 
    Globe, Linkedin, ArrowRight, BarChart3, PieChart, 
    FileText, Download, Loader2, Sparkles, Send, Copy,
    CheckCircle2, Megaphone, Briefcase, TrendingUp, Target,
    DollarSign, Calendar, RefreshCw, Edit2, Trash2, AlertCircle,
    Save, ExternalLink, Check, ClipboardList
} from 'lucide-react';
import { User, Lead, CompanyReport, CompanyReportEntry } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../../contexts/LanguageContext';

interface CRMProps {
    user: User;
}

const CRM: React.FC<CRMProps> = ({ user }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'mail' | 'intelligence'>('overview');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [reports, setReports] = useState<CompanyReportEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Intelligence State
    const [reportUrl, setReportUrl] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [activeReport, setActiveReport] = useState<CompanyReportEntry | null>(null);
    const [copyStatus, setCopyStatus] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            setLeads(data.leads || []);
            setReports(data.reports || []);
        } catch (e) {
            console.error("Failed to load CRM data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const generateReport = async () => {
        if (!reportUrl) return;
        setIsGeneratingReport(true);
        setLoadingMessage('Steg 1/2: Research & Evidence Pack Collection...');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const researchPrompt = `
                RESEARCH MISSION: Generate an "Evidence Pack" for ${reportUrl}.
                Perform broad research via Google Search to find:
                1. Full legal name, OrgNr, founding year, HQ.
                2. Financials for last 2-3 years.
                3. Business model, audience, and competitors.

                OUTPUT FORMAT: Return a structured JSON object.
            `;

            const researchResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: researchPrompt,
                config: { tools: [{googleSearch: {}}] }
            });

            const evidencePack = researchResponse.text;
            setLoadingMessage('Steg 2/2: Rendering Professional Markdown Report...');
            
            const writerPrompt = `
                ACT AS A SENIOR BUSINESS ANALYST.
                DATA INPUT: ${evidencePack}
                MISSION: Render a Comprehensive Research Report in Markdown.
                LANGUAGE: Svenska. 
                FORMATTING RULES: 
                - Use proper Markdown tables for financial data.
                - Use **bold** for emphasis on key metrics.
                - Do not include technical instructions in the output.
            `;

            const writerResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: writerPrompt
            });

            const fullMarkdown = writerResponse.text || '';
            const finalReport: CompanyReport = {
                meta: {
                    companyName: reportUrl.replace(/https?:\/\/(www\.)?/, '').split('.')[0].toUpperCase(),
                    website: reportUrl,
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
                filename: `Aceverse_Report_${activeReport.reportData.meta.companyName.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    letterRendering: true,
                    logging: false 
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // @ts-ignore - html2pdf is loaded globally via script tag in index.html
            await window.html2pdf().from(element).set(opt).save();
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Kunde inte skapa PDF:en. Prova att använda skriv-ut funktionen istället.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCopyReport = async () => {
        if (!activeReport) return;
        try {
            await navigator.clipboard.writeText(activeReport.reportData.fullMarkdown);
            setCopyStatus(true);
            setTimeout(() => setCopyStatus(false), 2000);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCurrentReport = async () => {
        if (!activeReport) return;
        if (!confirm("Vill du ta bort denna rapport permanent?")) return;
        const idToDelete = activeReport.id;
        setActiveReport(null);
        setReports(prev => prev.filter(r => r.id !== idToDelete));
        try {
            await db.deleteReport(user.id, idToDelete);
        } catch (err) {
            console.error(err);
        }
    };

    // --- ENHANCED MARKDOWN PARSER ---
    const parseInlineStyles = (text: string) => {
        // Handle bold (**text**)
        let parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            // Handle italic (*text*)
            let subParts = part.split(/(\*.*?\*)/g);
            return subParts.map((subPart, j) => {
                if (subPart.startsWith('*') && subPart.endsWith('*')) {
                    return <em key={`${i}-${j}`} className="italic text-gray-800">{subPart.slice(1, -1)}</em>;
                }
                return subPart;
            });
        });
    };

    const renderMarkdown = (md: string) => {
        if (!md) return null;
        
        const lines = md.split('\n');
        const renderedElements: React.ReactNode[] = [];
        let currentTable: string[][] = [];

        lines.forEach((line, i) => {
            const trimmed = line.trim();

            // Handle Tables
            if (trimmed.startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim().length > 0 || line.indexOf('|') !== line.lastIndexOf('|'));
                // Skip separator rows like |---|---|
                if (!trimmed.match(/[a-zA-Z0-9]/)) return; 
                
                currentTable.push(cells.map(c => c.trim()));
                
                // If next line isn't a table or is end of md, render the table
                const nextLine = lines[i + 1]?.trim();
                if (!nextLine || !nextLine.startsWith('|')) {
                    renderedElements.push(
                        <div key={`table-${i}`} className="overflow-x-auto my-8">
                            <table className="min-w-full border-collapse border border-gray-200 text-sm shadow-sm rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        {currentTable[0].map((cell, ci) => (
                                            <th key={ci} className="px-4 py-3 text-left font-bold text-gray-900 uppercase tracking-wider text-[10px]">{cell}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currentTable.slice(1).map((row, ri) => (
                                        <tr key={ri} className="hover:bg-gray-50/50 transition-colors">
                                            {row.map((cell, ci) => (
                                                <td key={ci} className="px-4 py-3 text-gray-700 font-medium">{parseInlineStyles(cell)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                    currentTable = [];
                }
                return;
            }

            // Headers
            if (trimmed.startsWith('# ')) {
                renderedElements.push(<h1 key={i} className="text-4xl font-serif-display font-bold mb-8 border-b-4 border-black pb-6 pt-12 text-black leading-tight uppercase tracking-tighter">{parseInlineStyles(trimmed.replace('# ', ''))}</h1>);
            } else if (trimmed.startsWith('## ')) {
                renderedElements.push(<h2 key={i} className="text-2xl font-serif-display font-bold mt-12 mb-6 text-gray-900 border-b-2 border-gray-100 pb-3">{parseInlineStyles(trimmed.replace('## ', ''))}</h2>);
            } else if (trimmed.startsWith('### ')) {
                renderedElements.push(<h3 key={i} className="text-lg font-bold mt-10 mb-4 text-gray-800 uppercase tracking-widest">{parseInlineStyles(trimmed.replace('### ', ''))}</h3>);
            }
            // Lists
            else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                renderedElements.push(
                    <li key={i} className="ml-6 text-sm text-gray-700 list-none mb-3 flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-black mt-2 shrink-0"></span>
                        <span>{parseInlineStyles(trimmed.substring(2))}</span>
                    </li>
                );
            }
            // Paragraphs
            else if (trimmed !== '') {
                renderedElements.push(<p key={i} className="text-sm leading-relaxed text-gray-700 mb-5 text-justify">{parseInlineStyles(trimmed)}</p>);
            }
            // Spacing
            else {
                renderedElements.push(<div key={i} className="h-2" />);
            }
        });

        return renderedElements;
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
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
                {activeTab === 'intelligence' && (
                    <div className="h-full">
                        {!activeReport ? (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-900 p-10 rounded-2xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-black dark:text-white">
                                        <Sparkles size={32} />
                                    </div>
                                    <h3 className="font-serif-display text-2xl mb-4 text-gray-900 dark:text-white">Research Intelligence Engine</h3>
                                    <div className="flex max-w-lg mx-auto gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-full border border-gray-200 dark:border-gray-700">
                                        <input value={reportUrl} onChange={e => setReportUrl(e.target.value)} placeholder="Klistra in hemsida (t.ex. klarna.com)" className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-900 dark:text-white outline-none" />
                                        <button onClick={generateReport} disabled={!reportUrl || isGeneratingReport} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                                            {isGeneratingReport ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                            {isGeneratingReport ? 'Arbetar...' : 'Analysera'}
                                        </button>
                                    </div>
                                    {isGeneratingReport && <div className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse uppercase tracking-widest">{loadingMessage}</div>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {reports.map(report => (
                                        <div key={report.id} onClick={() => setActiveReport(report)} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-all hover:shadow-lg cursor-pointer group border-b-4 border-b-black">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate text-lg mb-1">{report.title}</h4>
                                            <p className="text-xs text-gray-500">Comprehensive Market Analysis</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-gray-100 dark:bg-black/40 rounded-2xl overflow-hidden animate-slideUp">
                                {/* Report Toolbar - Sticky */}
                                <div className="no-print bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveReport(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"><ArrowRight className="rotate-180" size={20} /></button>
                                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
                                        <h2 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{activeReport.reportData.meta.companyName}</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleCopyReport} className="hidden sm:flex px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all items-center gap-2">
                                            {copyStatus ? <Check size={14} className="text-green-500" /> : <ClipboardList size={14}/>} 
                                            {copyStatus ? 'Kopierat!' : 'Kopiera'}
                                        </button>
                                        <button 
                                            onClick={handleDownloadPDF} 
                                            disabled={isDownloading}
                                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-80 transition-all flex items-center gap-2 shadow-lg shadow-black/10 disabled:opacity-50"
                                        >
                                            {isDownloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14}/>}
                                            {isDownloading ? 'Genererar...' : 'Ladda ned PDF'}
                                        </button>
                                        <button onClick={handleDeleteCurrentReport} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>

                                {/* SCROLLABLE PAPER VIEW */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-12">
                                    <div 
                                        id="printable-report" 
                                        className="bg-white p-12 md:p-24 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200 mx-auto max-w-5xl min-h-full text-black font-sans selection:bg-yellow-100 mb-20"
                                    >
                                        {/* Document Header */}
                                        <div className="border-b-8 border-black pb-8 mb-16 flex justify-between items-end">
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-xs italic">A</div>
                                                    <span className="font-bold tracking-tighter text-xl text-black">ACEVERSE INTELLIGENCE</span>
                                                </div>
                                                <h1 className="text-5xl font-serif-display font-bold uppercase tracking-tighter max-w-2xl leading-none text-black">Research Report</h1>
                                                <p className="text-gray-500 text-sm mt-4 font-medium uppercase tracking-widest">Target: {activeReport.reportData.meta.companyName} | {activeReport.reportData.meta.website}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="font-bold border-t border-black pt-1 text-black">{activeReport.reportData.meta.generatedDate}</div>
                                                <div className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Confidential Data</div>
                                            </div>
                                        </div>

                                        {/* Document Body */}
                                        <div className="max-w-none report-content text-black">
                                            {renderMarkdown(activeReport.reportData.fullMarkdown)}
                                        </div>
                                        
                                        {/* Document Footer */}
                                        <div className="mt-24 pt-10 border-t-2 border-gray-100">
                                            <div className="flex items-center gap-2 text-gray-400 mb-4">
                                                <Sparkles size={16} />
                                                <span className="text-xs font-bold uppercase tracking-widest">AI Synthesis Verified</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                                Denna rapport har genererats autonomt av Aceverse genom en 2-stegs research-process. 
                                                Data är hämtad från publika källor vid tidpunkten för generering. Innehållet är konfidentiellt och endast avsett för mottagaren.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab !== 'intelligence' && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-20 text-center">
                        <p className="text-gray-400">Växla till <strong>Intelligence</strong>-fliken för att generera rapporter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>
        {icon}
        {label}
    </button>
);

export default CRM;
