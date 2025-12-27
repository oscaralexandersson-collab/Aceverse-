
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowUp, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, 
    Trash2, ShieldCheck, Loader2, Zap, HelpCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, ChatSession } from '../../types';
import { db } from '../../services/db';
import DeleteConfirmModal from './DeleteConfirmModal';

export const UF_KNOWLEDGE_BASE = `
# 🔒 UF-läraren - PREMIUM RÅDGIVARE & KVALITETSGRANSKARE
Du är "UF-läraren", en AI-assistent för Ung Företagsamhet. 
Din uppgift är att coacha unga entreprenörer genom deras UF-år.
Var professionell, uppmuntrande men realistisk.
Följ strikta kvalitetskrav: koncis, inga hashtags, minimalt med emojis.
Använd svenska i ditt svar.
`;

interface AdvisorProps {
    user: User;
}

const Advisor: React.FC<AdvisorProps> = ({ user }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadSessions(); }, [user.id]);
    
    useEffect(() => { 
        if (currentSessionId) loadMessages(currentSessionId);
        else setMessages([]);
    }, [currentSessionId]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    const loadSessions = async () => {
        try {
            const data = await db.getUserData(user.id);
            const chatSessions = (data.sessions || [])
                .filter(s => s.session_group !== 'System')
                .sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0));
            setSessions(chatSessions);
            if (!currentSessionId && chatSessions.length > 0) setCurrentSessionId(chatSessions[0].id);
        } catch (err) { console.error(err); }
    };

    const loadMessages = async (sid: string) => {
        try {
            const data = await db.getUserData(user.id);
            const msgs = data.chatHistory
                .filter(m => m.session_id === sid)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (msgs.length === 0) {
                setMessages([{
                    id: 'init-' + sid,
                    role: 'ai',
                    text: `Hej ${user.firstName}! Jag är redo att hjälpa dig med ditt UF-företag. Vad funderar du på idag?`,
                    timestamp: Date.now(),
                    session_id: sid,
                    user_id: user.id,
                    created_at: new Date().toISOString()
                }]);
            } else {
                setMessages(msgs);
            }
        } catch (err) { console.error(err); }
    };

    const handleCreateSession = async () => {
        if (isCreatingSession) return;
        setIsCreatingSession(true);
        const name = `Konversation ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
        try {
            const newS = await db.createChatSession(user.id, name, 'Default');
            setSessions(prev => [newS, ...prev]);
            setCurrentSessionId(newS.id);
        } catch (err: any) { alert("Fel: " + err.message); } 
        finally { setIsCreatingSession(false); }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        let activeId = currentSessionId;
        if (!activeId) {
            setIsLoading(true);
            try {
                const newS = await db.createChatSession(user.id, input.substring(0, 20) + "...", 'Default');
                setSessions(prev => [newS, ...prev]);
                setCurrentSessionId(newS.id);
                activeId = newS.id;
            } catch (err) { setIsLoading(false); return; }
        }

        const text = input;
        setInput('');
        setIsLoading(true);

        try {
            const userMsg = await db.addMessage(user.id, { role: 'user', text, session_id: activeId! });
            setMessages(prev => [...prev, userMsg]);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-pro-preview',
                config: { systemInstruction: UF_KNOWLEDGE_BASE, temperature: 0.5 },
                history: messages.concat(userMsg).slice(-10).map(m => ({ 
                    role: m.role === 'user' ? 'user' : 'model', 
                    parts: [{ text: m.text }] 
                }))
            });

            const result = await chat.sendMessage({ message: text });
            const aiMsg = await db.addMessage(user.id, { role: 'ai', text: result.text || "Inget svar.", session_id: activeId! });
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { id: 'err', role: 'ai', text: "Ett fel uppstod.", timestamp: Date.now(), session_id: activeId!, user_id: user.id, created_at: '' }]);
        } finally { setIsLoading(false); }
    };

    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;
        try {
            await db.deleteChatSession(user.id, sessionToDelete.id);
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
            if (currentSessionId === sessionToDelete.id) setCurrentSessionId(null);
        } catch (err) { console.error(err); } 
        finally { setSessionToDelete(null); }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
            <DeleteConfirmModal isOpen={!!sessionToDelete} onClose={() => setSessionToDelete(null)} onConfirm={handleDeleteSession} itemName={sessionToDelete?.name || ''} />

            <div className={`bg-gray-50/50 dark:bg-black/40 border-r border-gray-200 dark:border-gray-800 transition-all duration-500 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden opacity-0'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-xl font-bold uppercase italic tracking-tight">Mina Chattar</h2>
                    <button onClick={handleCreateSession} disabled={isCreatingSession} className="p-2.5 bg-black text-white rounded-2xl hover:opacity-80 active:scale-95 transition-all">
                        {isCreatingSession ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {sessions.map(s => (
                        <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`p-4 rounded-[1.5rem] cursor-pointer transition-all border group flex flex-col gap-1 ${currentSessionId === s.id ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl' : 'border-transparent hover:bg-white/60'}`}>
                            <div className="flex justify-between items-center gap-2">
                                <div className={`text-sm font-black truncate flex-1 ${currentSessionId === s.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{s.name}</div>
                                <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(s); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden">
                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-6 gap-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-20">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white">
                        {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                    </button>
                    <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic">
                        <ShieldCheck size={14} className="text-green-500" /> UF-läraren Online
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar">
                    {messages.length === 0 && !isLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="font-black uppercase tracking-[0.4em]">Välj en chatt för att börja</p>
                        </div>
                    )}
                    <div className="max-w-4xl mx-auto space-y-10">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-lg border-2 ${msg.role === 'ai' ? 'bg-black text-white border-white/10 dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}>
                                    {msg.role === 'ai' ? <Zap size={22} fill="currentColor"/> : 'Du'}
                                </div>
                                <div className={`p-8 rounded-[2rem] shadow-xl text-[15px] leading-[1.8] font-medium tracking-tight whitespace-pre-wrap max-w-[85%] ${msg.role === 'ai' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none italic' : 'bg-black text-white rounded-tr-none font-bold'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-6 animate-pulse">
                                <div className="w-12 h-12 rounded-[1.2rem] bg-black dark:bg-white flex items-center justify-center shadow-xl"><Zap size={22} className="text-white dark:text-black" /></div>
                                <div className="p-8 rounded-[2rem] bg-gray-100 dark:bg-gray-800 w-full max-w-md border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-[0.4em] italic flex items-center gap-4"><Loader2 size={16} className="animate-spin" /> UF-läraren tänker...</div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </div>

                <div className="p-10 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-4 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] border-2 border-transparent focus-within:border-black/5">
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Fråga om ditt UF-företag..." className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-4 px-6 text-base font-bold italic" rows={1} />
                        <button type="submit" disabled={!input.trim() || isLoading} className="h-14 w-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-90 transition-all disabled:opacity-20 shrink-0 mb-1 mr-1">
                            <ArrowUp size={24} strokeWidth={2.5} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Advisor;
