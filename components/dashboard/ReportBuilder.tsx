import React, { useState, useEffect, useRef } from 'react';
import { 
    Check, AlertTriangle, FileText, ArrowRight, CheckCircle2, Plus, Trash2, Calendar, ArrowLeft, 
    Upload, X, Search, Sparkles, UserCheck, Loader2
} from 'lucide-react';
import { User, FullReportProject, ReportSectionType, ReportSectionData } from '../../types';
import { db } from '../../services/db';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ReportBuilderProps {
    user: User;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    
    // Views: 'list' -> 'overview' (Analysis Dashboard)
    const [view, setView] = useState<'list' | 'overview'>('list');
    const [projects, setProjects] = useState<FullReportProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Active State
    const [activeProject, setActiveProject] = useState<FullReportProject | null>(null);
    const [detailSection, setDetailSection] = useState<ReportSectionType | null>(null); // For Analysis Modal
    
    // Creation / Analysis
    const [newReportTitle, setNewReportTitle] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [processingFile, setProcessingFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // UI
    const [projectToDelete, setProjectToDelete] = useState<FullReportProject | null>(null);

    useEffect(() => {
        loadProjects();
    }, [user.id, activeWorkspace?.id, viewScope]);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const data = await db.getUserData(user.id);
            const rawProjects = data.fullReports || [];
            
            const filtered = rawProjects.filter(p => {
                const itemId = p.workspace_id;
                if (viewScope === 'personal') return !itemId;
                return activeWorkspace?.id && itemId === activeWorkspace.id;
            });

            setProjects(filtered);
        } catch (e) {
            console.error("Failed to load reports", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReportTitle.trim()) return;

        const emptySections: Record<ReportSectionType, ReportSectionData> = {
            intro: { id: 'intro', title: 'Introduktion & Info', content: '', status: 'empty' },
            ceo_words: { id: 'ceo_words', title: 'VD-ordet', content: '', status: 'empty' },
            business_idea: { id: 'business_idea', title: 'Affärsidé', content: '', status: 'empty' },
            execution: { id: 'execution', title: 'Genomförande', content: '', status: 'empty' },
            financials: { id: 'financials', title: 'Ekonomisk Analys', content: '', status: 'empty' },
            learnings: { id: 'learnings', title: 'Lärdomar', content: '', status: 'empty' },
            future: { id: 'future', title: 'Framtid/Avveckling', content: '', status: 'empty' },
            signatures: { id: 'signatures', title: 'Underskrifter', content: '', status: 'empty' }
        };

        const newProject: Partial<FullReportProject> = {
            user_id: user.id,
            company_name: newReportTitle,
            workspace_id: viewScope === 'workspace' ? activeWorkspace?.id : undefined,
            sections: emptySections,
            financials: { revenue: 0, costs: 0, result: 0, equity: 0, debt: 0 }
        };

        try {
            const saved = await db.saveFullReportProject(user.id, newProject);
            setProjects([saved, ...projects]);
            openProject(saved);
            setShowCreateModal(false);
            setNewReportTitle('');
        } catch (e) {
            alert("Kunde inte skapa analysprojektet.");
        }
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        try {
            await db.deleteFullReportProject(user.id, projectToDelete.id);
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            setProjectToDelete(null);
        } catch (e) {
            alert("Kunde inte radera rapporten.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;
        
        setProcessingFile(file.name);
        setIsAnalyzing(true);
        
        // Mock Analysis Process
        setTimeout(async () => {
             // Here we would parse PDF and send to AI. 
             // For now, we simulate a "Successful Read" of sections.
             const updatedSections = { ...activeProject.sections };
             
             // Simulate "VD-ordet" being found and analyzed
             updatedSections.ceo_words = {
                 ...updatedSections.ceo_words,
                 content: "Detta är ett simulerat innehåll från PDF:en för VD-ordet...",
                 status: 'complete',
                 score: 6,
                 feedback: {
                     analysis: "En bra start, men saknar personlig touch.",
                     jury_perspective: "Juryn vill se mer av din personliga resa.",
                     strengths: ["Tydlig struktur", "Bra språk"],
                     weaknesses: ["För generellt", "Saknar konkreta exempel"],
                     concrete_examples: ["Berätta om en specifik motgång ni övervann."]
                 }
             };

             const updatedProject = { ...activeProject, sections: updatedSections };
             await db.saveFullReportProject(user.id, updatedProject);
             setActiveProject(updatedProject);
             
             setIsAnalyzing(false);
             setProcessingFile(null);
             alert("Analys klar! Resultatet har uppdaterats.");
        }, 2500);
    };

    const openProject = (project: FullReportProject) => {
        setActiveProject(project);
        setView('overview'); 
    };

    const calculateAverageScore = () => {
        if (!activeProject) return 0;
        const sections = Object.values(activeProject.sections) as ReportSectionData[];
        const scoredSections = sections.filter((s) => s.score !== undefined && s.score > 0);
        if (scoredSections.length === 0) return 0;
        const sum = scoredSections.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return Math.round((sum / scoredSections.length) * 10) / 10;
    };

    // --- RENDER HELPERS ---

    const renderProjectList = () => (
        <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
            <DeleteConfirmModal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDelete} itemName={projectToDelete?.company_name || ''} />
            
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative shadow-2xl">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <h2 className="font-serif-display text-2xl mb-6 text-gray-900 dark:text-white">Ny Rapportanalys</h2>
                        <form onSubmit={handleCreateReport}>
                            <input 
                                autoFocus
                                value={newReportTitle}
                                onChange={(e) => setNewReportTitle(e.target.value)}
                                placeholder="Företagsnamn (t.ex. EcoWear UF)"
                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-black dark:focus:border-white transition-all mb-4"
                            />
                            <button 
                                type="submit"
                                disabled={isLoading || !newReportTitle.trim()}
                                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Starta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="font-serif-display text-5xl text-gray-900 dark:text-white mb-2">Report Analyzer</h1>
                    <p className="text-gray-500 dark:text-gray-400">Ladda upp din årsredovisning och få SM-mässig feedback direkt.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                    <Plus size={18} /> Ny Analys
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div key={p.id} onClick={() => openProject(p)} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 cursor-pointer hover:shadow-2xl transition-all group relative flex flex-col justify-between min-h-[240px]">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Analys</span>
                                <button onClick={(e) => { e.stopPropagation(); setProjectToDelete(p); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-full transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <h3 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">{p.company_name}</h3>
                            <p className="text-xs text-gray-400 mb-8 flex items-center gap-2"><Calendar size={12}/> Ändrad {new Date(p.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold">{Object.values(p.sections).filter((s:any) => s.status === 'complete').length}</div>
                                <span className="text-[10px] text-gray-400 font-medium">Delar analyserade</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowRight size={14} /></div>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem]">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Inga rapporter analyserade än.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderOverview = () => {
        if (!activeProject) return null;

        const averageScore = calculateAverageScore();
        const sections = Object.values(activeProject.sections) as ReportSectionData[];
        const activeDetail = detailSection ? activeProject.sections[detailSection] : null;

        return (
            <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
                
                {/* --- ANALYSIS MODAL --- */}
                {detailSection && activeDetail && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 animate-fadeIn">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-[2rem] overflow-hidden flex flex-col md:flex-row relative shadow-2xl animate-slideUp">
                            <button onClick={() => setDetailSection(null)} className="absolute top-6 right-6 z-20 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
                            
                            {/* Left: Content Preview */}
                            <div className="md:w-5/12 bg-gray-50 dark:bg-gray-950 p-8 md:p-12 overflow-y-auto custom-scrollbar border-r border-gray-200 dark:border-gray-800">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-8">Text från PDF</span>
                                <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white mb-8">{activeDetail.title}</h2>
                                {activeDetail.content ? (
                                    <div className="prose dark:prose-invert text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-serif">
                                        {activeDetail.content}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-400 italic border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                                        Ingen text hittad för denna sektion i PDF:en.
                                    </div>
                                )}
                            </div>

                            {/* Right: AI Deep Analysis */}
                            <div className="md:w-7/12 bg-white dark:bg-gray-900 flex flex-col h-full overflow-hidden">
                                <div className="p-8 md:p-10 border-b border-gray-100 dark:border-gray-800 flex items-center gap-6 bg-gray-50/50 dark:bg-gray-900">
                                    <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center text-3xl font-bold text-white shadow-xl ${
                                        (activeDetail.score || 0) > 8 ? 'bg-green-500 shadow-green-500/30' : (activeDetail.score || 0) > 5 ? 'bg-yellow-500 shadow-yellow-500/30' : 'bg-red-500 shadow-red-500/30'
                                    }`}>
                                        {activeDetail.score || '-'}<span className="text-[10px] opacity-70 font-medium">POÄNG</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">Juryns Omdöme</h3>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {activeDetail.score && activeDetail.score > 8 ? 'SM-Guld Nivå 🏆' : activeDetail.score && activeDetail.score > 5 ? 'Godkänd nivå' : 'Kräver arbete'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 space-y-10">
                                    {activeDetail.feedback ? (
                                        <>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                                    <Sparkles size={14} className="text-purple-500"/> Coachens Analys
                                                </h4>
                                                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                                    {activeDetail.feedback.analysis}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                                                    <UserCheck size={14}/> Juryns Perspektiv
                                                </h4>
                                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed italic">
                                                    "{activeDetail.feedback.jury_perspective}"
                                                </p>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-green-600 mb-4 flex items-center gap-2">
                                                        <CheckCircle2 size={14}/> Styrkor
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {activeDetail.feedback.strengths.map((s, i) => (
                                                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 items-start">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div>
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                                                        <AlertTriangle size={14}/> Utvecklingsområden
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {activeDetail.feedback.weaknesses.map((s, i) => (
                                                            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-3 items-start">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div>
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                            <FileText size={48} className="opacity-20"/>
                                            <p>Ingen analys tillgänglig. Ladda upp en PDF för att få feedback.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mb-12">
                    <div>
                        <button onClick={() => { setActiveProject(null); setView('list'); }} className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 mb-4 transition-colors">
                            <ArrowLeft size={12} /> Tillbaka till listan
                        </button>
                        <h1 className="font-serif-display text-5xl text-gray-900 dark:text-white mb-2">{activeProject.company_name}</h1>
                        <p className="text-gray-500 dark:text-gray-400">Total Analys Score: {averageScore} / 10</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            {isAnalyzing ? 'Analyserar...' : 'Ladda upp PDF'}
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".pdf"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sections.map((sec) => (
                        <div 
                            key={sec.id} 
                            onClick={() => setDetailSection(sec.id)}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${sec.score && sec.score > 7 ? 'bg-green-100 text-green-700' : sec.score && sec.score > 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {sec.score || '-'}
                                </div>
                                <div className={`w-2 h-2 rounded-full ${sec.status === 'complete' ? 'bg-green-500' : sec.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                            </div>
                            
                            <h3 className="font-serif-display text-xl mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{sec.title}</h3>
                            
                            <div className="space-y-2 mt-4">
                                {(sec.feedback?.strengths || []).slice(0,1).map((s, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                        <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                                        <span className="line-clamp-1">{s}</span>
                                    </div>
                                ))}
                                {(sec.feedback?.weaknesses || []).slice(0,1).map((w, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                        <AlertTriangle size={12} className="text-yellow-500 mt-0.5 shrink-0" />
                                        <span className="line-clamp-1">{w}</span>
                                    </div>
                                ))}
                                {!sec.feedback && <span className="text-xs text-gray-400 italic">Klicka för analys</span>}
                            </div>

                            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center">
                                    <Search size={14} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full">
            {activeProject ? renderOverview() : renderProjectList()}
        </div>
    );
};

export default ReportBuilder;