
import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Trash2, Check, ArrowRight, Zap, Target, 
    CheckCircle2, Info, AlertTriangle, Calendar, 
    FileText, ShieldCheck, Flag, ArrowUpRight,
    TrendingUp, Users, Loader2, Search
} from 'lucide-react';
import { User, Idea, ChatMessage, UFScore } from '../../types';
import { db } from '../../services/db';
import { GoogleGenAI } from "@google/genai";
import DeleteConfirmModal from './DeleteConfirmModal';

const SYSTEM_PROMPT_V2 = `
# SYSTEMPROMPT – UF-Kompassen v2 (Aceverse)

## Din roll

Du är UF-Kompassen v2 i Aceverse – en UF-coach och beslutsmotor för gymnasieelever som driver UF-företag.

Ditt uppdrag är att hjälpa UF-företag gå från:

> ”Vi har ingen aning”
> 
> 
> till
> 
> *”Nu vet vi exakt vad vi ska göra härnäst”*
> 

inom 5–10 minuter, på ett sätt som är:

- tryggt
- realistiskt
- beslutsdrivande
- anpassat till UF-året

Du är inte en brainstorming-partner.

Du är inte neutral.

Du är inte ett inspirationsverktyg.

Du är ett beslutssystem.

---

## Grundprincip (viktigast)

UF-elever behöver riktning, inte frihet.

Du ska därför:

- begränsa val
- strukturera dialog
- våga säga när något är riskabelt
- alltid leda till ett konkret nästa steg

En enkel idé som blir genomförd är alltid bättre än en “bra” idé som aldrig realiseras.

---

## Användarlägen (obligatoriska)

Användaren befinner sig alltid i exakt ett av följande lägen:

- Läge A: “Vi har ingen idé”
- Läge B: “Vi har en idé men den är oklar”
- Läge C: “Vi vill testa om vår idé funkar”

Du ska:

- anpassa frågor, ton och output efter valt läge
- aldrig blanda lägen
- aldrig ställa fler än nödvändiga frågor

---

## Dialogregler

- Ställ korta, konkreta frågor
- Max 5 frågor per flöde
- En fråga åt gången
- Använd vardagligt språk
- Undvik företagstermer

Du får inte:

- ställa öppna brainstormingfrågor
- fråga “vad vill ni göra?”
- be om långa fritextsvar

---

## Outputkrav (obligatoriskt i alla lägen)

Efter varje flöde ska du alltid leverera:

1. Affärsidé (2–3 meningar, konkret)
2. Tydlig målgrupp
3. Ett nästa konkret steg
    
    (exempel: “Prata med 5 personer i målgruppen inom 7 dagar”)
    

Om detta saknas är svaret ofullständigt.

---

## UF-restriktioner (måste alltid tillämpas)

Du får inte föreslå eller godkänna idéer som:

- kräver tillstånd, certifiering eller juridisk expertis
- kräver stort startkapital
- kräver avancerad teknik eller lång produktutveckling
- inte kan genomföras inom ett UF-år
- är starkt beroende av externa parter

Om en sådan risk finns ska den alltid flaggas tydligt.

---

## UF-score & realismprofil (obligatorisk)

Efter varje idé eller större justering ska du alltid generera en UF-score i exakt detta format:

- Genomförbarhet inom UF-året: X / 10
- UF-risk: Låg / Medel / Hög
- Tidsrealism: Grön / Gul / Röd
- Kopieringsrisk: Låg / Medel / Hög
- Komplexitetsnivå: Enkel / Medel / Avancerad

För varje risk ska du:

- förklara varför
- koppla det till ett typiskt UF-problem

Du ska alltid avsluta med raden:

> Vanligaste anledningen till att liknande UF-idéer misslyckas:
> 
> 
> (konkret, UF-specifik, ärlig)
> 

---

## Beslutsögonblick & commitment (obligatoriskt)

Efter att output och UF-score presenterats ska du stanna upp dialogen och kräva ett beslut.

Du ska alltid presentera exakt tre val:

1. Vi committar till denna idé
    
    → markera idén som Aktivt UF-spår
    
2. Vi vill justera innan vi bestämmer oss
    
    → tillåt endast kontrollerade justeringar (målgrupp / erbjudande)
    
3. Vi vill byta spår
    
    → återgå till UF-Kompassen med tidigare lärdomar sparade
    

Du får inte:

- fortsätta utveckla utan beslut
- presentera fler alternativ
- hoppa över beslutsögonblicket

---

## Aktivt UF-spår (state)

När användaren committar ska du:

- tydligt säga att idén nu är deras Aktiva UF-spår
- sammanfatta beslutet i klartext
- ange:
    - startdatum
    - testperiod
    - nästa steg

Alla framtida svar ska relatera till detta UF-spår tills användaren aktivt byter.

---

## Fail-safe vid hög risk (obligatoriskt)

Om en idé bedöms som hög risk för UF ska du:

- aldrig säga att idén är “dålig”
- byta till ett särskilt risk-flöde
- alltid erbjuda exakt tre räddningsvägar:
1. Förenkla idén
2. Byta målgrupp
3. Välja nytt affärsspår (baserat på tidigare svar)

Du får aldrig lämna användaren utan väg framåt.

---

## Tidsdimension – UF-året som karta

Du ska alltid resonera utifrån UF-året:

- uppstart
- test & validering
- försäljning
- avslut

Alla rekommendationer ska:

- kopplas till var i UF-året användaren är
- leda till ett tidsatt nästa steg

Exempel:

> “Eftersom ni är tidigt i UF-året bör ni göra detta inom 7 dagar.”
> 

---

## Absoluta förbud

Du får aldrig:

- ge fler än 3 alternativ
- öppna fri brainstorming
- använda akademiskt språk
- använda företagstermer utan förklaring
- avsluta utan nästa steg
- säga “det beror på” utan att ge riktning

---

## Slutmål

Efter varje interaktion ska användaren känna:

> “Det här känns tryggt.
> 
> 
> Nu vet vi exakt vad vi ska göra.”
> 

Om detta inte uppnås har du misslyckats med ditt uppdrag.

---

### TEKNISKT FORMAT (OBLIGATORISKT)
Du ska ALLTID svara i JSON-format enligt detta schema för att systemet ska kunna läsa ditt svar:
{
  "response": "Ditt svar till eleven (coachande meddelande)",
  "is_complete": boolean (true om vi nått beslutsögonblicket eller sammanfattning),
  "snapshot_patch": {
    "title": "Namn på idén",
    "problem_statement": "Affärsidé (2-3 meningar)",
    "icp": "Tydlig målgrupp",
    "next_step": "Nästa konkreta steg",
    "uf_score": {
      "feasibility": 1-10,
      "risk": "Låg/Medel/Hög",
      "time_realism": "Grön/Gul/Röd",
      "copy_risk": "Låg/Medel/Hög",
      "complexity": "Enkel/Medel/Avancerad",
      "warning_point": "Vanligaste anledningen till att liknande UF-idéer misslyckas: ...",
      "motivation": "Motivering varför den passar UF"
    }
  }
}
`;

type LabView = 'landing' | 'dialog' | 'decision';
type LabMode = 'A' | 'B' | 'C' | null;

const IdeaLab: React.FC<{ user: User }> = ({ user }) => {
    const [view, setView] = useState<LabView>('landing');
    const [mode, setMode] = useState<LabMode>(null);
    const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadIdeas(); }, [user.id]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    const loadIdeas = async () => {
        const data = await db.getUserData(user.id);
        setIdeas(data.ideas || []);
    };

    const startMode = async (selectedMode: LabMode) => {
        setMode(selectedMode);
        setView('dialog');
        const session = await db.createChatSession(user.id, `UF-Kompassen - Situation ${selectedMode}`);
        
        const initialIdea = await db.addIdea(user.id, {
            title: 'Nytt UF-koncept',
            chat_session_id: session.id,
            current_phase: selectedMode || 'A',
            snapshot: { problem_statement: '', icp: '', solution_hypothesis: '', uvp: '', one_pager: '', persona_summary: '', pricing_hypothesis: '', mvp_definition: '', open_questions: [], next_step: '' }
        });
        
        setActiveIdea(initialIdea);

        let introText = "";
        if (selectedMode === 'A') introText = "Okej, vi hittar något som passar er! Först: Vad är ni bäst på? (Praktiskt skapande, sälja, hjälpa andra, eller digitalt?)";
        else if (selectedMode === 'B') introText = "Spännande! Berätta lite kort om vad ni funderar på att sälja så gör vi det konkret.";
        else introText = "Bra val. Vad är affärsidén vi ska testa idag?";

        setMessages([{
            id: 'init', role: 'ai', text: introText, timestamp: Date.now(), session_id: session.id, user_id: user.id, created_at: new Date().toISOString()
        }]);
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
            const promptContext = `LÄGE: ${mode}. AKTUELL UF-DATA: ${JSON.stringify(activeIdea.snapshot)}. HISTORIK: ${messages.slice(-4).map(m => m.text).join(' | ')}. ELEVENS SVAR: ${input}`;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: SYSTEM_PROMPT_V2, responseMimeType: 'application/json' },
                contents: promptContext
            });
            
            const data = JSON.parse(result.text || '{}');
            const aiMsg = await db.addMessage(user.id, { role: 'ai', text: data.response, session_id: activeIdea.chat_session_id! });
            setMessages(prev => [...prev, aiMsg]);

            if (data.snapshot_patch) {
                const updatedIdea = { ...activeIdea, title: data.snapshot_patch.title || activeIdea.title, snapshot: { ...activeIdea.snapshot, ...data.snapshot_patch } };
                setActiveIdea(updatedIdea);
                await db.updateIdeaState(user.id, activeIdea.id, updatedIdea);
                
                if (data.is_complete) {
                    setTimeout(() => setView('decision'), 2000);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsThinking(false);
        }
    };

    const handleDecision = async (decision: 'commit' | 'adjust' | 'change') => {
        if (!activeIdea) return;
        
        if (decision === 'commit') {
            const updated = { ...activeIdea, is_active_track: true, committed_at: new Date().toISOString() };
            await db.updateIdeaState(user.id, activeIdea.id, updated);
            setView('landing');
            alert("Idén är nu ert Aktiva UF-spår! Ni hittar den på landningssidan.");
        } else if (decision === 'adjust') {
            setView('dialog');
            setMessages(prev => [...prev, { id: 'adj', role: 'ai', text: "Okej, vad vill ni justera innan vi tar beslutet? Är det målgruppen eller själva produkten?", timestamp: Date.now(), session_id: activeIdea.chat_session_id!, user_id: user.id, created_at: '' }]);
        } else {
            setView('landing');
            setMode(null);
            setActiveIdea(null);
            setMessages([]);
        }
    };

    if (view === 'landing') {
        return (
            <div className="p-8 md:p-16 max-w-7xl mx-auto animate-fadeIn pb-40">
                <DeleteConfirmModal isOpen={!!ideaToDelete} onClose={() => setIdeaToDelete(null)} onConfirm={async () => {
                    await db.deleteIdea(user.id, ideaToDelete!.id);
                    loadIdeas();
                    setIdeaToDelete(null);
                }} itemName={ideaToDelete?.title || ''} />

                <div className="mb-24">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[1em] mb-6 block italic">Välkommen till UF-Kompassen</span>
                    <h1 className="font-serif-display text-7xl md:text-8xl text-gray-950 dark:text-white italic tracking-tighter mb-4 leading-none">Välj er väg.</h1>
                    <p className="text-xl text-gray-500 max-w-2xl font-medium">Vi hoppar över gissningarna och går rakt på vad som faktiskt fungerar för ett UF-år.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-10 mb-32">
                    <ModeCard 
                        title="A. Vi har ingen idé" 
                        desc="Vi utgår från era styrkor och hittar 3 rimliga vägar som fungerar för UF." 
                        icon={<Target size={40} />} 
                        onClick={() => startMode('A')}
                        color="blue"
                    />
                    <ModeCard 
                        title="B. Vi har en vag idé" 
                        desc="Vi gör idén konkret och ser till att den inte blir för bred eller komplicerad." 
                        icon={<Zap size={40} />} 
                        onClick={() => startMode('B')}
                        color="purple"
                    />
                    <ModeCard 
                        title="C. Vi vill testa om vår idé funkar" 
                        desc="Vi bygger en snabb verklighetscheck för att se om kunder faktiskt vill betala." 
                        icon={<CheckCircle2 size={40} />} 
                        onClick={() => startMode('C')}
                        color="green"
                    />
                </div>

                {ideas.length > 0 && (
                    <div className="space-y-12">
                        <div className="flex items-center gap-6">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.6em] italic">Arkiverade Koncept</h2>
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {ideas.map(i => (
                                <div key={i.id} className={`p-10 rounded-[3rem] border transition-all cursor-pointer group relative flex flex-col justify-between h-80 ${i.is_active_track ? 'bg-black text-white border-black shadow-3xl' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-1'}`} onClick={() => { setActiveIdea(i); setView('decision'); }}>
                                    <div>
                                        <div className="flex justify-between items-start mb-8">
                                            {i.is_active_track ? <span className="px-4 py-1 bg-white text-black text-[9px] font-black uppercase rounded-full tracking-widest italic flex items-center gap-2"><Check size={12}/> Aktivt Spår</span> : <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400"><FileText size={20}/></div>}
                                            <button onClick={(e) => { e.stopPropagation(); setIdeaToDelete(i); }} className="text-gray-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                        <h3 className="text-2xl font-bold italic uppercase mb-3 truncate leading-none">{i.title}</h3>
                                        <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${i.is_active_track ? 'text-white/50' : 'text-gray-400'}`}>{i.snapshot.problem_statement || 'Ingen beskrivning sparad.'}</p>
                                    </div>
                                    <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase opacity-40 italic">
                                        <div className="flex items-center gap-2"><Calendar size={12}/> {new Date(i.created_at).toLocaleDateString()}</div>
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'dialog') {
        return (
            <div className="h-[calc(100vh-64px)] flex flex-col bg-white dark:bg-black transition-colors overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-12 pb-32">
                        {messages.map(m => (
                            <div key={m.id} className={`flex gap-8 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[12px] shadow-2xl shrink-0 border-2 ${m.role === 'ai' ? 'bg-black text-white border-white/10 dark:bg-white dark:text-black' : 'bg-white text-gray-300 border-gray-100'}`}>
                                    {m.role === 'ai' ? <Zap size={26} fill="currentColor" /> : 'ELEV'}
                                </div>
                                <div className={`max-w-[85%] px-10 py-7 rounded-[2.5rem] text-[17px] leading-[1.8] font-medium italic ${m.role === 'user' ? 'bg-black text-white rounded-tr-none font-bold' : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-none border border-black/5 shadow-sm'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex gap-8 animate-pulse">
                                <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white flex items-center justify-center shadow-2xl"><Zap size={26} className="text-white dark:text-black" /></div>
                                <div className="px-10 py-7 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] rounded-tl-none border border-black/5 flex items-center gap-4">
                                    <Loader2 size={16} className="animate-spin text-gray-400" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-400">UF-coachen beräknar...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>
                <div className="p-10 border-t border-gray-50 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto relative group">
                        <input 
                            value={chatInput} 
                            onChange={e => setChatInput(e.target.value)} 
                            placeholder="Skriv ert svar här..." 
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-black dark:focus:border-white rounded-full px-12 py-7 text-xl font-bold italic outline-none transition-all shadow-inner dark:text-white" 
                        />
                        <button type="submit" disabled={!chatInput.trim() || isThinking} className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-2xl">
                            <ArrowRight size={28} strokeWidth={3} />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (view === 'decision' && activeIdea) {
        const score = activeIdea.snapshot.uf_score;
        const isHighRisk = score?.risk === 'Hög';

        return (
            <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-10 md:p-20 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto pb-40">
                    <div className="mb-20 text-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[1.2em] mb-8 block italic">Beslutsunderlag / v2.0</span>
                        <h2 className="font-serif-display text-6xl md:text-8xl italic uppercase tracking-tighter leading-[0.85] text-gray-950 dark:text-white mb-10">Dags att sätta ner foten.</h2>
                        <div className="flex justify-center items-center gap-4">
                            <div className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl"><ShieldCheck size={16}/> Verifierat UF-koncept</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-12 gap-12">
                        {/* LEFT: UF-Score Report */}
                        <div className="md:col-span-5 space-y-10">
                            <div className="bg-white dark:bg-gray-900 p-12 rounded-[4rem] shadow-2xl border border-black/5 dark:border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.04] rotate-12 group-hover:rotate-0 transition-all duration-1000"><Target size={200}/></div>
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] mb-16 italic border-b border-black/5 pb-6">UF-Realism-Check</h3>
                                
                                <div className="space-y-12">
                                    <ScoreRow label="Genomförbarhet" value={`${score?.feasibility}/10`} status={score?.feasibility && score.feasibility > 7 ? 'good' : 'bad'} />
                                    <ScoreRow label="UF-Risk" value={score?.risk || 'N/A'} status={score?.risk === 'Låg' ? 'good' : score?.risk === 'Medel' ? 'neutral' : 'bad'} />
                                    <ScoreRow label="Tidsrealism" value={score?.time_realism || 'N/A'} status={score?.time_realism === 'Grön' ? 'good' : 'bad'} />
                                    <ScoreRow label="Kopieringsrisk" value={score?.copy_risk || 'N/A'} status={score?.copy_risk === 'Låg' ? 'good' : 'bad'} />
                                    <ScoreRow label="Komplexitet" value={score?.complexity || 'N/A'} status={score?.complexity === 'Enkel' ? 'good' : 'neutral'} />
                                </div>

                                <div className="mt-20 p-10 bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 block mb-4 italic">Kritiskt konstaterande</span>
                                    <p className="text-base font-bold italic leading-relaxed">{score?.warning_point}</p>
                                </div>
                            </div>
                            
                            <div className="p-10 bg-blue-50 dark:bg-blue-900/20 rounded-[3rem] border border-blue-100 dark:border-blue-800 flex gap-6">
                                <Info className="text-blue-500 shrink-0" size={24} />
                                <p className="text-xs text-blue-800 dark:text-blue-300 font-bold italic leading-relaxed">Detta underlag är anpassat för ett UF-år. Vi rekommenderar att ni prioriterar enkelhet framför teknisk höjd.</p>
                            </div>
                        </div>

                        {/* RIGHT: Result Dossier */}
                        <div className="md:col-span-7 space-y-12">
                            <div className="bg-white dark:bg-gray-900 p-20 rounded-[5rem] shadow-3xl border border-black/5 relative group min-h-[600px] flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-5 mb-16">
                                        <div className="w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-xl"><Zap size={28}/></div>
                                        <h3 className="text-[13px] font-black uppercase tracking-[0.6em] italic text-gray-300">Koncept Dossier</h3>
                                    </div>
                                    <h1 className="text-6xl font-serif-display italic font-black uppercase tracking-tighter mb-10 leading-[0.85]">{activeIdea.title}</h1>
                                    <p className="text-2xl font-medium italic text-gray-600 dark:text-gray-300 leading-[1.6] tracking-tight mb-16 border-l-4 border-gray-100 pl-8">{activeIdea.snapshot.problem_statement}</p>
                                    
                                    <div className="grid grid-cols-2 gap-12 pt-16 border-t border-black/5 mb-16">
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Målgrupp</span>
                                            <p className="font-bold italic uppercase text-base tracking-tight">{activeIdea.snapshot.icp}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Nästa konkreta steg</span>
                                            <p className="font-bold italic uppercase text-base tracking-tight text-blue-600">{activeIdea.snapshot.next_step}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {isHighRisk && (
                                        <div className="p-8 bg-red-50 dark:bg-red-950/30 rounded-3xl border border-red-100 dark:border-red-900 flex items-center gap-6 mb-8 animate-pulse">
                                            <AlertTriangle className="text-red-500" size={32} />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2">Hög Risk Identifierad</p>
                                                <p className="text-sm font-bold text-red-700 dark:text-red-300 italic">Detta koncept kan bli svår att slutföra. Överväg att förenkla målgruppen.</p>
                                            </div>
                                        </div>
                                    )}
                                    <button onClick={() => handleDecision('commit')} className="w-full py-7 bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.5em] shadow-[0_40px_80px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                                        <Check size={24}/> VI COMMITTAR TILL DENNA IDÉ
                                    </button>
                                    <div className="grid grid-cols-2 gap-6">
                                        <button onClick={() => handleDecision('adjust')} className="py-6 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"><ArrowUpRight size={16}/> Justera</button>
                                        <button onClick={() => handleDecision('change')} className="py-6 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-all">Byt spår helt</button>
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

const ModeCard = ({ title, desc, icon, onClick, color }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void, color: string }) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
    };
    return (
        <button onClick={onClick} className="p-12 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[4rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-left group">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform ${colors[color]}`}>
                {icon}
            </div>
            <h3 className="text-3xl font-bold mb-6 italic uppercase leading-none">{title}</h3>
            <p className="text-gray-500 font-medium leading-relaxed italic">{desc}</p>
        </button>
    );
};

const ScoreRow = ({ label, value, status }: { label: string, value: string, status: 'good' | 'neutral' | 'bad' }) => (
    <div className="flex justify-between items-center group/row">
        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 italic group-hover/row:text-black dark:group-hover/row:text-white transition-colors">{label}</span>
        <div className="flex items-center gap-4">
            <span className={`text-base font-black uppercase italic tracking-tight ${status === 'good' ? 'text-green-500' : status === 'bad' ? 'text-red-500' : 'text-orange-500'}`}>{value}</span>
            <div className={`w-3 h-3 rounded-full ${status === 'good' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : status === 'bad' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]'}`}></div>
        </div>
    </div>
);

export default IdeaLab;
