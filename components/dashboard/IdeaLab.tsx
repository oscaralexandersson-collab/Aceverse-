
import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Trash2, Check, ArrowRight, Zap, Target, 
    CheckCircle2, Info, AlertTriangle, Calendar, 
    FileText, ShieldCheck, Flag, ArrowUpRight,
    TrendingUp, Users, Loader2, Search, BookOpen, MessageSquare,
    ChevronRight, BarChart3, Shield, Award, Sparkles, Lightbulb,
    Save, LogOut, ChevronDown, ChevronUp
} from 'lucide-react';
import { User, Idea, ChatMessage, UFScore } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import DeleteConfirmModal from './DeleteConfirmModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const STRATEGIST_PROMPT = `
# SYSTEMPROMPT – Aceverse Strategisk Coach & Kontext-Arkitekt

## Din roll
Du är en Senior Strategisk Rådgivare. Ditt mål är att hjälpa användaren att formulera ett omfattande "Koncept-Dossier". 

## KRAV PÅ "detailed_business_concept" (VIKTIGT!)
När du fyller i "detailed_business_concept", skriv INTE bara en mening. Skriv en djuplodande beskrivning (minst 150-250 ord) som inkluderar:
1. **Bakgrund:** Varför behövs detta?
2. **Problemet:** En detaljerad beskrivning av den specifika "pain point" ni adresserar.
3. **Lösningen:** Hur fungerar er produkt/tjänst i detalj?
4. **Impact:** Vilken skillnad gör ni för kunden?

Använd ett professionellt, affärsmässigt språk lämpligt för en formell affärsplan.

## Dossier-struktur (Snapshot)
Uppdatera följande i "snapshot_patch":
- **title**: Namn på konceptet.
- **detailed_business_concept**: Det omfattande koncept-dokumentet (LÅNG TEXT).
- **icp**: Ideal Customer Profile (Vem betalar?).
- **uvp**: Unique Value Proposition (Varför ni?).
- **pricing_hypothesis**: Intäktsmodell och prissättningsstrategi.
- **mvp_definition**: Vad är det minsta ni kan göra för att testa detta?
- **uf_score**: Bedömning 1-10 och risker.

## Dialogregler
- Utmana användaren. Var "Djävulens advokat".
- Om användaren ger ett kort svar, hjälp dem att expandera det genom att ställa följdfrågor.
- Du kan uppdatera dossiern flera gånger under samtalets gång.

## Output-format (OBLIGATORISKT)
Svara alltid i JSON:
{
  "response": "Ditt meddelande till användaren",
  "is_ready_to_finalize": boolean,
  "snapshot_patch": {
    "title": "string",
    "detailed_business_concept": "string (OMFATTANDE)",
    "icp": "string",
    "uvp": "string",
    "pricing_hypothesis": "string",
    "mvp_definition": "string",
    "uf_score": {
      "feasibility": 1-10,
      "risk": "Låg/Medel/Hög",
      "warning_point": "string"
    }
  }
}
`;

type LabView = 'landing' | 'dialog' | 'decision';
type LabMode = 'A' | 'B' | 'C' | null;

const IdeaLab: React.FC<{ user: User }> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    const [view, setView] = useState<LabView>('landing');
    const [mode, setMode] = useState<LabMode>(null);
    const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
    const [isReadyToFinalize, setIsReadyToFinalize] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadIdeas(); }, [user.id, activeWorkspace?.id, viewScope]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    const loadIdeas = async () => {
        const data = await db.getUserData(user.id);
        const filtered = data.ideas.filter(i => {
            const itemId = i.workspace_id;
            if (viewScope === 'personal') return !itemId;
            return activeWorkspace?.id && itemId === activeWorkspace.id;
        });
        setIdeas(filtered.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    };

    const startMode = async (selectedMode: LabMode) => {
        setMode(selectedMode);
        setView('dialog');
        const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
        const session = await db.createChatSession(user.id, `Strategisession: ${selectedMode}`, 'IdeaLab', workspaceId, 'shared');
        
        const initialIdea = await db.addIdea(user.id, {
            title: 'Nytt UF-koncept',
            chat_session_id: session.id,
            current_phase: selectedMode || 'A',
            snapshot: { 
                problem_statement: '', // Keep for legacy but we focus on concept
                detailed_business_concept: '', 
                icp: '', solution_hypothesis: '', uvp: '', 
                one_pager: '', persona_summary: '', pricing_hypothesis: '', 
                mvp_definition: '', open_questions: [], next_step: '',
                uf_score: { feasibility: 5, risk: 'Medel', time_realism: 'Gul', copy_risk: 'Medel', complexity: 'Medel', warning_point: 'Väntar på data...', motivation: 'Initial bedömning' }
            },
            workspace_id: workspaceId
        });
        
        setActiveIdea(initialIdea);
        const intros = {
            A: "Okej teamet, dags att hitta er guldgruva. Vi börjar från noll. Vad brinner ni för – att skapa något fysiskt, sälja tjänster eller lösa ett digitalt problem?",
            B: "Intressant! Ni har redan en tanke. Berätta vad ni funderar på så ska jag utmana idén och se om den håller för ett helt UF-år.",
            C: "Verklighetscheck. Vad är idén vi ska stresstesta idag?"
        };
        setMessages([{ id: 'init', role: 'ai', text: intros[selectedMode!], timestamp: Date.now(), session_id: session.id, user_id: user.id, created_at: new Date().toISOString() }]);
    };

    const resumeIdea = async (idea: Idea) => {
        setActiveIdea(idea);
        setMode(idea.current_phase as LabMode);
        setView('dialog');
        setIsThinking(true);
        try {
            const data = await db.getUserData(user.id);
            const history = data.chatHistory.filter(m => m.session_id === idea.chat_session_id).sort((a,b) => a.timestamp - b.timestamp);
            setMessages(history);
        } catch (e) { console.error(e); } finally { setIsThinking(false); }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = chatInput.trim();
        if (!input || isThinking || !activeIdea) return;
        
        setChatInput('');
        setIsThinking(true);
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now(), session_id: activeIdea.chat_session_id!, user_id: user.id, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        try {
            await db.addMessage(user.id, { role: 'user', text: input, session_id: activeIdea.chat_session_id! });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Limit history to save tokens and stay focused
            const historyText = messages.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
            const promptContext = `LÄGE: ${mode}. AKTUELL DOSSIER: ${JSON.stringify(activeIdea.snapshot)}. HISTORIK:\n${historyText}\nANVÄNDARE: ${input}`;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: STRATEGIST_PROMPT, responseMimeType: 'application/json', temperature: 0.4 },
                contents: promptContext
            });
            
            const data = JSON.parse(result.text || '{}');
            const aiMsg = await db.addMessage(user.id, { role: 'ai', text: data.response, session_id: activeIdea.chat_session_id! });
            setMessages(prev => [...prev, aiMsg]);
            setIsReadyToFinalize(data.is_ready_to_finalize);

            if (data.snapshot_patch) {
                const updatedIdea = { 
                    ...activeIdea, 
                    title: data.snapshot_patch.title || activeIdea.title, 
                    snapshot: { ...activeIdea.snapshot, ...data.snapshot_patch } 
                };
                setActiveIdea(updatedIdea);
                await db.updateIdeaState(user.id, activeIdea.id, updatedIdea);
            }
        } catch (err) { console.error(err); } finally { setIsThinking(false); }
    };

    const handleSaveAndExit = async () => {
        if (!activeIdea) return;
        setIsSaving(true);
        try {
            await db.updateIdeaState(user.id, activeIdea.id, activeIdea);
            setView('landing');
            loadIdeas();
        } finally { setIsSaving(false); }
    };

    if (view === 'landing') {
        return (
            <div className="p-8 md:p-16 max-w-7xl mx-auto animate-fadeIn pb-40">
                <DeleteConfirmModal isOpen={!!ideaToDelete} onClose={() => setIdeaToDelete(null)} onConfirm={async () => { await db.deleteIdea(user.id, ideaToDelete!.id); loadIdeas(); setIdeaToDelete(null); }} itemName={ideaToDelete?.title || ''} />
                <div className="mb-20">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.8em] mb-4 block">UF-Kompassen 2.0</span>
                    <h1 className="font-serif-display text-7xl md:text-8xl text-gray-950 dark:text-white italic tracking-tighter mb-4 leading-none">Strategilabbet.</h1>
                    <p className="text-xl text-gray-500 max-w-2xl font-medium">Här bygger vi kontexten som styr hela er resa. Välj ert nuvarande läge för att börja.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 mb-32">
                    <ModeCard title="A. Ingen idé" desc="Vi hittar er nisch baserat på styrkor." icon={<Target size={32} />} onClick={() => startMode('A')} color="blue" />
                    <ModeCard title="B. Vag idé" desc="Vi gör idén konkret och skalbar." icon={<Zap size={32} />} onClick={() => startMode('B')} color="purple" />
                    <ModeCard title="C. Verifiera" desc="Vi stresstestar idén mot marknaden." icon={<CheckCircle2 size={32} />} onClick={() => startMode('C')} color="green" />
                </div>
                
                {ideas.length > 0 && (
                    <>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-8 italic">Pågående Koncept</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {ideas.map(i => (
                                <div key={i.id} onClick={() => resumeIdea(i)} className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group relative flex flex-col justify-between h-80 ${i.is_active_track ? 'bg-black text-white border-black shadow-2xl scale-105 z-10' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-black shadow-sm'}`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            {i.is_active_track ? <span className="px-3 py-1 bg-blue-500 text-white text-[8px] font-black uppercase rounded-full tracking-widest italic flex items-center gap-1.5"><Shield size={10}/> Aktivt Spår</span> : <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400"><BookOpen size={20}/></div>}
                                            <button onClick={(e) => { e.stopPropagation(); setIdeaToDelete(i); }} className="text-gray-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                        <h3 className="text-xl font-bold uppercase mb-2 truncate">{i.title}</h3>
                                        <p className={`text-xs leading-relaxed line-clamp-4 ${i.is_active_track ? 'text-white/60' : 'text-gray-400'}`}>{i.snapshot.detailed_business_concept || i.snapshot.problem_statement || 'Väntar på strategisk input...'}</p>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-40">
                                        <div className="flex items-center gap-2"><Calendar size={12}/> {new Date(i.created_at).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1">Fortsätt <ChevronRight size={14} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (view === 'dialog' && activeIdea) {
        return (
            <div className="h-[calc(100vh-64px)] flex bg-white dark:bg-black overflow-hidden animate-fadeIn">
                {/* LEFT: Chat Interface */}
                <div className="flex-1 flex flex-col border-r border-gray-100 dark:border-gray-800">
                    {/* Header with Exit action */}
                    <div className="h-16 px-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3">
                            <button onClick={handleSaveAndExit} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                <LogOut size={14} className="rotate-180" /> Spara & Gå ut
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest italic">
                            <Sparkles size={12} /> Strategiläge Aktivt
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                        <div className="max-w-2xl mx-auto space-y-8 pb-20">
                            {messages.map(m => (
                                <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${m.role === 'ai' ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-black/5'}`}>
                                        {m.role === 'ai' ? <Zap size={18} fill="currentColor" /> : 'DU'}
                                    </div>
                                    <div className={`max-w-[85%] px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none font-medium' : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-none border border-black/5'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center"><Loader2 size={16} className="text-white dark:text-black animate-spin" /></div>
                                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-none text-xs font-bold text-gray-400 uppercase tracking-widest">Analyserar din strategi...</div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>
                    <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
                        <form onSubmit={handleSend} className="max-w-2xl mx-auto relative flex items-center gap-3">
                            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Besvara coachen..." className="flex-1 bg-gray-100 dark:bg-gray-900 border-2 border-transparent focus:border-black dark:focus:border-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all dark:text-white shadow-inner" />
                            <button type="submit" disabled={!chatInput.trim() || isThinking} className="w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-xl shrink-0"><ArrowRight size={24} /></button>
                        </form>
                    </div>
                </div>

                {/* RIGHT: Live Dossier View */}
                <div className="w-[480px] flex flex-col bg-gray-50 dark:bg-gray-950 p-8 overflow-y-auto custom-scrollbar border-l border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white"><ShieldCheck size={16} /></div>
                            <h3 className="font-serif-display font-bold text-xl uppercase italic tracking-tight">Live Dossier</h3>
                        </div>
                        {(isReadyToFinalize || activeIdea.snapshot.detailed_business_concept) && (
                            <button onClick={() => setView('decision')} className="px-5 py-2 bg-green-500 text-white text-[10px] font-black uppercase rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-2">Slutför <ArrowRight size={12}/></button>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* Concept Section (Much larger) */}
                        <div className="space-y-3 group">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
                                <Lightbulb size={14}/> Affärsidé & Koncept
                            </div>
                            <div className={`p-6 rounded-[2rem] border transition-all ${activeIdea.snapshot.detailed_business_concept ? 'bg-white dark:bg-gray-900 border-black/5 shadow-xl' : 'bg-transparent border-dashed border-gray-200 dark:border-gray-800'}`}>
                                {activeIdea.snapshot.detailed_business_concept ? (
                                    <div className="text-sm leading-[1.6] text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap italic">
                                        {activeIdea.snapshot.detailed_business_concept}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Väntar på att ni ska definiera idén djupare...</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <DossierSection title="Målgrupp" icon={<Users size={12}/>} content={activeIdea.snapshot.icp} placeholder="Vem betalar?" />
                            <DossierSection title="Modell" icon={<TrendingUp size={12}/>} content={activeIdea.snapshot.pricing_hypothesis} placeholder="Intäkter?" />
                        </div>

                        <DossierSection title="Unikt Värde" icon={<Zap size={12}/>} content={activeIdea.snapshot.uvp} placeholder="Varför välja er?" />
                        
                        <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={14}/> Strategisk UF-Score</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <ScoreBox label="Realism" value={`${activeIdea.snapshot.uf_score?.feasibility}/10`} color={activeIdea.snapshot.uf_score?.feasibility! > 7 ? 'green' : 'orange'} />
                                <ScoreBox label="Risk" value={activeIdea.snapshot.uf_score?.risk || 'N/A'} color={activeIdea.snapshot.uf_score?.risk === 'Låg' ? 'green' : 'red'} />
                            </div>
                            {activeIdea.snapshot.uf_score?.warning_point && (
                                <div className="mt-4 p-5 bg-black text-white dark:bg-white dark:text-black rounded-3xl relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">Strategisk Varning</span>
                                    <p className="text-[11px] font-bold italic leading-relaxed">{activeIdea.snapshot.uf_score.warning_point}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'decision' && activeIdea) {
        const score = activeIdea.snapshot.uf_score;
        return (
            <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-10 md:p-20 overflow-y-auto custom-scrollbar animate-fadeIn">
                <div className="max-w-5xl mx-auto pb-40">
                    <div className="mb-20 text-center">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[1.2em] mb-8 block italic">Strategiskt Beslutsunderlag</span>
                        <h2 className="font-serif-display text-6xl md:text-8xl italic uppercase tracking-tighter leading-[0.85] text-gray-950 dark:text-white mb-10">Klar för lansering.</h2>
                        <div className="flex justify-center gap-4">
                            <div className="px-8 py-3 bg-white dark:bg-gray-900 border border-black/5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl"><ShieldCheck size={16} className="text-green-500"/> Verifierat UF-koncept</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-12 gap-8">
                        <div className="md:col-span-4 space-y-6">
                            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-2xl border border-black/5">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-12 italic border-b border-black/5 pb-4">UF-Realism</h3>
                                <div className="space-y-10">
                                    <ScoreRow label="Genomförbarhet" value={`${score?.feasibility}/10`} status={score?.feasibility && score.feasibility > 7 ? 'good' : 'bad'} />
                                    <ScoreRow label="UF-Risk" value={score?.risk || 'N/A'} status={score?.risk === 'Låg' ? 'good' : score?.risk === 'Medel' ? 'neutral' : 'bad'} />
                                    <ScoreRow label="Tidsrealism" value={score?.time_realism || 'N/A'} status={score?.time_realism === 'Grön' ? 'good' : 'bad'} />
                                    <ScoreRow label="Komplexitet" value={score?.complexity || 'N/A'} status={score?.complexity === 'Enkel' ? 'good' : 'neutral'} />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-8 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-900 p-16 rounded-[4rem] shadow-3xl border border-black/5 flex-1 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-1000"><Shield size={250}/></div>
                                <div className="flex items-center gap-4 mb-12">
                                    <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-xl"><Zap size={24}/></div>
                                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] italic text-gray-300">Koncept Dossier</h3>
                                </div>
                                <h1 className="text-5xl font-serif-display italic font-black uppercase tracking-tighter mb-8 leading-tight">{activeIdea.title}</h1>
                                <div className="text-lg font-medium italic text-gray-600 dark:text-gray-300 leading-[1.8] mb-12 border-l-4 border-blue-500 pl-8 whitespace-pre-wrap">
                                    {activeIdea.snapshot.detailed_business_concept || activeIdea.snapshot.problem_statement}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-12 pt-12 border-t border-black/5">
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ideal Kund</span>
                                        <p className="font-bold italic uppercase text-sm tracking-tight">{activeIdea.snapshot.icp}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Modell</span>
                                        <p className="font-bold italic uppercase text-sm tracking-tight">{activeIdea.snapshot.pricing_hypothesis}</p>
                                    </div>
                                </div>

                                <div className="mt-20 flex flex-col gap-4">
                                    <button 
                                        onClick={async () => {
                                            const updated = { ...activeIdea, is_active_track: true, committed_at: new Date().toISOString() };
                                            await db.updateIdeaState(user.id, activeIdea.id, updated);
                                            setView('landing');
                                            alert("Konceptet är nu ert Aktiva UF-spår!");
                                        }} 
                                        className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Check size={20}/> Aktivera Strategiskt Spår
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setView('dialog')} className="py-5 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2">Gå tillbaka</button>
                                        <button onClick={() => setView('landing')} className="py-5 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Spara utkast</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

const DossierSection = ({ title, icon, content, placeholder }: any) => (
    <div className="space-y-2 group">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
            {icon} {title}
        </div>
        <div className={`p-4 rounded-2xl border transition-all ${content ? 'bg-white dark:bg-gray-900 border-black/5 shadow-sm' : 'bg-transparent border-dashed border-gray-200 dark:border-gray-800'}`}>
            <p className={`text-xs leading-relaxed ${content ? 'text-gray-700 dark:text-gray-300 font-bold italic' : 'text-gray-400 italic'}`}>
                {content || placeholder}
            </p>
        </div>
    </div>
);

const ScoreBox = ({ label, value, color }: any) => (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-black/5 shadow-md">
        <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">{label}</span>
        <span className={`text-lg font-black italic ${color === 'green' ? 'text-green-500' : color === 'red' ? 'text-red-500' : 'text-orange-500'}`}>{value}</span>
    </div>
);

const ModeCard = ({ title, desc, icon, onClick, color }: any) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
    };
    return (
        <button onClick={onClick} className="p-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-left group">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform ${colors[color]}`}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-4 italic uppercase">{title}</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed italic">{desc}</p>
        </button>
    );
};

const ScoreRow = ({ label, value, status }: any) => (
    <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase text-gray-400 italic">{label}</span>
        <div className="flex items-center gap-3">
            <span className={`text-sm font-black uppercase italic ${status === 'good' ? 'text-green-500' : status === 'bad' ? 'text-red-500' : 'text-orange-500'}`}>{value}</span>
            <div className={`w-2 h-2 rounded-full ${status === 'good' ? 'bg-green-500' : status === 'bad' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
        </div>
    </div>
);

export default IdeaLab;
