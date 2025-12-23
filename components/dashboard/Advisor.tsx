
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
    GraduationCap,
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

interface AdvisorProps {
    user: User;
}

// --- KNOWLEDGE BASES & GDPR COMPLIANCE ---

export const UF_KNOWLEDGE_BASE = `
# 🔒 UF-COACHEN - GDPR-SÄKER SYSTEM PROMPT
## EUROPEISK DATASKYDDSFÖRORDNING (EU) 2016/679 - FULLSTÄNDIG COMPLIANCE

---

## 💬 KOMMUNIKATIONSREGLER (OPTIMERING: DYNAMIK & HASTIGHET)

**TEXTLÄGE:**
- **KORT & KÄRNFULLT:** Svara direkt på frågan. Max 2-3 meningar per stycke.
- **DIALOG-DRIVET:** Ställ alltid en motfråga för att driva samtalet framåt. Bli inte en föreläsare.
- **TON:** Coachande, snabb och energisk. Inte byråkratisk.
- **STRUKTUR:** Använd aldrig punktlistor om det inte är absolut nödvändigt. Skriv som en människa chattar.

**RÖSTLÄGE (Om aktivt):**
- Korta svar (max 20 sekunder).
- Inga emojis eller komplexa tabeller.
- Fråga aldrig om personuppgifter i röst.

---

## 🎓 UF-SPECIFIKA REGLER (KUNSKAPSBAS)

1. **Riskkapital:** Max 15 000 SEK totalt. Max 300 SEK per person.
2. **Lån:** UF-företag får INTE ta lån.
3. **Moms:** UF-företag är i regel inte momspliktiga (under 80k omsättning).
4. **Bank:** Separat konto krävs.
`;

const VOICE_SPECIFIC_INSTRUCTIONS = `
# RÖST-SPECIFIKA GDPR-REGLER
- Din röst raderas OMEDELBART efter transkribering.
✅ **KORTA SVAR:** Max 2 meningar.
`;

const STANDARD_AI_INSTRUCTION = `
You are a helpful, creative, and intelligent AI assistant. Keep responses concise.
`;

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
    
    // DELETE STATE
    const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

    // Modes: 'uf' or 'standard'
    const [advisorMode, setAdvisorMode] = useState<'uf' | 'standard'>('uf');
    
    // Grouping
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({'Allmänt': true, 'System': true});

    // Rename State
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSessions();
    }, [user.id]);

    useEffect(() => {
        if (currentSessionId) {
            loadMessages(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const loadSessions = async () => {
        const data = await db.getUserData(user.id);
        const sorted = [...data.sessions].sort((a,b) => b.lastMessageAt - a.lastMessageAt);
        setSessions(sorted);
        if (!currentSessionId && sorted.length > 0) {
            setCurrentSessionId(sorted[0].id);
        }
    };

    const loadMessages = async (sessionId: string) => {
        setIsHistoryLoading(true);
        try {
            const data = await db.getUserData(user.id);
            const chatMsgs = data.chatHistory
                .filter(m => m.sessionId === sessionId)
                .sort((a, b) => a.timestamp - b.timestamp);
            setMessages(chatMsgs);
        } catch (e) {
            console.error(e);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleCreateSession = async () => {
        const defaultName = `${t('dashboard.advisorContent.newConversation')} ${sessions.length + 1}`;
        const newSession = await db.createChatSession(user.id, defaultName);
        setSessions(prev => [newSession, ...prev]); 
        setCurrentSessionId(newSession.id);
        if(window.innerWidth < 768) setIsSidebarOpen(false); 
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        const id = sessionToDelete.id;
        
        // Optimistic UI update
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) setCurrentSessionId(null);
        setSessionToDelete(null);

        try {
            await db.deleteChatSession(user.id, id);
        } catch (e) {
            console.error(e);
            loadSessions(); // Revert on failure
        }
    };

    const handleEditStart = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditName(session.name);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSessionId && editName.trim()) {
            setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, name: editName } : s));
            await db.renameChatSession(user.id, editingSessionId, editName);
            setEditingSessionId(null);
        }
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({...prev, [group]: !prev[group]}));
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
            
            const rawHistory = messages.slice(-10);
            const history = [];
            let lastRole = '';
            
            for (const msg of rawHistory) {
                if (!msg.text || !msg.text.trim()) continue;
                const role = msg.role === 'user' ? 'user' : 'model';
                if (role === lastRole && history.length > 0) {
                    history[history.length - 1].parts[0].text += `\n\n${msg.text}`;
                } else {
                    history.push({ role, parts: [{ text: msg.text }] });
                }
                lastRole = role;
            }

            if (history.length > 0 && history[history.length - 1].role === 'user') {
                const last = history.pop();
                userText = `${last.parts[0].text}\n\n${userText}`;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let sysInst = advisorMode === 'uf' ? UF_KNOWLEDGE_BASE : STANDARD_AI_INSTRUCTION;
            
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: sysInst },
                history: history
            });

            const result = await chat.sendMessageStream({ message: userText });
            
            let fullResponse = '';
            const tempAiMsgId = 'ai-' + Date.now();
            setMessages(prev => [...prev, { id: tempAiMsgId, role: 'ai', text: '', timestamp: Date.now(), sessionId: currentSessionId }]);

            for await (const chunk of result) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponse += chunkText;
                    setMessages(prev => prev.map(m => m.id === tempAiMsgId ? { ...m, text: fullResponse } : m));
                }
            }

            if (!fullResponse.trim()) {
                fullResponse = "(Hoppsan! Något gick fel med svaret. Prova att fråga igen.)";
                setMessages(prev => prev.map(m => m.id === tempAiMsgId ? { ...m, text: fullResponse } : m));
            }

            await db.addMessage(user.id, { role: 'ai', text: fullResponse, sessionId: currentSessionId });
            await db.updateChatSession(user.id, currentSessionId, { 
                lastMessageAt: Date.now(),
                preview: fullResponse.substring(0, 30) + "..." 
            });
            
            loadSessions(); 
            
        } catch (error) {
            console.error("Advisor Error:", error);
            setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: 'ai', text: "Anslutningsfel. Kontrollera din internetuppkoppling.", timestamp: Date.now(), sessionId: currentSessionId }]);
        } finally {
            setIsLoading(false);
        }
    };

    const groupedSessions: Record<string, ChatSession[]> = {};
    sessions.forEach(s => {
        const g = s.group || 'Allmänt';
        if (!groupedSessions[g]) groupedSessions[g] = [];
        groupedSessions[g].push(s);
    });

    const currentSessionName = sessions.find(s => s.id === currentSessionId)?.name || 'Chatt';

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 relative animate-fadeIn border-t border-gray-200 dark:border-gray-800 transition-colors">
            
            <DeleteConfirmModal 
                isOpen={!!sessionToDelete}
                onClose={() => setSessionToDelete(null)}
                onConfirm={confirmDelete}
                itemName={sessionToDelete?.name || ''}
            />

            {/* Sidebar */}
            <div className={`bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="font-serif-display text-lg text-gray-900 dark:text-white">Mina Chattar</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-800"><PanelLeftClose size={16} /></button>
                    </div>
                    <button onClick={handleCreateSession} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-colors shadow-sm"><Plus size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-6 pb-20">
                    {Object.entries(groupedSessions).map(([group, groupSessions]) => (
                        <div key={group}>
                            <button onClick={() => toggleGroup(group)} className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 hover:text-black dark:hover:text-white w-full">
                                {expandedGroups[group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {group}
                            </button>
                            
                            {expandedGroups[group] && (
                                <div className="space-y-1">
                                    {groupSessions.map(session => (
                                        <div key={session.id} onClick={() => setCurrentSessionId(session.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700' : 'hover:bg-gray-200/50 dark:hover:bg-gray-900 border border-transparent'}`}>
                                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${currentSessionId === session.id ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                                    <MessageSquare size={14} />
                                                </div>
                                                {editingSessionId === session.id ? (
                                                    <form onSubmit={handleEditSave} className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-black dark:border-white rounded px-2 py-1 text-sm font-medium focus:outline-none text-black dark:text-white" autoFocus onBlur={() => setEditingSessionId(null)} />
                                                    </form>
                                                ) : (
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{session.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.preview || 'Historik...'}</div>
                                                    </div>
                                                )}
                                            </div>
                                            {currentSessionId === session.id && !editingSessionId && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleEditStart(session, e)} className="p-1 hover:text-blue-600 dark:hover:text-blue-400"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(session); }} className="p-1 hover:text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 relative">
                {currentSessionId ? (
                    <>
                        <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mr-2">
                                    {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                                </button>
                                <div className="hidden md:block">
                                    <h3 className="font-serif-display text-lg text-gray-900 dark:text-white">{currentSessionName}</h3>
                                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span><span className="text-xs text-gray-500 dark:text-gray-400">Online</span></div>
                                </div>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg ml-4">
                                    <button onClick={() => setAdvisorMode('uf')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${advisorMode === 'uf' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                        <ShieldCheck size={14} className="text-green-600" /> <span className="hidden sm:inline">UF-läraren</span>
                                    </button>
                                    <button onClick={() => setAdvisorMode('standard')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${advisorMode === 'standard' ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                        <Bot size={14} /> <span className="hidden sm:inline">Standard AI</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsVoiceModeOpen(true)} className="p-2 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                    <Phone size={18} />
                                    <span className="text-sm font-medium hidden md:inline">Ring upp</span>
                                </button>
                                <button className="p-2 text-gray-500 hover:text-black rounded-lg transition-colors"><MoreHorizontal size={20} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-gray-50 dark:bg-transparent">
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                                    <Loader2 className="animate-spin" size={32} />
                                    <p className="text-sm font-medium">Hämtar historik...</p>
                                </div>
                            ) : (
                                <>
                                    {messages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                                <ShieldCheck size={32} className="text-gray-400" />
                                            </div>
                                            <h3 className="text-xl font-serif-display mb-2 text-gray-900 dark:text-white">Starta konversationen</h3>
                                            <p className="max-w-md text-gray-600 dark:text-gray-400">Jag minns vad vi pratat om tidigare. Hur går det med företaget idag?</p>
                                        </div>
                                    )}
                                    
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-[slideUp_0.3s_ease-out_forwards]`}>
                                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                {msg.role === 'ai' ? <Sparkles size={18} /> : <div className="font-bold text-xs">DU</div>}
                                            </div>
                                            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                                    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^- (.*)/gm, '• $1').replace(/\n/g, '<br />') }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-end gap-2">
                                <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus-within:ring-1 ring-black dark:ring-white transition-all">
                                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder={advisorMode === 'uf' ? "Fråga UF-läraren..." : "Fråga AI..."} className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[56px] py-4 px-4 text-sm text-gray-900 dark:text-white" rows={1} />
                                </div>
                                <button type="submit" disabled={!input.trim() || isLoading} className="h-14 w-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:opacity-80 transition-opacity shadow-lg disabled:opacity-50">
                                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : <ArrowUp size={24} />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-700">
                            <ShieldCheck size={40} className="text-gray-300" />
                        </div>
                        <h2 className="font-serif-display text-2xl mb-2 text-gray-900 dark:text-white">Välj en konversation</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Välj en tidigare chatt i menyn till vänster för att fortsätta.</p>
                        <button onClick={handleCreateSession} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-medium shadow-lg hover:scale-105 transition-transform">Starta ny chatt</button>
                    </div>
                )}
            </div>

            <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} systemInstruction={advisorMode === 'uf' ? UF_KNOWLEDGE_BASE + VOICE_SPECIFIC_INSTRUCTIONS : STANDARD_AI_INSTRUCTION} voiceName={advisorMode === 'uf' ? 'Kore' : 'Puck'} />
        </div>
    );
};

export default Advisor;
