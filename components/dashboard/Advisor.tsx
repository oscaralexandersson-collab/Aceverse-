import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowUp, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, 
    Trash2, Edit2, ShieldCheck, Loader2, Zap, Check, X as XIcon, ChevronDown
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, ChatSession } from '../../types';
import { db } from '../../services/db';
import { useLanguage } from '../../contexts/LanguageContext';
import DeleteConfirmModal from './DeleteConfirmModal';

export const UF_KNOWLEDGE_BASE = `
# 🔒 UF-läraren - PREMIUM RÅDGIVARE & KVALITETSGRANSKARE
Du är "UF-läraren", en AI-assistent för Ung Företagsamhet. 
Följ strikta kvalitetskrav: koncis, inga hashtags, minimalt med emojis.
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadSessions(); }, [user.id]);
    
    useEffect(() => { 
        if (currentSessionId) loadMessages(currentSessionId);
        else setMessages([]);
    }, [currentSessionId]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    const loadSessions = async () => {
        const data = await db.getUserData(user.id);
        const filtered = (data.sessions || []).filter(s => s.group !== 'System').sort((a,b) => b.lastMessageAt - a.lastMessageAt);
        setSessions(filtered);
        if (!currentSessionId && filtered.length > 0) setCurrentSessionId(filtered[0].id);
    };

    const loadMessages = async (sessionId: string) => {
        const data = await db.getUserData(user.id);
        const chatMsgs = data.chatHistory.filter(m => m.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp);
        setMessages(chatMsgs);
    };

    const handleCreateSession = async () => {
        const name = `Ny chatt ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        const newSession = await db.createChatSession(user.id, name);
        setSessions(prev => [newSession, ...prev]); 
        setCurrentSessionId(newSession.id);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        let activeId = currentSessionId;
        if (!activeId) {
            const newS = await db.createChatSession(user.id, input.substring(0, 20));
            setSessions(prev => [newS, ...prev]);
            setCurrentSessionId(newS.id);
            activeId = newS.id;
        }

        if (!input.trim() || isLoading) return;
        const text = input; setInput(''); setIsLoading(true);

        const userMsg = await db.addMessage(user.id, { role: 'user', text, sessionId: activeId });
        setMessages(prev => [...prev, userMsg]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-pro-preview',
                config: { systemInstruction: UF_KNOWLEDGE_BASE, temperature: 0.4 },
                history: messages.concat(userMsg).slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
            });

            const result = await chat.sendMessage({ message: text });
            const aiMsg = await db.addMessage(user.id, { role: 'ai', text: result.text || "Fel vid svar.", sessionId: activeId });
            setMessages(prev => [...prev, aiMsg]);
            await db.updateChatSession(user.id, activeId, { lastMessageAt: Date.now() });
        } catch (error) {
            console.error(error);
        } finally { setIsLoading(false); }
    };

    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;
        await db.deleteChatSession(user.id, sessionToDelete.id);
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
        if (currentSessionId === sessionToDelete.id) setCurrentSessionId(null);
        setSessionToDelete(null);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <DeleteConfirmModal isOpen={!!sessionToDelete} onClose={() => setSessionToDelete(null)} onConfirm={handleDeleteSession} itemName={sessionToDelete?.name || ''} />
            <div className={`bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="font-serif-display text-lg font-bold text-gray-900 dark:text-white">Mina Chattar</h2>
                    <button onClick={handleCreateSession} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 active:scale-95"><Plus size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-3 space-y-1.5 custom-scrollbar">
                    {sessions.map(s => (
                        <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`p-4 rounded-2xl cursor-pointer transition-all border ${currentSessionId === s.id ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md' : 'border-transparent hover:bg-white/60 dark:hover:bg-gray-900/60'}`}>
                            <div className="flex justify-between items-center gap-2">
                                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</div>
                                <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(s); }} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative">
                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-6 gap-4">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-black">{isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}</button>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black dark:text-white border border-gray-100 shadow-sm"><ShieldCheck size={14} className="text-green-500" /> UF-läraren</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slideUp`}>
                            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm border ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-white dark:bg-gray-800 border-gray-200 text-gray-400'}`}>{msg.role === 'ai' ? <ShieldCheck size={20} /> : 'Du'}</div>
                            <div className={`p-6 rounded-[1.5rem] shadow-sm text-sm ${msg.role === 'ai' ? 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200' : 'bg-black dark:bg-white text-white dark:text-black'}`}>{msg.text}</div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
                <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
                        <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] shadow-inner">
                            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Skriv ditt meddelande..." className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm text-gray-900 dark:text-white" rows={1} />
                            <button type="submit" disabled={!input.trim() || isLoading} className="h-11 w-11 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-lg active:scale-90">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Advisor;
