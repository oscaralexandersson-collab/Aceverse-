
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowUp, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, 
    Trash2, ShieldCheck, Loader2, Zap, HelpCircle, Pencil, Check, X as XIcon,
    Users, Lock, User as UserIcon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, ChatSession, UserData } from '../../types';
import { db } from '../../services/db';
import { supabase } from '../../services/supabase';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export const UF_KNOWLEDGE_BASE = `
# 🔒 SYSTEM PROMPT: UF-LÄRAREN (DEEP CONTEXT MODE)

## DIN ROLL
Du är den personliga AI-rådgivaren för ett UF-företag. Du har tillgång till realtidsdata från deras CRM, marknadsföring och idébank. 
Ditt uppdrag är att ge proaktiv, analytisk och extremt personlig feedback baserat på deras exakta situation.

## REGLER FOR DATA-ANVÄNDNING
1. **Referera till handlingar:** Om de precis vunnit en affär, gratulera dem. Om de har inlägg som utkast, hjälp dem publicera.
2. **Koppla till affärsmodell:** Använd deras valda bransch och affärstyp (B2B/B2C) för att ge relevanta tips.
3. **GDPR:** Lagra aldrig känsliga personuppgifter.

## PEDAGOGISK PROFIL
- Var professionell men engagerad.
- Ställ utmanande frågor för att få dem att tänka framåt.
- Om du ser en risk (t.ex. inga sälj på länge), flagga det konstruktivt.
`;

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
        <div className="space-y-1.5 text-gray-800 dark:text-gray-200">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-2" />;
                if (trimmed.startsWith('### ')) return <h4 key={i} className="font-serif-display text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">{parseBold(trimmed.slice(4))}</h4>;
                if (trimmed.startsWith('## ')) return <h3 key={i} className="font-serif-display text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{parseBold(trimmed.slice(3))}</h3>;
                if (trimmed.startsWith('# ')) return <h2 key={i} className="font-serif-display text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">{parseBold(trimmed.slice(2))}</h2>;
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return (<div key={i} className="flex items-start gap-3 pl-1 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-black/60 dark:bg-white/60 mt-2.5 shrink-0"></div><div className="leading-relaxed">{parseBold(trimmed.slice(2))}</div></div>);
                return <p key={i} className="leading-relaxed">{parseBold(line)}</p>;
            })}
        </div>
    );
};

interface AdvisorProps {
    user: User;
    initialPrompt?: string | null;
    onClearPrompt?: () => void;
}

const Advisor: React.FC<AdvisorProps> = ({ user, initialPrompt, onClearPrompt }) => {
    const { activeWorkspace, viewScope, members } = useWorkspace();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Rename state
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState('');

    useEffect(() => { loadSessions(); setCurrentSessionId(null); }, [user.id, activeWorkspace?.id, viewScope]);
    useEffect(() => { if (currentSessionId) loadMessages(currentSessionId); else setMessages([]); }, [currentSessionId]);
    
    useEffect(() => {
        if (!currentSessionId) return;
        const channel = supabase.channel(`session-${currentSessionId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${currentSessionId}` }, (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                return [...prev, newMsg];
            });
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentSessionId]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    const getSenderInfo = (msgUserId: string) => {
        if (msgUserId === user.id) return { name: 'Du', isMe: true };
        const member = members.find(m => m.user_id === msgUserId);
        if (member?.user) return { name: `${member.user.firstName} ${member.user.lastName?.[0] || ''}.`, isMe: false, initial: member.user.firstName?.[0] || '?' };
        return { name: 'Team', isMe: false, initial: 'T' };
    };

    const loadSessions = async () => {
        try {
            const data = await db.getUserData(user.id);
            const filtered = (data.sessions || []).filter(s => s.session_group !== 'System').filter(s => viewScope === 'personal' ? !s.workspace_id : s.workspace_id === activeWorkspace?.id);
            setSessions(filtered.sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0)));
        } catch (err) { console.error(err); }
    };

    const loadMessages = async (sid: string) => {
        try {
            const data = await db.getUserData(user.id);
            const msgs = data.chatHistory.filter(m => m.session_id === sid).sort((a, b) => a.timestamp - b.timestamp);
            if (msgs.length === 0) setMessages([{ id: 'init-' + sid, role: 'ai', text: `Hej! Jag är din UF-lärare. Jag ser att du jobbar med ${user.company || 'ditt företag'}. Hur kan jag hjälpa till?`, timestamp: Date.now(), session_id: sid, user_id: user.id, created_at: new Date().toISOString() }]);
            else setMessages(msgs);
        } catch (err) { console.error(err); }
    };

    const generateAIResponse = async (text: string, sessionId: string, history: ChatMessage[]) => {
        setIsLoading(true);
        try {
            const data: UserData = await db.getUserData(user.id);
            const contextData = {
                activeIdea: data.ideas.find(i => i.is_active_track),
                recentSales: data.salesEvents.slice(0, 5),
                activeDeals: data.deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST'),
                recentPosts: data.marketingCampaigns.slice(0, 3).map(c => ({ name: c.name, status: c.status, date: c.dateCreated })),
                events: data.ufEvents.filter(e => new Date(e.date_at) > new Date()).slice(0, 3)
            };

            const deepContext = `
                FÖRETAGSINFO: ${user.company}, Bransch: ${user.industry}, Typ: ${user.businessType}.
                AKTUELL PLATTFORMS-DATA:
                - Idé: ${JSON.stringify(contextData.activeIdea?.snapshot || 'Ingen aktiv idé')}
                - Senaste sälj: ${JSON.stringify(contextData.recentSales)}
                - Aktiva deals: ${JSON.stringify(contextData.activeDeals)}
                - Marknadsföring: ${JSON.stringify(contextData.recentPosts)}
                - Kommande events: ${JSON.stringify(contextData.events)}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-pro-preview',
                config: { systemInstruction: UF_KNOWLEDGE_BASE + "\n\nDEEP CONTEXT:\n" + deepContext, temperature: 0.3 },
                history: history.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
            });

            const result = await chat.sendMessage({ message: text });
            const aiText = result.text || "Jag kunde inte generera ett svar just nu.";
            const aiMsg = await db.addMessage(user.id, { role: 'ai', text: aiText, session_id: sessionId });
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        let activeId = currentSessionId;
        if (!activeId) {
            const visibility = viewScope === 'workspace' ? 'shared' : 'private';
            const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
            const newS = await db.createChatSession(user.id, 'Ny konversation', 'Default', workspaceId, visibility);
            setSessions(prev => [newS, ...prev]);
            setCurrentSessionId(newS.id);
            activeId = newS.id;
        }
        const text = input;
        setInput('');
        const userMsg = await db.addMessage(user.id, { role: 'user', text, session_id: activeId! });
        setMessages(prev => [...prev, userMsg]);
        await generateAIResponse(text, activeId!, messages);
    };

    const handleCreateSession = async () => {
        if (isCreatingSession) return;
        setIsCreatingSession(true);
        const visibility = viewScope === 'workspace' ? 'shared' : 'private';
        const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
        try {
            const newS = await db.createChatSession(user.id, 'Ny Chatt', 'Default', workspaceId, visibility);
            setSessions(prev => [newS, ...prev]);
            setCurrentSessionId(newS.id);
        } finally { setIsCreatingSession(false); }
    };

    const startEditing = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditNameValue(session.name);
    };

    const saveRename = async () => {
        if (!editingSessionId || !editNameValue.trim()) return;
        try {
            await db.updateChatSession(user.id, editingSessionId, editNameValue);
            setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, name: editNameValue } : s));
            setEditingSessionId(null);
        } catch (e) {
            console.error(e);
            alert("Kunde inte döpa om chatten.");
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
            <DeleteConfirmModal isOpen={!!sessionToDelete} onClose={() => setSessionToDelete(null)} onConfirm={async () => { await db.deleteChatSession(user.id, sessionToDelete!.id); setSessions(prev => prev.filter(s => s.id !== sessionToDelete!.id)); if (currentSessionId === sessionToDelete!.id) setCurrentSessionId(null); setSessionToDelete(null); }} itemName={sessionToDelete?.name || ''} />
            
            {/* Sidebar */}
            <div className={`bg-gray-50/50 dark:bg-black/40 border-r border-gray-200 dark:border-gray-800 transition-all duration-500 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden opacity-0'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="font-serif-display text-xl font-bold uppercase italic tracking-tight mb-4">UF-läraren</h2>
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${viewScope === 'workspace' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{viewScope === 'workspace' ? `Team: ${activeWorkspace?.name}` : 'Privat Rum'}</span>
                    </div>
                </div>
                <div className="p-4">
                    <button onClick={handleCreateSession} disabled={isCreatingSession} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {isCreatingSession ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Ny Chatt
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar">
                    {sessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => { if (editingSessionId !== s.id) setCurrentSessionId(s.id); }} 
                            className={`p-4 rounded-[1.5rem] cursor-pointer transition-all border group relative ${currentSessionId === s.id ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl' : 'border-transparent hover:bg-white/60 dark:hover:bg-gray-800/30'}`}
                        >
                            {editingSessionId === s.id ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        autoFocus
                                        value={editNameValue}
                                        onChange={(e) => setEditNameValue(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditingSessionId(null); }}
                                        className="bg-transparent border-b border-black dark:border-white text-sm font-black w-full outline-none py-0.5"
                                    />
                                    <button onClick={saveRename} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={14}/></button>
                                    <button onClick={() => setEditingSessionId(null)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><XIcon size={14}/></button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center gap-2">
                                    <div className={`text-sm font-black truncate flex-1 ${currentSessionId === s.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                        {s.name}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={(e) => startEditing(e, s)} className="text-gray-400 hover:text-blue-500 p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={12}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(s); }} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden">
                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-6 gap-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-20">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white">{isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}</button>
                    <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic">
                        <ShieldCheck size={14} className="text-green-500" /> Deep Context Mode Active
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar">
                    {!currentSessionId && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="font-black uppercase tracking-[0.4em]">Välj en chatt för att börja</p>
                        </div>
                    )}
                    <div className="max-w-4xl mx-auto space-y-10">
                        {messages.map((msg) => {
                            const sender = getSenderInfo(msg.user_id);
                            return (
                                <div key={msg.id} className={`flex gap-6 ${sender.isMe ? 'flex-row-reverse' : ''} animate-slideUp`}>
                                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-lg border-2 shrink-0 ${msg.role === 'ai' ? 'bg-black text-white border-white/10 dark:bg-white dark:text-black' : sender.isMe ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400' : 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'}`}>
                                        {msg.role === 'ai' ? <Zap size={22} fill="currentColor"/> : sender.isMe ? 'Du' : <span className="text-xs font-bold">{sender.initial}</span>}
                                    </div>
                                    <div className={`max-w-[85%] flex flex-col ${sender.isMe ? 'items-end' : 'items-start'}`}>
                                        {!sender.isMe && msg.role !== 'ai' && <span className="text-[10px] font-bold text-gray-400 mb-1 ml-2">{sender.name}</span>}
                                        <div className={`p-8 rounded-[2rem] shadow-xl text-[15px] font-medium tracking-tight ${msg.role === 'ai' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none' : sender.isMe ? 'bg-black text-white rounded-tr-none font-bold' : 'bg-blue-50 dark:bg-blue-950/40 text-gray-900 dark:text-white rounded-tl-none border border-blue-100 dark:border-blue-900'}`}>
                                            {msg.role === 'ai' ? <MarkdownRenderer text={msg.text} /> : msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div className="flex gap-6 animate-pulse">
                                <div className="w-12 h-12 rounded-[1.2rem] bg-black dark:bg-white flex items-center justify-center shadow-xl">
                                    <Zap size={22} className="text-white dark:text-black" />
                                </div>
                                <div className="p-8 rounded-[2rem] bg-gray-100 dark:bg-gray-800 w-full max-w-md border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-[0.4em] italic flex items-center gap-4">
                                    <Loader2 size={16} className="animate-spin" /> Analyserar kontext...
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </div>
                <div className="p-10 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                        <div className="relative flex items-end gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] border-2 border-transparent focus-within:border-black/5 dark:focus-within:border-white/5 transition-all duration-300 shadow-inner group">
                            <textarea 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} 
                                placeholder={currentSessionId ? "Ställ en fråga om ditt CRM, sälj eller inlägg..." : "Välj en chatt..."} 
                                disabled={!currentSessionId} 
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-4 px-6 text-base font-bold italic text-gray-900 dark:text-white placeholder:text-gray-400 outline-none rounded-[2rem]" 
                                rows={1} 
                            />
                            <button type="submit" disabled={!input.trim() || isLoading || !currentSessionId} className="h-14 w-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shrink-0 mb-1 mr-1">
                                <ArrowUp size={24} strokeWidth={3} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Advisor;
