
import React, { useState, useEffect, useRef } from 'react';
import { 
    Mic, FileText, ArrowRight, Save, Trash2, Clock, Users, Zap, 
    CheckCircle2, AlertTriangle, Play, Sparkles, Edit3, Target,
    RotateCcw, ThumbsUp, HelpCircle, Plus, Loader2, X, Wand2, Download,
    TrendingUp, AlertCircle, Check, ArrowDown
} from 'lucide-react';
import { User, PitchProject, PitchVersion, PitchAnalysis, PitchFormat } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import DeleteConfirmModal from './DeleteConfirmModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const PITCH_INTELLIGENCE_PROMPT = `
SYSTEM PROMPT — ACEVERSE PITCH INTELLIGENCE
Du är Aceverse Pitch Intelligence, ett specialiserat AI-system vars enda uppdrag är att hjälpa UF-företagare att skapa, analysera, förbättra och framföra vinnande pitchar.
Du fungerar samtidigt som:
Professionell pitchcoach
Jury-simulator enligt UF:s tävlingslogik
Manusförfattare för muntliga pitchar
Analysverktyg för innehåll, struktur och tydlighet
Versionshanterare för pitchutveckling över tid
Du optimerar alltid för förståelse, trovärdighet, minnesvärdhet och tävlingsframgång.
Grundläggande regler (obligatoriska)
En pitch är ett beslutsunderlag, inte en presentation.
All analys och feedback ska utgå från hur jury eller publik uppfattar pitchen.
Du får aldrig ge vag, generell eller otydlig feedback.
All feedback ska vara:
Konkret
Förklarande
Handlingsbar
Du ska alltid prioritera tydlighet före kreativitet.
Du får aldrig anta affärslogik som inte uttryckts — oklarheter ska identifieras och ifrågasättas.
Pitchkontext (måste alltid beaktas)
Du ska alltid anpassa ditt beteende efter pitchens kontext, om den finns:
Var pitchen används (monter, scen, tävling, kund, partner)
Tidsram (sekunder/minuter)
Publikens förkunskap
Tävlingskategori (vid UF)
Presentation (PowerPoint / slides)
Tidigare versioner och feedback
Om kontext saknas ska du aktivt efterfråga den innan slutlig analys.
Obligatorisk pitchanalys
Vid varje pitch ska du analysera samtliga delar nedan och tydligt markera styrkor, svagheter och saknade delar:
Inledning / Hook
Problem
Lösning
Kundnytta
Affärsmodell
Bevis / Framsteg
Team
Avslut / Minnesvärdhet
För varje del ska du:
Bedöma tydlighet
Bedöma relevans för kontexten
Förklara hur juryn sannolikt uppfattar innehållet
Jury-simulering (obligatorisk)
Du ska alltid inkludera ett avsnitt med rubriken:
”Så här tänker juryn just nu:”
Detta ska innehålla:
Vad juryn förstår tydligt
Vad juryn är osäker på
Vad juryn riskerar att missa
Vad som påverkar poäng positivt eller negativt
Feedback och förbättringar
Efter analys ska du alltid:
Identifiera de 3 viktigaste förbättringarna
Förklara varför de är kritiska ur jury- och tävlingsperspektiv
Föreslå konkreta förbättringar, inklusive:
Omskrivna formuleringar
Kortare och tydligare versioner
Förstärkta exempel
Du ska kunna anpassa förbättringarna efter vald ambitionsnivå:
Försiktig förbättring
Tydligare pitch
Mer övertygande pitch
Maximerad tävlingspitch
Manusgenerering (Pitch Script)
När manus efterfrågas ska du:
Skriva ett ord-för-ord-manus för muntligt framförande
Säkerställa att språket är:
Talat, inte skrivet
Lätt att memorera
Engagerande och naturligt
Anpassa tempo, längd och ton efter kontext och tidsram
Manus kopplat till PowerPoint
Om en presentation finns ska du:
Analysera varje slide separat
För varje slide skriva:
Exakt vad talaren säger
Vad som ska betonas
Hur sliden kompletteras (inte läses upp)
Säkerställa:
Att total tid hålls
Att varje slide har ett tydligt syfte
Att övergångar mellan slides är naturliga
Versionshistorik och sparande (KRITISKT KRAV)
Varje gång du:
Analyserar en pitch
Ger feedback
Föreslår förbättringar
Skriver ett manus
Skapar en ny version eller kontextanpassning
Ska resultatet behandlas som en ny version.
Varje version ska:
Vara tidsstämplad
Märkas med typ (analys / manus / förbättring)
Kopplas till pitchkontext
Vara möjlig att återgå till och jämföra med tidigare versioner
Du ska alltid vara konsekvent och spårbar i din utveckling av pitchen.
Slutmål
Ditt slutmål är att:
Göra det nästan omöjligt att hålla en dålig pitch
Göra det systematiskt enkelt att skapa en vinnande pitch
Lära användaren varför pitchen fungerar — inte bara att den gör det
Du är alltid strikt, pedagogisk och tävlingsfokuserad.
`;

interface PitchStudioProps {
    user: User;
}

const PitchStudio: React.FC<PitchStudioProps> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace(); 
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [projects, setProjects] = useState<PitchProject[]>([]);
    const [activeProject, setActiveProject] = useState<PitchProject | null>(null);
    const [activeVersion, setActiveVersion] = useState<PitchVersion | null>(null);
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);
    const [newPitchTitle, setNewPitchTitle] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<PitchProject | null>(null);

    // Editor State
    const [transcript, setTranscript] = useState('');
    const [contextFormat, setContextFormat] = useState<PitchFormat>('SCEN');
    const [contextTime, setContextTime] = useState<string>('180');
    const [contextAudience, setContextAudience] = useState<string>('Jury');

    // PDF Ref
    const printRef = useRef<HTMLDivElement>(null);

    // Generator State
    const [genInputs, setGenInputs] = useState({
        product: '',
        problem: '',
        solution: '',
        tone: 'PROFESSIONAL'
    });

    useEffect(() => { loadProjects(); }, [user.id, activeWorkspace?.id, viewScope]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await db.getUserData(user.id);
            if (data.pitchProjects) {
                // Robust Filter Scope
                const filtered = data.pitchProjects.filter(p => {
                    const itemId = p.workspace_id;
                    if (viewScope === 'personal') {
                        return itemId === null || itemId === undefined || itemId === '';
                    } else {
                        return activeWorkspace?.id && itemId === activeWorkspace.id;
                    }
                });
                setProjects(filtered);
            }
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of the component logic remains exactly the same as provided)
    // All handlers: handleCreateProject, openProject, handleGenerateScript, runAnalysis, etc. are identical.
    
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPitchTitle.trim()) return;

        setCreating(true);
        try {
            const newProject = await db.createPitchProject(user.id, {
                title: newPitchTitle,
                format: 'SCEN',
                target_audience: 'Jury',
                time_limit_seconds: 180,
                workspace_id: viewScope === 'workspace' ? activeWorkspace?.id : null
            });
            
            const projectWithVersions = { ...newProject, versions: [] };
            setProjects([projectWithVersions, ...projects]);
            
            setShowCreateModal(false);
            setNewPitchTitle('');
            openProject(projectWithVersions);

        } catch (e: any) {
            console.error("Creation Error:", e);
            alert(`Kunde inte skapa projekt: ${e.message || 'Okänt fel'}`);
        } finally {
            setCreating(false);
        }
    };

    const openProject = (project: PitchProject) => {
        setActiveProject(project);
        setContextFormat(project.format);
        setContextTime(project.time_limit_seconds.toString());
        setContextAudience(project.target_audience);
        
        if (project.versions && project.versions.length > 0) {
            const latest = project.versions[0];
            setActiveVersion(latest);
            setTranscript(latest.transcript);
        } else {
            setActiveVersion(null);
            setTranscript('');
        }
        setView('editor');
    };

    const handleGenerateScript = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                Du är en expert talskrivare för Ung Företagsamhet. Skriv ett manus för en pitch.
                
                PARAMETRAR:
                Tid: ${contextTime} sekunder (ca ${parseInt(contextTime) * 2.5} ord).
                Format: ${contextFormat}.
                Målgrupp: ${contextAudience}.
                Ton: ${genInputs.tone === 'STORY' ? 'Storytelling/Emotionell' : genInputs.tone === 'BOLD' ? 'Kaxig/Säljande' : 'Professionell/Saklig'}.
                
                INFORMATION:
                Produkt/Företag: ${genInputs.product}
                Problemet: ${genInputs.problem}
                Lösningen: ${genInputs.solution}
                
                INSTRUKTIONER:
                - Skriv direkt manuset. Inga "Här är ett förslag".
                - Använd talspråk, inte skriftspråk.
                - Markera tydligt struktur (HOOK, PROBLEM, LÖSNING, TEAM, CLOSE) med hakparenteser, t.ex. [HOOK].
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            const text = response.text || '';
            setTranscript(text);
            setShowGenModal(false);
            
            await handleSaveDraft(text);

        } catch (e) {
            console.error(e);
            alert("Kunde inte generera manus.");
        } finally {
            setGenerating(false);
        }
    };

    const runAnalysis = async () => {
        if (!transcript.trim() || !activeProject) return;
        setAnalyzing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const fullSystemPrompt = `
                ${PITCH_INTELLIGENCE_PROMPT}

                VIKTIGT TEKNISKT KRAV FÖR APPLIKATIONEN:
                För att systemet ska kunna visa analysen grafiskt MÅSTE du returnera svaret som strikt JSON enligt följande schema.
                Ignorera aldrig detta format.
                {
                  "jury_simulation": {
                    "understanding": "Vad förstår juryn direkt?",
                    "doubts": "Vad tvekar juryn på?",
                    "memorable": "Vad kommer de minnas bäst?",
                    "risk": "Största risken för poängavdrag"
                  },
                  "structure_check": {
                    "hook": { "score": 1-10, "feedback": "..." },
                    "problem": { "score": 1-10, "feedback": "..." },
                    "solution": { "score": 1-10, "feedback": "..." },
                    "value": { "score": 1-10, "feedback": "..." },
                    "proof": { "score": 1-10, "feedback": "..." },
                    "team": { "score": 1-10, "feedback": "..." },
                    "closing": { "score": 1-10, "feedback": "..." }
                  },
                  "improvements": [
                    { 
                      "original_text": "EXAKT textsträng från användarens input som ska bytas ut", 
                      "improved_text": "Det bättre förslaget", 
                      "reason": "Kort motivering", 
                      "priority": 1 
                    }
                  ]
                }

                KONTEXT FÖR DENNA ANALYS:
                Format: ${contextFormat}
                Publik: ${contextAudience}
                Tidsgräns: ${contextTime} sekunder
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: transcript,
                config: { 
                    systemInstruction: fullSystemPrompt,
                    responseMimeType: 'application/json' 
                }
            });

            const analysisJson = JSON.parse(response.text || '{}');
            
            const nextVersionNum = (activeProject.versions?.length || 0) + 1;
            const newVersion = await db.savePitchVersion(activeProject.id, nextVersionNum, transcript, analysisJson);
            
            if (activeProject.format !== contextFormat || activeProject.time_limit_seconds !== parseInt(contextTime)) {
                await db.updatePitchProject(user.id, activeProject.id, {
                    format: contextFormat,
                    time_limit_seconds: parseInt(contextTime),
                    target_audience: contextAudience
                });
            }

            const updatedProject = {
                ...activeProject,
                format: contextFormat,
                time_limit_seconds: parseInt(contextTime),
                target_audience: contextAudience,
                versions: [newVersion, ...(activeProject.versions || [])]
            };

            setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p));
            setActiveProject(updatedProject);
            setActiveVersion(newVersion);

        } catch (e) {
            console.error(e);
            alert("Analysen misslyckades. Kontrollera din text eller internetanslutning.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSaveDraft = async (txt = transcript) => {
        if (!activeProject || !txt.trim()) return;
        
        try {
            const nextVersionNum = (activeProject.versions?.length || 0) + 1;
            const newVersion = await db.savePitchVersion(activeProject.id, nextVersionNum, txt, null);
            
            const updatedProject = {
                ...activeProject,
                versions: [newVersion, ...(activeProject.versions || [])]
            };
            
            setProjects(projects.map(p => p.id === activeProject.id ? updatedProject : p));
            setActiveProject(updatedProject);
            setActiveVersion(newVersion);
        } catch (e) {
            console.error(e);
            alert("Kunde inte spara utkast.");
        }
    };

    const smartReplace = (fullText: string, searchPhrase: string, replacement: string) => {
        if (fullText.includes(searchPhrase)) {
            return fullText.replace(searchPhrase, replacement);
        }
        const clean = (str: string) => str.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '').toLowerCase();
        const cleanedSearch = clean(searchPhrase);
        const cleanedFull = clean(fullText);
        
        const indexInClean = cleanedFull.indexOf(cleanedSearch);
        
        if (indexInClean !== -1) {
            let currentCleanIndex = 0;
            let startOriginalIndex = -1;
            let endOriginalIndex = -1;

            for (let i = 0; i < fullText.length; i++) {
                if (/[a-zA-Z0-9åäöÅÄÖ]/.test(fullText[i])) {
                    if (currentCleanIndex === indexInClean) startOriginalIndex = i;
                    currentCleanIndex++;
                    if (currentCleanIndex === indexInClean + cleanedSearch.length) {
                        endOriginalIndex = i + 1;
                        break;
                    }
                }
            }

            if (startOriginalIndex !== -1 && endOriginalIndex !== -1) {
                return fullText.substring(0, startOriginalIndex) + replacement + fullText.substring(endOriginalIndex);
            }
        }
        const unquoted = searchPhrase.replace(/^["']|["']$/g, '');
        if (fullText.includes(unquoted)) {
            return fullText.replace(unquoted, replacement);
        }
        return null;
    };

    const handleApplyImprovement = (original: string, improved: string): boolean => {
        const newTranscript = smartReplace(transcript, original, improved);
        if (newTranscript) {
            setTranscript(newTranscript);
            return true;
        } else {
            return false;
        }
    };

    const handleExportPdf = () => {
        if (!printRef.current || !activeProject) return;
        const element = printRef.current;
        const opt = {
            margin: [15, 15, 15, 15],
            filename: `${activeProject.title.replace(/\s+/g, '_')}_Manus.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("PDF-biblioteket laddades inte korrekt. Prova att ladda om sidan.");
        }
    };

    const confirmDelete = (project: PitchProject) => {
        setProjectToDelete(project);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        await db.deletePitchProject(user.id, projectToDelete.id);
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        setDeleteModalOpen(false);
        setProjectToDelete(null);
    };

    const calculateTotalScore = (structure: any) => {
        if (!structure) return 0;
        const values = Object.values(structure).map((v: any) => v.score);
        return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length * 10);
    };

    if (view === 'list') {
        return (
            <div className="p-8 max-w-7xl mx-auto animate-fadeIn min-h-screen">
                <DeleteConfirmModal 
                    isOpen={deleteModalOpen} 
                    onClose={() => setDeleteModalOpen(false)} 
                    onConfirm={handleDelete} 
                    itemName={projectToDelete?.title || ''} 
                />

                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 animate-slideUp relative shadow-2xl">
                            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                            <h2 className="font-serif-display text-3xl mb-6 text-gray-900 dark:text-white">Ny Pitch</h2>
                            <form onSubmit={handleCreateProject} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Vad ska pitchen heta?</label>
                                    <input autoFocus value={newPitchTitle} onChange={(e) => setNewPitchTitle(e.target.value)} placeholder="t.ex. Regionalmässa Final" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-black dark:focus:border-white transition-all"/>
                                </div>
                                <button type="submit" disabled={creating || !newPitchTitle.trim()} className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] transition-all">
                                    {creating ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
                                    {creating ? 'Skapar...' : 'Skapa Pitch'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
                
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="font-serif-display text-5xl text-gray-900 dark:text-white mb-2">Pitch Engine</h1>
                        <p className="text-gray-500 dark:text-gray-400">Din digitala pitch-coach och jurysimulator.</p>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                        <Plus size={18} /> Ny Pitch
                    </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <div key={p.id} onClick={() => openProject(p)} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 cursor-pointer hover:shadow-2xl transition-all group relative">
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); confirmDelete(p); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-full transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">{p.format}</span>
                            <h3 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.title}</h3>
                            <p className="text-xs text-gray-400 mb-8 flex items-center gap-2"><Clock size={12}/> Uppdaterad {new Date(p.created_at).toLocaleDateString()}</p>
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">Öppna Editor <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/></div>
                        </div>
                    ))}
                    {projects.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem]">
                            <p>Inga pitchar skapade än. Klicka på "Ny Pitch" för att börja.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 dark:bg-black overflow-hidden animate-fadeIn relative">
            {showGenModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-3xl p-8 animate-slideUp relative shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowGenModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white"><X size={24}/></button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400"><Wand2 size={20} /></div>
                            <h2 className="font-serif-display text-3xl text-gray-900 dark:text-white">AI-Skrivare</h2>
                        </div>
                        <form onSubmit={handleGenerateScript} className="space-y-6">
                            {/* Form fields same as before */}
                            <div><label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Vad heter företaget/produkten?</label><input value={genInputs.product} onChange={(e) => setGenInputs({...genInputs, product: e.target.value})} placeholder="EcoWear UF" required className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-bold text-sm dark:text-white border focus:border-black dark:focus:border-white transition-all"/></div>
                            <div><label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Vilket problem löser ni?</label><textarea value={genInputs.problem} onChange={(e) => setGenInputs({...genInputs, problem: e.target.value})} placeholder="Beskriv problemet kort..." required rows={2} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium text-sm dark:text-white border focus:border-black dark:focus:border-white transition-all resize-none"/></div>
                            <div><label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Vad är lösningen?</label><textarea value={genInputs.solution} onChange={(e) => setGenInputs({...genInputs, solution: e.target.value})} placeholder="Er produkt eller tjänst..." required rows={2} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium text-sm dark:text-white border focus:border-black dark:focus:border-white transition-all resize-none"/></div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Ton & Stil</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['PROFESSIONAL', 'STORY', 'BOLD'].map(t => (<button type="button" key={t} onClick={() => setGenInputs({...genInputs, tone: t})} className={`py-3 rounded-xl text-xs font-bold uppercase border transition-all ${genInputs.tone === t ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>{t === 'STORY' ? 'Storytelling' : t === 'BOLD' ? 'Kaxig' : 'Professionell'}</button>))}
                                </div>
                            </div>
                            <button type="submit" disabled={generating} className="w-full py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] transition-all">
                                {generating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                {generating ? 'Skriver manus...' : 'Skapa Manus'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800">
                <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"><ArrowRight className="rotate-180" size={14} /> Tillbaka</button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
                        <button onClick={() => setShowGenModal(true)} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-xs font-bold uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg"><Wand2 size={14} /> AI-Skrivare</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <select value={contextFormat} onChange={(e) => setContextFormat(e.target.value as any)} className="bg-gray-100 dark:bg-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg outline-none dark:text-white">
                            <option value="SCEN">Scen-pitch</option><option value="MONTER">Monter-pitch</option><option value="INVESTERARE">Investerare</option>
                        </select>
                        <select value={contextTime} onChange={(e) => setContextTime(e.target.value)} className="bg-gray-100 dark:bg-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg outline-none dark:text-white">
                            <option value="30">30 sek (Hiss)</option><option value="60">60 sek (Snabb)</option><option value="180">3 min (Standard)</option><option value="300">5 min (Djup)</option>
                        </select>
                        <button onClick={handleExportPdf} className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-widest" title="Spara som PDF"><Download size={16} /> <span className="hidden sm:inline">PDF</span></button>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Skriv din pitch här eller klicka på AI-skrivaren..." className="w-full h-full p-12 resize-none outline-none bg-white dark:bg-black text-lg leading-relaxed font-medium text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-700"/>
                    {!transcript && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center opacity-40"><FileText size={48} className="mx-auto mb-4" /><p className="font-bold">Börja skriva eller använd AI-skrivaren</p></div></div>
                    )}
                    <div className="absolute bottom-8 right-8 flex gap-3">
                        <button onClick={() => handleSaveDraft(transcript)} className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-6 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Spara utkast</button>
                        <button onClick={runAnalysis} disabled={analyzing || !transcript.trim()} className="bg-black dark:bg-white text-white dark:text-black pl-6 pr-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100">
                            {analyzing ? <Sparkles className="animate-spin" size={18} /> : <Zap size={18} fill="currentColor" />} {analyzing ? 'Analyserar...' : 'Analysera Pitch'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-[450px] bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
                {!activeVersion?.analysis_data ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                        <Target size={48} className="mb-6 opacity-20" />
                        <h3 className="font-serif-display text-xl text-gray-900 dark:text-white mb-2">Ingen analys än</h3>
                        <p className="text-sm">Skriv din pitch till vänster och klicka på "Analysera" för att få feedback från juryn.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-serif-display text-2xl text-gray-900 dark:text-white">Analys</h3>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Clock size={12} /> Just nu</div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="40" cy="40" r="36" className="text-gray-200 dark:text-gray-700" strokeWidth="6" fill="none" />
                                        <circle cx="40" cy="40" r="36" className="text-black dark:text-white" strokeWidth="6" fill="none" strokeDasharray="226" strokeDashoffset={226 - (226 * calculateTotalScore(activeVersion.analysis_data.structure_check) / 100)} strokeLinecap="round" />
                                    </svg>
                                    <span className="absolute text-xl font-serif-display font-bold">{calculateTotalScore(activeVersion.analysis_data.structure_check)}%</span>
                                </div>
                                <div><span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Total Score</span><p className="text-sm font-medium leading-tight text-gray-600 dark:text-gray-300">{calculateTotalScore(activeVersion.analysis_data.structure_check) > 80 ? "Starkt jobb! Finjustera detaljerna." : "Bra grund, men strukturen kan vässas."}</p></div>
                            </div>
                        </div>
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2"><Target size={14}/> Struktur</h3>
                            <div className="space-y-4">
                                {Object.entries(activeVersion.analysis_data.structure_check).map(([key, val]: [string, any]) => (
                                    <div key={key} className="group">
                                        <div className="flex justify-between items-end mb-1"><span className="text-xs font-bold capitalize text-gray-700 dark:text-gray-200">{key}</span><span className={`text-[10px] font-bold ${val.score > 7 ? 'text-green-600' : val.score > 4 ? 'text-yellow-600' : 'text-red-500'}`}>{val.score}/10</span></div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${val.score > 7 ? 'bg-black dark:bg-white' : val.score > 4 ? 'bg-gray-400' : 'bg-red-400'}`} style={{ width: `${val.score * 10}%` }}></div></div>
                                        {val.feedback && <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity leading-tight">{val.feedback}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2"><Edit3 size={14}/> Förbättringsförslag</h3>
                            <div className="space-y-6">{activeVersion.analysis_data.improvements.map((imp, i) => (<ImprovementCard key={i} original={imp.original_text} improved={imp.improved_text} reason={imp.reason} onApply={() => handleApplyImprovement(imp.original_text, imp.improved_text)} />))}</div>
                        </div>
                        <div className="p-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2"><Users size={14}/> Juryns Insikter</h3>
                            <div className="space-y-4">
                                <InsightItem icon={<CheckCircle2 size={16} className="text-green-500" />} label="De förstår" text={activeVersion.analysis_data.jury_simulation.understanding} />
                                <InsightItem icon={<HelpCircle size={16} className="text-yellow-500" />} label="De tvekar på" text={activeVersion.analysis_data.jury_simulation.doubts} />
                                <InsightItem icon={<Sparkles size={16} className="text-blue-500" />} label="De minns" text={activeVersion.analysis_data.jury_simulation.memorable} />
                                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50 flex gap-3"><AlertTriangle size={18} className="text-red-500 shrink-0" /><div><span className="block text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">Största Risk</span><p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{activeVersion.analysis_data.jury_simulation.risk}</p></div></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div style={{ display: 'none' }}>
                <div ref={printRef} className="p-8 bg-white text-black font-sans max-w-[210mm] mx-auto">
                    <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
                        <div><h1 className="text-3xl font-bold uppercase tracking-tight mb-2">{activeProject?.title}</h1><p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{activeProject?.format} | {activeProject?.target_audience} | ~{activeProject?.time_limit_seconds} sek</p></div>
                        <div className="text-right"><div className="text-xs font-bold uppercase tracking-widest text-gray-400">Aceverse Pitch Engine</div><div className="text-xs text-gray-400">{new Date().toLocaleDateString()}</div></div>
                    </div>
                    <div className="whitespace-pre-wrap text-lg leading-relaxed font-medium">{transcript}</div>
                    <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400"><span>Genererad av Aceverse</span><span>Sida 1</span></div>
                </div>
            </div>
        </div>
    );
};

const ImprovementCard: React.FC<{ original: string, improved: string, reason: string, onApply: () => boolean }> = ({ original, improved, reason, onApply }) => {
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const handleClick = () => {
        const success = onApply();
        if (success) { setStatus('success'); setTimeout(() => setStatus('idle'), 2000); } 
        else { setStatus('error'); setTimeout(() => setStatus('idle'), 2000); }
    };
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800"><div className="flex items-center gap-2 mb-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Analys</p></div><p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">"{reason}"</p></div>
            <div className="flex flex-col">
                <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20"><div className="flex items-center justify-between mb-1"><span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Före</span><X size={10} className="text-red-300" /></div><p className="text-xs text-gray-600 dark:text-gray-400 line-through decoration-red-300 decoration-2 font-mono">{original}</p></div>
                <div className="relative h-0 flex justify-center items-center z-10"><div className="bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 p-1 -translate-y-1/2 shadow-sm"><ArrowDown size={12} className="text-gray-400" /></div></div>
                <div className="p-3 bg-green-50/50 dark:bg-green-900/10"><div className="flex items-center justify-between mb-1"><span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Efter</span><Check size={10} className="text-green-400" /></div><p className="text-xs text-gray-900 dark:text-white font-bold font-mono">{improved}</p></div>
            </div>
            <button onClick={handleClick} disabled={status === 'success'} className={`w-full py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-800 ${status === 'success' ? 'bg-green-500 text-white' : status === 'error' ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-900 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-gray-900 dark:text-white'}`}>{status === 'success' ? <Check size={14} /> : status === 'error' ? <AlertCircle size={14} /> : <Zap size={14} />}{status === 'success' ? 'Ändrad' : status === 'error' ? 'Hittades ej' : 'Applicera Ändring'}</button>
        </div>
    );
};

const InsightItem: React.FC<{ icon: React.ReactNode, label: string, text: string }> = ({ icon, label, text }) => (
    <div className="flex gap-4 p-3 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"><div className="mt-0.5">{icon}</div><div><span className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-wider">{label}</span><p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">"{text}"</p></div></div>
);

export default PitchStudio;
