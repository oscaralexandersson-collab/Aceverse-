
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowUp, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, 
    Trash2, ShieldCheck, Loader2, Zap, HelpCircle, Pencil, Check, X as XIcon,
    Users, Lock, User as UserIcon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, ChatSession } from '../../types';
import { db } from '../../services/db';
import { supabase } from '../../services/supabase';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

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
    initialPrompt?: string | null;
    onClearPrompt?: () => void;
}

const Advisor: React.FC<AdvisorProps> = ({ user, initialPrompt, onClearPrompt }) => {
    // Access global scope and members for name resolution
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
    const hasHandledPrompt = useRef(false);

    // Renaming state
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // 1. Load Sessions on scope change
    useEffect(() => { 
        loadSessions(); 
        setCurrentSessionId(null); 
    }, [user.id, activeWorkspace?.id, viewScope]);
    
    // 2. Load Messages on session change
    useEffect(() => { 
        if (currentSessionId) {
            loadMessages(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    // 3. Real-time Subscription for Syncing
    useEffect(() => {
        if (!currentSessionId) return;

        const channel = supabase
            .channel(`session-${currentSessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `session_id=eq.${currentSessionId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    // Check if we already have this message (to avoid duplicates from optimistic updates)
                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        // Determine if we need to scroll
                        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentSessionId]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    // --- HELPER: Identify Teammates ---
    const getSenderInfo = (msgUserId: string) => {
        if (msgUserId === user.id) return { name: 'Du', isMe: true };
        
        // Find in workspace members
        const member = members.find(m => m.user_id === msgUserId);
        if (member?.user) {
            return { 
                name: `${member.user.firstName} ${member.user.lastName?.[0] || ''}.`, 
                isMe: false,
                initial: member.user.firstName?.[0] || '?'
            };
        }
        return { name: 'Team', isMe: false, initial: 'T' };
    };

    // --- AUTO-START FROM PROMPT ---
    useEffect(() => {
        if (initialPrompt && !hasHandledPrompt.current) {
            hasHandledPrompt.current = true;
            handleAutoStartSession(initialPrompt);
            if (onClearPrompt) onClearPrompt();
        }
    }, [initialPrompt]);

    const handleAutoStartSession = async (promptText: string) => {
        setIsLoading(true);
        try {
            const visibility = viewScope === 'workspace' ? 'shared' : 'private';
            const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;

            const newS = await db.createChatSession(user.id, 'Planering: ' + promptText.substring(0, 20) + '...', 'Default', workspaceId, visibility);
            
            // Add initial user message (triggers Realtime for others)
            await db.addMessage(user.id, { role: 'user', text: promptText, session_id: newS.id });
            
            setSessions(prev => [newS, ...prev]);
            setCurrentSessionId(newS.id);
            generateSmartTitle(promptText, newS.id);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-pro-preview',
                config: { systemInstruction: UF_KNOWLEDGE_BASE, temperature: 0.5 },
                history: [{ role: 'user', parts: [{ text: promptText }] }]
            });

            const result = await chat.sendMessage({ message: promptText });
            const aiText = result.text || "Jag hjälper dig gärna planera. Vad är första steget?";
            
            // Add AI response (triggers Realtime)
            await db.addMessage(user.id, { role: 'ai', text: aiText, session_id: newS.id });
            
            // Re-fetch to ensure sync state is perfect
            loadMessages(newS.id);

        } catch (e) {
            console.error("Auto-start failed", e);
        } finally {
            setIsLoading(false);
            setTimeout(() => { hasHandledPrompt.current = false; }, 2000);
        }
    };

    const loadSessions = async () => {
        try {
            const data = await db.getUserData(user.id);
            const allSessions = (data.sessions || [])
                .filter(s => s.session_group !== 'System');

            const filtered = allSessions.filter(s => {
                if (viewScope === 'personal') {
                    return !s.workspace_id; 
                } else {
                    return s.workspace_id === activeWorkspace?.id;
                }
            });

            setSessions(filtered.sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0)));
            
        } catch (err) { console.error(err); }
    };

    const loadMessages = async (sid: string) => {
        try {
            // Optimistic load from big fetch, but for real-time accuracy we might want a specific fetch.
            // Using existing pattern for now, Realtime will catch new ones.
            const data = await db.getUserData(user.id);
            const msgs = data.chatHistory
                .filter(m => m.session_id === sid)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (msgs.length === 0) {
                setMessages([{
                    id: 'init-' + sid,
                    role: 'ai',
                    text: `Hej ${user.firstName}! Jag är redo att hjälpa dig ${viewScope === 'workspace' ? 'och teamet' : ''}. Vad funderar du på idag?`,
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
        
        const visibility = viewScope === 'workspace' ? 'shared' : 'private';
        const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
        const name = viewScope === 'workspace' ? 'Ny Team-Chatt' : 'Ny Privat Chatt';

        try {
            const newS = await db.createChatSession(user.id, name, 'Default', workspaceId, visibility);
            setSessions(prev => [newS, ...prev]);
            setCurrentSessionId(newS.id);
        } catch (err: any) { alert("Fel: " + err.message); } 
        finally { setIsCreatingSession(false); }
    };

    const startEditing = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditName(session.name);
    };

    const saveSessionName = async () => {
        if (!editingSessionId || !editName.trim()) {
            setEditingSessionId(null);
            return;
        }
        try {
            await db.updateChatSession(user.id, editingSessionId, editName.trim());
            setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, name: editName.trim() } : s));
        } catch (e) {
            console.error("Failed to rename", e);
        } finally {
            setEditingSessionId(null);
        }
    };

    const generateSmartTitle = async (firstUserMessage: string, sessionId: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Du är en expert på att sammanfatta konversationer. 
                Baserat på följande första meddelande från en elev, skapa en kort, relevant titel (max 4-5 ord) för chatten på svenska.
                Titeln ska vara beskrivande (t.ex. "Affärsplan hjälp" eller "Marknadsföringstips").
                Inga citattecken.
                
                Meddelande: "${firstUserMessage}"`,
            });
            
            const newTitle = response.text?.trim();
            if (newTitle) {
                await db.updateChatSession(user.id, sessionId, newTitle);
                setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, name: newTitle } : s));
            }
        } catch (e) {
            console.warn("Could not auto-generate title", e);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        let activeId = currentSessionId;
        let isNewSession = false;

        if (!activeId) {
            setIsLoading(true);
            try {
                const visibility = viewScope === 'workspace' ? 'shared' : 'private';
                const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
                const newS = await db.createChatSession(user.id, 'Ny konversation', 'Default', workspaceId, visibility);
                
                setSessions(prev => [newS, ...prev]);
                setCurrentSessionId(newS.id);
                activeId = newS.id;
                isNewSession = true;
            } catch (err) { setIsLoading(false); return; }
        } else {
            const hasUserHistory = messages.some(m => m.role === 'user' && m.session_id === activeId);
            if (!hasUserHistory) isNewSession = true;
        }

        const text = input;
        setInput('');
        setIsLoading(true);

        try {
            // Optimistic update - will be deduplicated by subscription
            const userMsg = await db.addMessage(user.id, { role: 'user', text, session_id: activeId! });
            setMessages(prev => [...prev, userMsg]);

            if (isNewSession) {
                generateSmartTitle(text, activeId!);
            }

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
            
            // Don't add AI message manually to state, let Realtime handle it (or handle duplicate logic)
            // But for snappiness we add it, Realtime useEffect deduplicates by ID.
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
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="font-serif-display text-xl font-bold uppercase italic tracking-tight mb-4">UF-läraren</h2>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${viewScope === 'workspace' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            {viewScope === 'workspace' ? `Team: ${activeWorkspace?.name}` : 'Din privata bok'}
                        </span>
                    </div>
                </div>

                <div className="p-4">
                    <button onClick={handleCreateSession} disabled={isCreatingSession} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {isCreatingSession ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Ny Chatt
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {sessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => { if(editingSessionId !== s.id) setCurrentSessionId(s.id); }} 
                            className={`p-4 rounded-[1.5rem] cursor-pointer transition-all border group flex flex-col gap-1 ${currentSessionId === s.id ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl' : 'border-transparent hover:bg-white/60 dark:hover:bg-gray-800/30'}`}
                        >
                            {editingSessionId === s.id ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveSessionName();
                                            if (e.key === 'Escape') setEditingSessionId(null);
                                        }}
                                        onBlur={saveSessionName}
                                        className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm outline-none focus:border-black dark:focus:border-white"
                                    />
                                    <button onClick={saveSessionName} className="text-green-500 hover:text-green-600 p-1"><Check size={14} /></button>
                                    <button onClick={() => setEditingSessionId(null)} className="text-gray-400 hover:text-gray-600 p-1"><XIcon size={14} /></button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center gap-2">
                                    <div className={`text-sm font-black truncate flex-1 ${currentSessionId === s.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{s.name}</div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                        <button onClick={(e) => startEditing(s, e)} className="text-gray-300 hover:text-black dark:hover:text-white p-1 transition-colors" title="Byt namn">
                                            <Pencil size={14}/>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(s); }} className="text-gray-300 hover:text-red-500 p-1 transition-colors" title="Radera">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center py-10 opacity-40 text-xs font-bold uppercase tracking-widest">
                            Inga chattar här än.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden">
                <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center px-6 gap-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-20">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white">
                        {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                    </button>
                    <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic">
                        <ShieldCheck size={14} className="text-green-500" /> {viewScope === 'workspace' ? 'Konferensrum (Delat)' : 'Privat Rum'}
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
                                    
                                    {/* Avatar */}
                                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-lg border-2 shrink-0 ${
                                        msg.role === 'ai' 
                                            ? 'bg-black text-white border-white/10 dark:bg-white dark:text-black' 
                                            : sender.isMe 
                                                ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                                                : 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                                    }`}>
                                        {msg.role === 'ai' ? <Zap size={22} fill="currentColor"/> : sender.isMe ? 'Du' : <span className="text-xs font-bold">{sender.initial}</span>}
                                    </div>

                                    <div className={`max-w-[85%] flex flex-col ${sender.isMe ? 'items-end' : 'items-start'}`}>
                                        {/* Name Label for Teammates */}
                                        {!sender.isMe && msg.role !== 'ai' && (
                                            <span className="text-[10px] font-bold text-gray-400 mb-1 ml-2">{sender.name}</span>
                                        )}

                                        {/* Message Bubble */}
                                        <div className={`p-8 rounded-[2rem] shadow-xl text-[15px] leading-[1.8] font-medium tracking-tight whitespace-pre-wrap ${
                                            msg.role === 'ai' 
                                                ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none italic' 
                                                : sender.isMe
                                                    ? 'bg-black text-white rounded-tr-none font-bold'
                                                    : 'bg-blue-50 dark:bg-blue-950/40 text-gray-900 dark:text-white rounded-tl-none border border-blue-100 dark:border-blue-900'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                        <div className="relative flex items-end gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] border-2 border-transparent focus-within:border-black/5 dark:focus-within:border-white/5 transition-all duration-300 shadow-inner group">
                            <textarea 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} 
                                placeholder={currentSessionId ? "Skriv ett meddelande..." : "Välj en chatt först..."}
                                disabled={!currentSessionId}
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-4 px-6 text-base font-bold italic text-gray-900 dark:text-white placeholder:text-gray-400 outline-none rounded-[2rem]" 
                                rows={1} 
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isLoading || !currentSessionId} 
                                className="h-14 w-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shrink-0 mb-1 mr-1"
                            >
                                <ArrowUp size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Advisor;
