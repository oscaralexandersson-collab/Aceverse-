
import React, { useState, useEffect, useRef } from 'react';
import { 
    Check, AlertTriangle, FileText, ArrowRight, CheckCircle2, Plus, Trash2, Calendar, ArrowLeft, 
    Upload, X, Search, Sparkles, UserCheck, Loader2, Edit3, BookOpen, BarChart3, AlertCircle, FileCheck, Download
} from 'lucide-react';
import { User, FullReportProject, ReportSectionType, ReportSectionData } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DeleteConfirmModal from './DeleteConfirmModal';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for PDF.js import: extracting the default export if available
const pdf = (pdfjsLib as any).default || pdfjsLib;

// Configure Worker using unpkg to get the raw script file, not an ESM wrapper.
if (pdf && pdf.GlobalWorkerOptions) {
    pdf.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// --- SYSTEM PROMPT ---
const REPORT_ENGINE_PROMPT = `
Aceverse Report-Engine (Strict Criteria Version)
Roll: Du är "Aceverse Report-Engine". Din enda uppgift är att granska och bedöma UF-företagsrapporter baserat strikt på nedanstående kriterier och definitionslistor. Du får inte hitta på egna regler.
Instruktion till AI:
Läs igenom användarens rapport.
Kontrollera först "Obligatoriskt Innehåll" och "Begreppsförklaringar". Om något saknas här är det en kritisk brist.
Bedöm sedan rapporten utifrån de "Fem Huvudkriterierna". För varje punkt under kriterierna, avgör om rapporten besvarar frågan.
Ge feedback som hjälper eleven att svara på frågorna de missat (Pedagogisk Scaffolding), skriv inte svaret åt dem.

DEL 1: OBLIGATORISKT INNEHÅLL (Checklista)
Kontrollera att följande finns med. Saknas något ska du varna användaren direkt:
Innehållsförteckning och VD-ord.
Samarbetet inom UF-företaget, lärdomar och erfarenheter.
Genomförda aktiviteter under året.
Möjlig fortsatt utveckling.
Balans- och resultaträkning med underskrift av revisor.
Underskrifter: Ort, datum, samtliga UF-företagares namnteckningar, för- och efternamn.
Tydlig genomgående struktur av text och layout.
DEL 2: BEGREPPS- & REGELKONTROLL
Analysera texten mot dessa definitioner:
Korrekt ekonomi: Är vinsten lika i både resultat- och balansräkningen? Är tillgångar lika stora som eget kapital + skulder? (Poster ska redovisas korrekt, t.ex. får riskkapital INTE finnas i resultaträkningen).
Riskkapital: Har de tagit in max 15 000 kr totalt och max 300 kr/person? Om vinst finns, nämner de att riskkapitalet ska återbetalas?
Underskrifter: Finns namnförtydligande vid underskrifterna? Finns ort och datum angivet vid dem?

DEL 3: BEDÖMNING AV DE FEM HUVUDKRITERIERNA
Betygsätt varje område och ge specifik feedback baserat på frågorna nedan.
1. Innovation, värdeskapande och entreprenörskap (20%)
Är varan/tjänsten, affärsmodellen, processen eller marknadsföringen innovativ?
Skapar den mervärde för kunden?
Förklarar de behovet av varan/tjänsten?
Har kontinuerliga, kreativa förbättringar skett?
Har de tagit hänsyn till sociala, etiska och miljömässiga aspekter?
2. Varu-/tjänsteutveckling och kundfokus (20%)
Beskrivs resan från idé till färdig vara/tjänst?
Hur och när bedömdes kundernas behov? Kan varan lösa dessa behov?
Vilken marknadsföringsstrategi användes och ökade den försäljningen?
Hur reagerade kunderna och hur hanterade företaget reaktionen?
Har de breddat kundbasen utanför närmiljön?
Förstår de varför varan blev en framgång?
3. Finansiella resultat (20%)
Har de gjort en acceptabel vinst?
Förstår alla medlemmar ekonomiska begrepp?
Har de kontroll på det finansiella läget?
Förstår de vilka faktorer som påverkar priset?
4. Målsättning, planering/utvärdering, genomförande och administration (20%)
Ger rapporten en tydlig bild av hur året gått?
Har de uppdaterat sina mål regelbundet?
Hur säkerställde de att deras lösningar på problem var de mest effektiva?
Hur är företaget uppbyggt och har strukturen ändrats för att möta svårigheter?
Finns ett effektivt system för dokumentation?
Viktigt: Har de tagit kontakt med myndigheter för rättsliga frågor (t.ex. upphovsrätt, försäkring vid import/export)?
5. Lärdomar (20%)
Leta efter bevis på utveckling inom dessa nyckelkompetenser:
Kreativitet
Självförtroende
Initiativtagande
Samarbetsförmåga
Idérikedom
Uthållighet
Ansvarstagande
`;

// Helper to render markdown content
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const parseBold = (line: string) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-black dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const lines = text.split('\n');
    return (
        <div className="space-y-4 text-gray-800 dark:text-gray-200">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1" />;
                
                if (trimmed.startsWith('# ')) 
                    return <h1 key={i} className="font-serif-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-6 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">{parseBold(trimmed.slice(2))}</h1>;
                
                if (trimmed.startsWith('## ')) 
                    return <h2 key={i} className="font-serif-display text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{parseBold(trimmed.slice(3))}</h2>;
                
                if (trimmed.startsWith('### ')) 
                    return <h3 key={i} className="font-bold text-lg text-gray-900 dark:text-white mt-4 mb-2 uppercase tracking-wide">{parseBold(trimmed.slice(4))}</h3>;
                
                if (trimmed.startsWith('---'))
                    return <hr key={i} className="my-6 border-gray-200 dark:border-gray-800" />;

                if (trimmed.startsWith('> '))
                    return <div key={i} className="pl-4 border-l-2 border-gray-300 dark:border-gray-700 italic text-gray-500 my-4">{parseBold(trimmed.slice(2))}</div>;

                return <p key={i} className="leading-relaxed text-sm md:text-base">{parseBold(line)}</p>;
            })}
        </div>
    );
};

interface ReportBuilderProps {
    user: User;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const analysisRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'list' | 'overview'>('list');
    const [projects, setProjects] = useState<FullReportProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    
    const [activeProject, setActiveProject] = useState<FullReportProject | null>(null);
    const [detailSection, setDetailSection] = useState<ReportSectionType | null>(null); 
    
    const [newReportTitle, setNewReportTitle] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    
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

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeProject) return;

        setIsUploading(true);
        setUploadSuccess(false);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdf.getDocument({ data: arrayBuffer });
            const doc = await loadingTask.promise;
            
            let fullText = "";
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += `--- SIDA ${i} ---\n${pageText}\n\n`;
            }

            const updatedSections = { ...activeProject.sections };
            updatedSections.intro = { 
                ...updatedSections.intro, 
                content: fullText, 
                status: 'draft',
                title: 'Uppladdad Rapport (PDF)' 
            };

            const updatedProject = { ...activeProject, sections: updatedSections };
            await db.saveFullReportProject(user.id, updatedProject);
            setActiveProject(updatedProject);
            setUploadSuccess(true);
            
            // Remove success state after 3s to revert button text
            setTimeout(() => setUploadSuccess(false), 3000);

        } catch (error) {
            console.error("PDF Parse Error:", error);
            alert("Kunde inte läsa PDF-filen. Se till att den inte är lösenordsskyddad eller skadad.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const runFullAnalysis = async () => {
        if (!activeProject) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setShowAnalysisModal(true);

        try {
            // Aggregate all content
            const fullReportText = (Object.values(activeProject.sections) as ReportSectionData[])
                .map(s => `=== SEKTION: ${s.title} ===\n${s.content || '(Tom sektion)'}`)
                .join('\n\n');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // New Output Format Instruction (Markdown)
            const outputFormatInstruction = `
            VIKTIGT FORMAT-KRAV:
            Du ska INTE svara med JSON. Du ska svara med EXAKT följande Markdown-format. 
            Fyll i hakparenteserna [...] med din analys baserat på System Prompten.
            Ändra INTE rubrikerna.

            ### OUTPUT-FORMAT:

            # 🚀 Aceverse Rapportanalys

            ## 1. 🚦 FORMALIA & STATUS
            **Status:** [✅ GODKÄND / 🛑 KRITISKA BRISTER]
            *(Om "Kritiska Brister": Lista punktvis exakt vad som saknas för att rapporten ska vara giltig, t.ex. underskrifter, revisor eller ekonomi-balans).*

            ---

            ## 2. 🧶 DEN RÖDA TRÅDEN
            **Sammanhängande Betyg:** [0-100]
            **Analys:** [Beskriv kort hur väl rapporten hänger ihop som helhet. Matchar ekonomin er affärsidé? Känns layouten professionell?]

            ---

            ## 3. 🏆 BEDÖMNING PER KRITERIUM

            ### 1. Innovation & Värdeskapande
            **Betyg:** [X]/100
            **Varför detta betyg?**
            [Förklara specifikt vad som var bra och vad som saknades. Varför nådde de inte 100?]
            **Förbättringsförslag (Utan att skriva åt er):**
            [Ge en konkret uppgift eller ställ en fråga som hjälper dem att höja betyget.]

            ### 2. Varu-/tjänsteutveckling & Kundfokus
            **Betyg:** [X]/100
            **Varför detta betyg?**
            [Motivera betyget baserat på kopplingen mellan kundbehov och er lösning.]
            **Förbättringsförslag (Utan att skriva åt er):**
            [Ge en strategisk utmaning kopplad till marknad eller försäljning.]

            ### 3. Finansiella Resultat
            **Betyg:** [X]/100
            **Varför detta betyg?**
            [Motivera baserat på förståelse för siffrorna, inte bara vinsten.]
            **Förbättringsförslag (Utan att skriva åt er):**
            [Ställ en fråga som tvingar dem att analysera en specifik post i ekonomin.]

            ### 4. Målsättning & Administration
            **Betyg:** [X]/100
            **Varför detta betyg?**
            [Motivera baserat på måluppfyllelse och struktur.]
            **Förbättringsförslag (Utan att skriva åt er):**
            [Utmana dem kring hur de hanterade motgångar eller administration.]

            ### 5. Lärdomar & Nyckelkompetenser
            **Betyg:** [X]/100
            **Varför detta betyg?**
            [Motivera baserat på djupet i reflektionen (gör vs. lär).]
            **Förbättringsförslag (Utan att skriva åt er):**
            [Be dem utveckla en specifik lärdom eller kompetens.]

            ---
            *> Analys genererad av Aceverse Report-Engine baserat på officiella UF-kriterier.*
            `;

            const res = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', // Stronger model for strict analysis
                contents: fullReportText,
                config: {
                    systemInstruction: REPORT_ENGINE_PROMPT + outputFormatInstruction,
                    // No responseMimeType: 'application/json' because we want plain text/markdown
                }
            });

            const result = res.text || 'Kunde inte generera analys.';
            setAnalysisResult(result);

            // Persist the analysis
            await db.saveReportAnalysis(user.id, activeProject.id, result);
            setActiveProject(prev => prev ? ({ ...prev, last_analysis_content: result, last_analysis_at: new Date().toISOString() }) : null);

        } catch (e) {
            console.error(e);
            alert("Kunde inte analysera rapporten just nu.");
            setShowAnalysisModal(false);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!analysisRef.current || !activeProject) return;
        const element = analysisRef.current;
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Analys_${activeProject.company_name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("PDF-biblioteket laddades inte korrekt.");
        }
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
                            <h2 className="font-serif-display text-2xl mb-6">Nytt Tävlingsbidrag</h2>
                            <p className="text-sm text-gray-500 mb-6">Ladda upp eller skriv er rapport för tävlingen "Årets UF-företag".</p>
                            <form onSubmit={handleCreateReport}>
                                <input autoFocus value={newReportTitle} onChange={(e) => setNewReportTitle(e.target.value)} placeholder="Företagsnamn..." className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-black dark:focus:border-white transition-all mb-4" />
                                <button type="submit" className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest">Skapa Projekt</button>
                            </form>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-end mb-12">
                    <div><h1 className="font-serif-display text-5xl mb-2">Report Studio</h1><p className="text-gray-500">Skapa ert tävlingsbidrag med hjälp av AI som kan UF-kriterierna.</p></div>
                    <button onClick={() => setShowCreateModal(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest flex items-center gap-2"><Plus size={18} /> Ny Rapport</button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <div key={p.id} onClick={() => { setActiveProject(p); setView('overview'); }} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 cursor-pointer hover:shadow-2xl transition-all group flex flex-col justify-between min-h-[200px]">
                            <div><div className="flex justify-between mb-4"><span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black uppercase">Tävlingsbidrag</span><button onClick={(e) => { e.stopPropagation(); setProjectToDelete(p); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button></div><h3 className="font-serif-display text-2xl mb-1">{p.company_name}</h3><p className="text-[10px] text-gray-400 uppercase font-bold">{new Date(p.updated_at).toLocaleDateString()}</p></div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800"><span className="text-[10px] font-bold text-gray-400">Öppna Editor</span><div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowRight size={14} /></div></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const hasPdfContent = activeProject?.sections.intro.content.includes("--- SIDA");
    const hasExistingAnalysis = !!activeProject?.last_analysis_content;

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
             
             {/* ANALYSIS MODAL */}
             {showAnalysisModal && (
                 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
                     <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] p-8 md:p-12 overflow-y-auto custom-scrollbar relative shadow-3xl flex flex-col">
                         <div className="flex justify-between items-start mb-8">
                             <div>
                                 <div className="flex items-center gap-3 mb-2">
                                     <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center"><BarChart3 size={24}/></div>
                                     <h2 className="font-serif-display text-4xl text-gray-900 dark:text-white">Tävlingsanalys</h2>
                                 </div>
                                 <p className="text-gray-500 font-medium">Bedömning baserad på officiella kriterier för Årets UF-företag.</p>
                             </div>
                             <div className="flex items-center gap-3">
                                 {analysisResult && (
                                     <button onClick={handleDownloadPdf} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Ladda ner PDF">
                                         <Download size={20} />
                                     </button>
                                 )}
                                 <button onClick={() => setShowAnalysisModal(false)} className="text-gray-400 hover:text-black dark:hover:text-white p-2"><X size={24}/></button>
                             </div>
                         </div>

                         {isAnalyzing ? (
                             <div className="py-20 text-center flex-1 flex flex-col items-center justify-center">
                                 <Loader2 size={48} className="animate-spin mx-auto mb-6 text-black dark:text-white" />
                                 <h3 className="text-xl font-bold mb-2">Granskar rapporten...</h3>
                                 <p className="text-gray-400 text-sm uppercase tracking-widest">Kollar obligatoriska delar • Värderar innovation • Granskar ekonomi</p>
                             </div>
                         ) : analysisResult ? (
                             <div ref={analysisRef} className="bg-gray-50 dark:bg-gray-950 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-y-auto">
                                 <MarkdownRenderer text={analysisResult} />
                             </div>
                         ) : null}
                     </div>
                 </div>
             )}

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
                <div className="flex gap-3 items-center">
                    {/* Visual Indicator that PDF is scanned */}
                    {hasPdfContent && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full animate-fadeIn border border-green-200 dark:border-green-800">
                            <FileCheck size={14} /> PDF Skannad & Redo
                        </span>
                    )}

                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading} 
                        className={`px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
                            uploadSuccess 
                            ? 'bg-green-500 text-white scale-105' 
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:scale-105 disabled:opacity-50'
                        }`}
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={16}/> : uploadSuccess ? <Check size={16}/> : <Upload size={16}/>}
                        {uploadSuccess ? 'Klar!' : 'Ladda upp PDF'}
                    </button>
                    
                    {hasExistingAnalysis && (
                        <button 
                            onClick={() => {
                                setAnalysisResult(activeProject!.last_analysis_content!);
                                setShowAnalysisModal(true);
                            }}
                            className="bg-green-600 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
                        >
                            <BarChart3 size={16}/> Visa senaste analys
                        </button>
                    )}

                    <button onClick={runFullAnalysis} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-all">
                        <Sparkles size={16}/> {hasExistingAnalysis ? 'Skapa ny analys' : 'Analysera Rapport'}
                    </button>
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
                        <p className="text-xs text-gray-400 line-clamp-2">{s.content || 'Ingen text än. Klicka för att skriva eller ladda upp PDF.'}</p>
                    </div>
                ))}
             </div>
        </div>
    );
};

export default ReportBuilder;
