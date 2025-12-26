
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowUp,
    Plus,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Sparkles,
    MoreHorizontal,
    Trash2,
    Phone,
    Bot,
    Edit2,
    ShieldCheck,
    Loader2,
    CheckCircle2,
    Zap,
    Volume2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, ChatSession } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { VoiceMode } from '../VoiceMode';
import DeleteConfirmModal from './DeleteConfirmModal';

// --- STRIKT PREMIUM SYSTEM PROMPT MED QUALITY PASS INSTRUKTIONER ---
export const UF_KNOWLEDGE_BASE = `
# 🔒 UF-läraren - PREMIUM RÅDGIVARE & KVALITETSGRANSKARE
## EUROPEISK DATASKYDDSFÖRORDNING (EU) 2016/679 - FULLSTÄNDIG COMPLIANCE

Du är "UF-läraren", en AI-assistent av absolut högsta klass för Ung Företagsamhet.

### 🛡️ QUALITY PASS PROTOKOLL (MÅSTE FÖLJAS FÖR VARJE SVAR)
Innan du levererar ett svar, utför en intern kvalitetsgranskning:
1. **KLARHET & KONCISENESS**: Ta bort allt onödigt "AI-fluff" och artighetsfraser. Gå direkt på kärnan.
2. **INGA HASHTAGS**: Använd aldrig symbolen '#' för sociala taggar eller markeringar.
3. **MINIMALA EMOJIS**: Använd endast enstaka emoji vid hälsning eller avslut om det förstärker den professionella tonen. Inga emojis i brödtext.
4. **TYPOGRAFISK STRUKTUR**: Använd Markdown-rubriker (## Rubrik) för att separera logiska delar. Skapa luft mellan stycken.
5. **TONALITET**: Du är en senior affärsrådgivare. Var inspirerande men håll en strikt affärsmässig och pedagogisk ton.

### ⚖️ JURIDISK GRUND & COMPLIANCE
- Behandling baseras på Art. 6.1(e) GDPR - Utbildningsändamål.
- SAMLA ALDRIG och FRÅGA ALDRIG OM: Hälsa, etnicitet eller politiska åsikter (Art. 9).
- OM ANVÄNDAREN DELAR KÄNSLIG DATA: Svara exakt: "Jag kan tyvärr inte ta emot den typen av information" och styr tillbaka till UF-rådgivning.

### 📖 UF-SPETS (KOM IHÅG DESSA REGLER)
- Riskkapital: Max 15 000 SEK totalt. Max 300 SEK per person. Inga lån tillåtna.
- Moms: UF-företag är oftast ej momspliktiga under 80 000 SEK/år.
`;

interface AdvisorProps {
    user: User;
}

const Advisor: React.FC<AdvisorProps> = ({ user }) => {
    const { t } = useLanguage();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [qualityPassActive, setQualityPassActive] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string>('Kore');

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadSessions(); }, [user.id]);
    useEffect(() => { if (currentSessionId) loadMessages(currentSessionId); else setMessages([]); }, [currentSessionId]);
    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading, qualityPassActive]);

    // --- SYNCHRONIZATION LOGIC ---
    useEffect(() => {
        const handleSync = (e: any) => {
            if (e.detail?.sessionId === currentSessionId) {
                loadMessages(currentSessionId);
            }
            loadSessions();
        };
        window.addEventListener('aceverse-chat-sync', handleSync);
        return () => window.removeEventListener('aceverse-chat-sync', handleSync);
    }, [currentSessionId]);

    const loadSessions = async () => {
        const data = await db.getUserData(user.id);
        const sorted = [...data.sessions].sort((a,b) => b.lastMessageAt - a.lastMessageAt);
        setSessions(sorted);
        if (!currentSessionId && sorted.length > 0) setCurrentSessionId(sorted[0].id);
    };

    const loadMessages = async (sessionId: string) => {
        try {
            const data = await db.getUserData(user.id);
            const chatMsgs = data.chatHistory.filter(m => m.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp);
            setMessages(chatMsgs);
        } catch (e) { console.error(e); }
    };

    const handleCreateSession = async () => {
        const defaultName = `Affärsrådgivning ${sessions.length + 1}`;
        const newSession = await db.createChatSession(user.id, defaultName);
        setSessions(prev => [newSession, ...prev]); 
        setCurrentSessionId(newSession.id);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentSessionId || isLoading) return;

        let userText = input;
        setInput('');
        setIsLoading(true);
        setQualityPassActive(false);

        const tempUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now(), sessionId: currentSessionId };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            await db.addMessage(user.id, { role: 'user', text: userText, sessionId: currentSessionId });
            
            // Dispatch sync event so the GlobalChatbot knows to reload
            window.dispatchEvent(new CustomEvent('aceverse-chat-sync', { detail: { sessionId: currentSessionId } }));

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                config: { 
                    systemInstruction: UF_KNOWLEDGE_BASE,
                    temperature: 0.2,
                    thinkingConfig: { thinkingBudget: 16000 }
                },
                contents: messages.concat(tempUserMsg).slice(-11).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }))
            });

            setQualityPassActive(true);
            await new Promise(r => setTimeout(r, 600));

            let finalResponse = response.text || "Jag kunde inte generera ett svar för tillfället.";
            finalResponse = finalResponse.replace(/#\w+/g, (match) => match.substring(1));

            const aiMsgId = 'ai-' + Date.now();
            setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: finalResponse, timestamp: Date.now(), sessionId: currentSessionId }]);
            await db.addMessage(user.id, { role: 'ai', text: finalResponse, sessionId: currentSessionId });
            
            // Dispatch sync event again for AI response
            window.dispatchEvent(new CustomEvent('aceverse-chat-sync', { detail: { sessionId: currentSessionId } }));
            
            loadSessions();
        } catch (error) { 
            console.error(error);
            setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: 'ai', text: "Ett fel uppstod. Kontrollera din internetanslutning.", timestamp: Date.now(), sessionId: currentSessionId }]);
        } finally { 
            setIsLoading(false);
            setQualityPassActive(false);
        }
    };

    const renderMessageContent = (text: string) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return <div key={idx} className="h-4" />;

            if (trimmedLine.startsWith('## ')) {
                return <h2 key={idx} className="font-serif-display text-2xl mb-4 mt-8 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">{trimmedLine.replace('## ', '')}</h2>;
            }
            if (trimmedLine.startsWith('### ')) {
                return <h3 key={idx} className="font-serif-display text-xl mb-3 mt-6 text-gray-900 dark:text-white">{trimmedLine.replace('### ', '')}</h3>;
            }
            
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                return (
                    <div key={idx} className="flex gap-3 mb-3 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-2 shrink-0 opacity-50" />
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-sans">
                            {trimmedLine.substring(2).split(/(\*\*.*?\*\*)/g).map((part, i) => 
                                part.startsWith('**') && part.endsWith('**') 
                                    ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong> 
                                    : part
                            )}
                        </p>
                    </div>
                );
            }

            return (
                <p key={idx} className="mb-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-sans text-justify">
                    {trimmedLine.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                        part.startsWith('**') && part.endsWith('**') 
                            ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong> 
                            : part
                    )}
                </p>
            );
        });
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 relative border-t border-gray-200 dark:border-gray-800 transition-colors">
            <DeleteConfirmModal isOpen={!!sessionToDelete} onClose={() => setSessionToDelete(null)} onConfirm={async () => { if(sessionToDelete) { await db.deleteChatSession(user.id, sessionToDelete.id); loadSessions(); setSessionToDelete(null); } }} itemName={sessionToDelete?.name || ''} />

            <div className={`bg-gray-50/50 dark:bg-black/50 backdrop-blur-sm border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Bibliotek</h2>
                    <button onClick={handleCreateSession} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-all shadow-sm active:scale-95"><Plus size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                    {sessions.map(session => (
                        <div key={session.id} onClick={() => setCurrentSessionId(session.id)} className={`group p-4 rounded-2xl cursor-pointer transition-all border ${currentSessionId === session.id ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg' : 'border-transparent hover:bg-white/60 dark:hover:bg-gray-900/60'}`}>
                            <div className="flex justify-between items-start gap-2">
                                <div className="text-sm font-bold text-gray-900 dark:text-white truncate flex-1">{session.name}</div>
                                <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(session); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-wider">{new Date(session.lastMessageAt).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 relative">
                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                            {isSidebarOpen ? <PanelLeftClose size={20} strokeWidth={1.5} /> : <PanelLeftOpen size={20} strokeWidth={1.5} />}
                        </button>
                        <div className="h-6 w-px bg-gray-100 dark:bg-gray-800" />
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black dark:text-white border border-gray-100 dark:border-gray-700">
                             <ShieldCheck size={14} className="text-green-500" /> UF-läraren
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700">
                            <select 
                                value={selectedVoice} 
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest outline-none px-2 py-1 text-gray-600 dark:text-gray-400 cursor-pointer"
                            >
                                <option value="Kore">Röst: Kore (Pro)</option>
                                <option value="Puck">Röst: Puck (Vänlig)</option>
                                <option value="Fenrir">Röst: Fenrir (Djupt)</option>
                            </select>
                        </div>
                        <button onClick={() => setIsVoiceModeOpen(true)} className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all active:scale-95">
                            <Phone size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 bg-gray-50/30 dark:bg-transparent">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-fadeIn">
                            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-gray-100 dark:border-gray-800">
                                <Sparkles size={32} className="text-gray-400" />
                            </div>
                            <h3 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">Hur kan jag hjälpa dig?</h3>
                            <p className="text-sm text-gray-500">Ställ en fråga om ditt UF-företag, affärsplanen eller marknadsföring.</p>
                        </div>
                    )}
                    
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-6 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-[slideUp_0.5s_ease-out]`}>
                            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm border ${msg.role === 'ai' ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                                {msg.role === 'ai' ? <ShieldCheck size={20} strokeWidth={2.5} /> : <div className="font-bold text-xs">DU</div>}
                            </div>
                            <div className={`flex flex-col gap-2 flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`w-full ${msg.role === 'user' ? 'max-w-md' : ''}`}>
                                    {msg.role === 'ai' ? (
                                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-[2rem] rounded-tl-none shadow-sm transition-all hover:shadow-md">
                                            {renderMessageContent(msg.text)}
                                        </div>
                                    ) : (
                                        <div className="bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-3xl rounded-tr-none shadow-lg text-sm font-medium leading-relaxed">
                                            {msg.text}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-6 max-w-4xl mx-auto animate-fadeIn">
                            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center shadow-lg"><Zap className="text-white animate-pulse" size={20} /></div>
                            <div className="flex flex-col gap-3 flex-1">
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-[2rem] rounded-tl-none shadow-sm w-full max-w-md">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Loader2 className="animate-spin text-gray-400" size={16} />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{qualityPassActive ? 'Genomför Quality Pass...' : 'UF-läraren analyserar...'}</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-full animate-pulse" />
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-[90%] animate-pulse" style={{ animationDelay: '0.2s' }} />
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-[60%] animate-pulse" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-3">
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus-within:border-black dark:focus-within:border-white focus-within:bg-white dark:focus-within:bg-gray-900 rounded-[2rem] p-2 transition-all shadow-inner">
                            <textarea 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} 
                                placeholder="Fråga något om ditt UF-företag..." 
                                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[44px] py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                                rows={1} 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading} 
                            className="h-14 w-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:opacity-80 transition-all shadow-xl disabled:opacity-30 active:scale-90"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <ArrowUp size={24} strokeWidth={2.5} />}
                        </button>
                    </form>
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Aceverse Intelligence • Gemini 3 Pro</p>
                        <div className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={10} className="text-green-500" />
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Quality Pass Aktiv</span>
                        </div>
                    </div>
                </div>
            </div>

            <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} systemInstruction={UF_KNOWLEDGE_BASE} voiceName={selectedVoice} />
        </div>
    );
};

export default Advisor;
