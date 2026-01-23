
import React, { useState, useEffect, useRef } from 'react';
import { 
    Check, AlertTriangle, FileText, ArrowRight, CheckCircle2, Plus, Trash2, Calendar, ArrowLeft, 
    Upload, X, Search, Sparkles, UserCheck, Loader2, Edit3, BookOpen
} from 'lucide-react';
import { User, FullReportProject, ReportSectionType, ReportSectionData } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ReportBuilderProps {
    user: User;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    
    const [view, setView] = useState<'list' | 'overview'>('list');
    const [projects, setProjects] = useState<FullReportProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrafting, setIsDrafting] = useState(false);
    
    const [activeProject, setActiveProject] = useState<FullReportProject | null>(null);
    const [detailSection, setDetailSection] = useState<ReportSectionType | null>(null); 
    
    const [newReportTitle, setNewReportTitle] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
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
            setActiveProject(saved);
            setView('overview');
            setShowCreateModal(false);
            setNewReportTitle('');
        } catch (e) { alert("Fel vid skapande."); }
    };

    const handleDraftWithAI = async () => {
        if (!activeProject) return;
        setIsDrafting(true);
        try {
            const data = await db.getUserData(user.id);
            const context = {
                deals: data.deals,
                ideas: data.ideas,
                logs: data.sustainabilityLogs
            };

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Du är en expert på att skriva årsredovisningar för UF. 
            Baserat på denna data: ${JSON.stringify(context)}, generera ett utkast för "Affärsidé" och "VD-ordet".
            Returnera JSON: { "business_idea": "...", "ceo_words": "..." }`;

            const res = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: prompt, 
                config: { responseMimeType: 'application/json' } 
            });
            
            const drafts = JSON.parse(res.text || '{}');
            const updatedSections = { ...activeProject.sections };
            
            if (drafts.business_idea) {
                updatedSections.business_idea = { ...updatedSections.business_idea, content: drafts.business_idea, status: 'draft' };
            }
            if (drafts.ceo_words) {
                updatedSections.ceo_words = { ...updatedSections.ceo_words, content: drafts.ceo_words, status: 'draft' };
            }

            const updatedProject = { ...activeProject, sections: updatedSections };
            await db.saveFullReportProject(user.id, updatedProject);
            setActiveProject(updatedProject);
            alert("AI har skapat utkast baserat på din aktivitet!");
        } catch (e) { console.error(e); } 
        finally { setIsDrafting(false); }
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        await db.deleteFullReportProject(user.id, projectToDelete.id);
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        setProjectToDelete(null);
    };

    if (view === 'list') {
        return (
            <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
                <DeleteConfirmModal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDelete} itemName={projectToDelete?.company_name || ''} />
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative shadow-2xl">
                            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                            <h2 className="font-serif-display text-2xl mb-6">Ny Årsredovisning</h2>
                            <form onSubmit={handleCreateReport}>
                                <input autoFocus value={newReportTitle} onChange={(e) => setNewReportTitle(e.target.value)} placeholder="Företagsnamn..." className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-black dark:focus:border-white transition-all mb-4" />
                                <button type="submit" className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest">Skapa Projekt</button>
                            </form>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-end mb-12">
                    <div><h1 className="font-serif-display text-5xl mb-2">Report Studio</h1><p className="text-gray-500">Skapa din årsredovisning med hjälp av AI som minns vad ni gjort.</p></div>
                    <button onClick={() => setShowCreateModal(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest flex items-center gap-2"><Plus size={18} /> Ny Rapport</button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <div key={p.id} onClick={() => { setActiveProject(p); setView('overview'); }} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 cursor-pointer hover:shadow-2xl transition-all group flex flex-col justify-between min-h-[200px]">
                            <div><div className="flex justify-between mb-4"><span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black uppercase">Utkast</span><button onClick={(e) => { e.stopPropagation(); setProjectToDelete(p); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button></div><h3 className="font-serif-display text-2xl mb-1">{p.company_name}</h3><p className="text-[10px] text-gray-400 uppercase font-bold">{new Date(p.updated_at).toLocaleDateString()}</p></div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800"><span className="text-[10px] font-bold text-gray-400">Öppna Editor</span><div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowRight size={14} /></div></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
             {detailSection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl p-8 relative animate-slideUp">
                    <button onClick={() => setDetailSection(null)} className="absolute top-6 right-6"><X size={24}/></button>
                    <h2 className="font-serif-display text-3xl mb-6">{activeProject?.sections[detailSection].title}</h2>
                    <textarea value={activeProject?.sections[detailSection].content} onChange={(e) => {
                        const updated = { ...activeProject!, sections: { ...activeProject!.sections, [detailSection]: { ...activeProject!.sections[detailSection], content: e.target.value, status: 'draft' } } };
                        setActiveProject(updated);
                        db.saveFullReportProject(user.id, updated);
                    }} className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-serif text-lg leading-relaxed dark:text-white resize-none" />
                </div></div>
             )}

             <div className="flex items-center justify-between mb-12">
                <div>
                    <button onClick={() => setView('list')} className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2 mb-4"><ArrowLeft size={12}/> Tillbaka</button>
                    <h1 className="font-serif-display text-5xl">{activeProject?.company_name}</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleDraftWithAI} disabled={isDrafting} className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-blue-600/20 hover:scale-105 transition-all disabled:opacity-50">
                        {isDrafting ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                        Skapa utkast med AI
                    </button>
                    <button className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><Edit3 size={16}/> Granska & Ladda ner</button>
                </div>
             </div>

             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* FIX: Added explicit cast to ReportSectionData[] to resolve TypeScript 'unknown' property access errors when mapping Object.values */}
                {activeProject && (Object.values(activeProject.sections) as ReportSectionData[]).map(s => (
                    <div key={s.id} onClick={() => setDetailSection(s.id as ReportSectionType)} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${s.status === 'empty' ? 'bg-gray-50 text-gray-300' : 'bg-green-50 text-green-600'}`}>
                            {s.status === 'empty' ? <BookOpen size={20}/> : <CheckCircle2 size={20}/>}
                        </div>
                        <h3 className="font-serif-display text-xl mb-2">{s.title}</h3>
                        <p className="text-xs text-gray-400 line-clamp-2">{s.content || 'Ingen text än. Klicka för att skriva.'}</p>
                    </div>
                ))}
             </div>
        </div>
    );
};

export default ReportBuilder;
