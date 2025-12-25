
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
    Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, ChatSession } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { VoiceMode } from '../VoiceMode';
import DeleteConfirmModal from './DeleteConfirmModal';

// --- STRIKT GDPR-SÄKER SYSTEM PROMPT (Baserad på s. 1-18 i PDF) ---
export const UF_KNOWLEDGE_BASE = `
# 🔒 UF-läraren - GDPR-SÄKER SYSTEM PROMPT
## EUROPEISK DATASKYDDSFÖRORDNING (EU) 2016/679 - FULLSTÄNDIG COMPLIANCE

Du är "UF-läraren", en AI-assistent som behandlar personuppgifter enligt strikta principer:

### ⚖️ JURIDISK GRUND & COMPLIANCE
- Behandling baseras på Art. 6.1(e) GDPR - Myndighetsutövning/allmänt intresse (utbildningsändamål).
- Behandling är transparent, dokumenterad och följer dataminimering (Art. 5.1c).

### 🚫 ABSOLUTA FÖRBUD - BRYT ALDRIG DESSA REGLER (Art. 9)
SAMLA ALDRIG och FRÅGA ALDRIG OM:
- Ras, etniskt ursprung, Politiska åsikter, Religiös eller filosofisk övertygelse.
- Medlemskap i fackförening, Genetiska eller Biometriska uppgifter.
- Hälsouppgifter (FRÅGA ALDRIG "Hur mår du?"), Sexualliv eller sexuell läggning.
- FRÅGA ALDRIG "Var kommer du ifrån?" (kan avslöja etnicitet).

⚠️ OM ANVÄNDAREN FRIVILLIGT DELAR KÄNSLIG DATA (Art. 9):
1. Avbryt omedelbart konversationen med texten: "Jag kan tyvärr inte ta emot den typen av information".
2. Radera informationen från konversationen och logga INTE denna data.

### 💬 KOMMUNIKATIONSSTIL (VIKTIGT)
- FORMATERING: Använd snygga stycken och tydliga rubriker (skriv rubriker som # Rubrik eller ## Underrubrik).
- SIFFROR: Säg siffror i ord vid behov av tydlighet, men använd standardformatering i text.
- ❌ INGA HASHTAGS. Använd aldrig hashtags i dina svar.
- ❌ MINIMERA EMOJIS. Använd endast enstaka emoji vid hälsning eller avslut om det förstärker den vänliga tonen. Inga emojis i brödtexten.
- TYPOGRAFI: Skriv för att läsas i en professionell miljö. Var vänlig, men affärsmässig och pedagogisk.

### 🎓 ARTIKEL 22 - AUTOMATISERAT BESLUTSFATTANDE
- FÖRBJUDET: Automatisk betygsättning. Ge råd och rekommendationer.

### 📖 UF-KUNSKAP
- Riskkapital: Max 15 000 SEK totalt. Max 300 SEK per person. Inget lån.
- Moms: UF-företag är oftast inte momspliktiga (under 80k).
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
    const [advisorMode, setAdvisorMode] = useState<'uf' | 'standard'>('uf');

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadSessions(); }, [user.id]);
    useEffect(() => { if (currentSessionId) loadMessages(currentSessionId); else setMessages([]); }, [currentSessionId]);
    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    const loadSessions = async () => {
        const data = await db.getUserData(user.id);
        const sorted = [...data.sessions].sort((a,b) => b.lastMessageAt - a.lastMessageAt);
        setSessions(sorted);
        if (!currentSessionId && sorted.length > 0) setCurrentSessionId(sorted[0].id);
    };

    const loadMessages = async (sessionId: string) => {
        setIsHistoryLoading(true);
        try {
            const data = await db.getUserData(user.id);
            const chatMsgs = data.chatHistory.filter(m => m.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp);
            setMessages(chatMsgs);
        } catch (e) { console.error(e); } finally { setIsHistoryLoading(false); }
    };

    const handleCreateSession = async () => {
        const defaultName = `${t('dashboard.advisorContent.newConversation')} ${sessions.length + 1}`;
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

        const tempUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now(), sessionId: currentSessionId };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            await db.addMessage(user.id, { role: 'user', text: userText, sessionId: currentSessionId });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: advisorMode === 'uf' ? UF_KNOWLEDGE_BASE : "Du är en hjälpsam AI.", temperature: 0.7 },
                history: messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
            });

            const result = await chat.sendMessageStream({ message: userText });
            let fullResponse = '';
            const tempAiMsgId = 'ai-' + Date.now();
            setMessages(prev => [...prev, { id: tempAiMsgId, role: 'ai', text: '', timestamp: Date.now(), sessionId: currentSessionId }]);

            for await (const chunk of result) {
                if (chunk.text) {
                    fullResponse += chunk.text;
                    setMessages(prev => prev.map(m => m.id === tempAiMsgId ? { ...m, text: fullResponse } : m));
                }
            }
            await db.addMessage(user.id, { role: 'ai', text: fullResponse, sessionId: currentSessionId });
            loadSessions();
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    // --- SLEEK MESSAGE PARSER ---
    const formatResponse = (text: string) => {
        if (!text) return '';
        
        // Handle bold
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black dark:text-white">$1</strong>');
        
        // Handle headings (# H1, ## H2)
        html = html.replace(/^# (.*$)/gim, '<h2 class="font-serif-display text-2xl mb-4 mt-6 text-black dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">$1</h2>');
        html = html.replace(/^## (.*$)/gim, '<h3 class="font-serif-display text-xl mb-3 mt-5 text-black dark:text-white">$1</h3>');
        html = html.replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm uppercase tracking-widest mb-2 mt-4 text-gray-400">$1</h4>');

        // Handle lists
        html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 mb-2 flex items-start gap-3"><span class="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-2 shrink-0"></span><span>$1</span></li>');
        
        // Wrap paragraphs that are not headers or list items
        const lines = html.split('\n');
        const wrappedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '<div class="h-4"></div>';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return line;
            return `<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">${line}</p>`;
        });

        return wrappedLines.join('');
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 relative border-t border-gray-200 dark:border-gray-800 transition-colors">
            <DeleteConfirmModal isOpen={!!sessionToDelete} onClose={() => setSessionToDelete(null)} onConfirm={async () => { if(sessionToDelete) { await db.deleteChatSession(user.id, sessionToDelete.id); loadSessions(); setSessionToDelete(null); } }} itemName={sessionToDelete?.name || ''} />

            <div className={`bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-lg text-gray-900 dark:text-white">Chattar</h2>
                    <button onClick={handleCreateSession} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg"><Plus size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {sessions.map(session => (
                        <div key={session.id} onClick={() => setCurrentSessionId(session.id)} className={`p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}>
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{session.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 relative">
                <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500"><PanelLeftOpen size={18} /></button>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button onClick={() => setAdvisorMode('uf')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${advisorMode === 'uf' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500'}`}><ShieldCheck size={14} className="inline mr-1" /> UF-läraren</button>
                        <button onClick={() => setAdvisorMode('standard')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${advisorMode === 'standard' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500'}`}>Standard AI</button>
                    </div>
                    <button onClick={() => setIsVoiceModeOpen(true)} className="p-2 text-gray-500 hover:text-black dark:hover:text-white"><Phone size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-gray-50 dark:bg-transparent">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                            <ShieldCheck size={48} className="mb-4 text-gray-300" />
                            <h3 className="font-serif-display text-xl mb-2">Välkommen till UF-läraren</h3>
                            <p className="max-w-xs text-sm">Jag är här för att stötta ditt UF-projekt på ett säkert och pedagogiskt sätt.</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-gray-200'}`}>{msg.role === 'ai' ? <Sparkles size={18} /> : 'DU'}</div>
                            <div className={`px-6 py-5 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatResponse(msg.text) }} />
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-end gap-2">
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Ställ din fråga om ditt UF-företag..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm outline-none resize-none focus:bg-white dark:focus:bg-gray-900 transition-all" rows={1} />
                        <button type="submit" disabled={!input.trim() || isLoading} className="h-14 w-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-lg disabled:opacity-50 transition-all active:scale-95">{isLoading ? <Loader2 className="animate-spin" /> : <ArrowUp />}</button>
                    </form>
                </div>
            </div>

            <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} systemInstruction={advisorMode === 'uf' ? UF_KNOWLEDGE_BASE : "Du är en röstassistent."} voiceName="Kore" />
        </div>
    );
};

export default Advisor;
