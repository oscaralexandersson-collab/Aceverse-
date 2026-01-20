
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2, Mic, ChevronDown, ShieldCheck, Zap, Loader2, ArrowUp, Brain } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage } from '../types';
import { db } from '../services/db';
import { UF_KNOWLEDGE_BASE } from './dashboard/Advisor';
import { VoiceMode } from './VoiceMode';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface GlobalChatbotProps {
    user: User;
}

const GlobalChatbot: React.FC<GlobalChatbotProps> = ({ user }) => {
    const { activeWorkspace, viewScope } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showPeek, setShowPeek] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isQualityPassing, setIsQualityPassing] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const [showMemories, setShowMemories] = useState(false); // UI toggle for memories
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => { if (!isOpen) setShowPeek(true); }, 3000);
        const hideTimer = setTimeout(() => { setShowPeek(false); }, 11000);
        return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }, [isOpen]);

    const connectToSession = async () => {
        try {
            const ufSession = await db.ensureSystemSession(user.id);
            if (ufSession) {
                setSessionId(ufSession.id);
                const data = await db.getUserData(user.id);
                const sessionMessages = data.chatHistory.filter(m => m.session_id === ufSession.id).sort((a, b) => a.timestamp - b.timestamp);
                
                if (sessionMessages.length > 0) setMessages(sessionMessages);
                else {
                    const greeting: ChatMessage = {
                        id: 'init',
                        role: 'ai',
                        text: `Hej ${user.firstName}! Jag är din UF-lärare och personliga assistent. Jag håller koll på allt ni gör i plattformen. Vad jobbar vi med idag?`,
                        timestamp: Date.now(),
                        session_id: ufSession.id,
                        user_id: user.id,
                        created_at: new Date().toISOString()
                    };
                    setMessages([greeting]);
                }
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { if (isOpen) { connectToSession(); setShowPeek(false); } }, [isOpen, user.id]);
    useEffect(() => { if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

    const formatResponse = (text: string) => {
        if (!text) return '';
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black dark:text-white">$1</strong>');
        html = html.replace(/^# (.*$)/gim, '<h3 class="font-serif-display text-lg mb-2 mt-4 text-black dark:text-white">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h4 class="font-bold text-sm mb-1 mt-3 text-black dark:text-white">$1</h4>');
        html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1 flex items-start gap-2"><span class="w-1 h-1 rounded-full bg-black dark:bg-white mt-2 shrink-0"></span><span>$1</span></li>');
        return html.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '<div class="h-2"></div>';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return line;
            return `<p class="mb-2 leading-relaxed">${line}</p>`;
        }).join('');
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        let currentSessId = sessionId;
        if (!currentSessId) {
             const session = await db.ensureSystemSession(user.id);
             currentSessId = session.id;
             setSessionId(currentSessId);
        }

        if (!input.trim() || !currentSessId) return;

        let currentInput = input;
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: currentInput, timestamp: Date.now(), session_id: currentSessId!, user_id: user.id, created_at: new Date().toISOString() }]);
        setIsTyping(true);

        try {
            await db.addMessage(user.id, { role: 'user', text: currentInput, session_id: currentSessId });
            
            // 1. FETCH MEMORIES (The Cortex)
            const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
            const recentMemories = await db.getRecentMemories(user.id, workspaceId);
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const enhancedSystemPrompt = `
                ${UF_KNOWLEDGE_BASE}

                DU HAR ÅTKOMST TILL ANVÄNDARENS AKTIVITETSHISTORIK ("ACE CORTEX"):
                Nedan följer en lista på vad användaren nyligen gjort i systemet. Använd detta för att vara proaktiv och kontextmedveten.
                Om de precis lade till en kontakt, referera till det. Om de precis sparade en pitch, fråga hur det kändes.
                
                --- MINNESBANK START ---
                ${recentMemories || "Inga nyliga aktiviteter registrerade."}
                --- MINNESBANK SLUT ---

                Var personlig, minns detaljer och agera som en integrerad del av deras team.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                config: { 
                    systemInstruction: enhancedSystemPrompt, 
                    temperature: 0.3,
                    thinkingConfig: { thinkingBudget: 4000 } // Reduced budget for speed, keeps focus
                },
                contents: messages.concat({ id: 'tmp', role: 'user', text: currentInput, timestamp: Date.now(), session_id: currentSessId!, user_id: user.id, created_at: new Date().toISOString() }).slice(-11).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }] 
                }))
            });

            setIsQualityPassing(true);
            await new Promise(r => setTimeout(r, 600));

            let fullText = response.text || "Jag har problem att svara just nu.";
            fullText = fullText.replace(/#\w+/g, (match) => match.substring(1));

            const finalAiMsg: ChatMessage = { id: 'ai-' + Date.now(), role: 'ai', text: fullText, timestamp: Date.now(), session_id: currentSessId!, user_id: user.id, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, finalAiMsg]);
            await db.addMessage(user.id, { role: 'ai', text: fullText, session_id: currentSessId });
            
        } catch (error) { 
            console.error(error); 
        } finally { 
            setIsTyping(false); 
            setIsQualityPassing(false);
        }
    };

    const MemoryPanel = () => {
        const [mems, setMems] = useState<any[]>([]);
        useEffect(() => {
            const load = async () => {
                const data = await db.getUserData(user.id);
                // Filter scope for memories
                const workspaceId = viewScope === 'workspace' ? activeWorkspace?.id : null;
                const filtered = (data.memories || []).filter(m => {
                    if (viewScope === 'personal') return !m.workspace_id;
                    return m.workspace_id === workspaceId;
                });
                setMems(filtered);
            };
            load();
        }, [isOpen, showMemories]); // Reload when opening panel

        const deleteMem = async (id: string) => {
            await db.deleteMemory(id);
            setMems(prev => prev.filter(m => m.id !== id));
        };

        return (
            <div className="absolute inset-0 bg-white dark:bg-gray-900 z-20 flex flex-col animate-fadeIn">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/50">
                    <h3 className="font-serif-display font-bold text-lg flex items-center gap-2">
                        <Brain size={18} className="text-purple-500" />
                        AI-Minne (Ace Cortex)
                    </h3>
                    <button onClick={() => setShowMemories(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <p className="text-xs text-gray-500 mb-4 px-2">Här ser du vad AI:n "minns" om ditt arbete. Du kan radera specifika minnen om du vill att den ska glömma.</p>
                    {mems.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Inget sparat i minnet än.</div>
                    ) : (
                        <div className="space-y-3">
                            {mems.map(m => (
                                <div key={m.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between gap-3 group">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 rounded ${m.importance > 7 ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>{m.source_type}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{m.content}</p>
                                    </div>
                                    <button onClick={() => deleteMem(m.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) {
        return (
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end">
                <div className={`mb-4 max-w-xs bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-all transform ${showPeek ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                    <button onClick={() => setShowPeek(false)} className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 text-gray-400"><X size={10}/></button>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Behöver ni hjälp med UF-arbetet? 🎓</p>
                </div>
                <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-black dark:bg-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-2 border-white/10">
                    <Sparkles size={28} className="text-white dark:text-black" />
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-8 right-8 z-[60] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col transition-all overflow-hidden ${isMinimized ? 'w-72 h-16 rounded-full' : 'w-[90vw] md:w-[420px] h-[650px] max-h-[85vh]'}`}>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 dark:border-gray-800" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-lg"><Zap size={20} className="text-white dark:text-black" /></div>
                    <div>
                        <h3 className="font-serif-display font-bold text-base text-gray-900 dark:text-white">UF-läraren</h3>
                        {!isMinimized && <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Premium Quality Pass</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setShowMemories(!showMemories); }} className={`p-2.5 rounded-full transition-colors ${showMemories ? 'bg-purple-100 dark:bg-purple-900 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`} title="Se AI-minne"><Brain size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsVoiceModeOpen(true); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full" title="Röstläge"><Mic size={20} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full"><Minimize2 size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full"><ChevronDown size={20} /></button>
                </div>
            </div>
            
            {/* Memory Panel Overlay */}
            {showMemories && !isMinimized && <MemoryPanel />}

            {!isMinimized && !showMemories && (
                <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-950/30">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 max-w-[95%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                    <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatResponse(msg.text) }} />
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-center gap-2 pl-2">
                                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center"><Loader2 size={12} className="text-white animate-spin" /></div>
                                <div className="text-[10px] text-gray-400 font-bold animate-pulse uppercase tracking-widest">
                                    {isQualityPassing ? 'Verifierar kvalitet...' : 'UF-läraren analyserar...'}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        <form onSubmit={handleSend} className="relative group">
                            <div className="relative flex items-end gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus-within:border-black/10 dark:focus-within:border-white/10 focus-within:bg-white dark:focus-within:bg-gray-900 rounded-[1.8rem] transition-all duration-300 shadow-inner">
                                <textarea 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)} 
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} 
                                    placeholder="Ställ din fråga..." 
                                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 font-medium leading-relaxed" 
                                    rows={1} 
                                />
                                <button 
                                    type="submit" 
                                    disabled={!input.trim() || isTyping} 
                                    className="h-11 w-11 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg disabled:opacity-20 disabled:scale-100 active:scale-95 shrink-0 mb-0.5 mr-0.5"
                                >
                                    {isTyping ? <Loader2 className="animate-spin" size={18} /> : <ArrowUp size={20} strokeWidth={2.5} />}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
            
            <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} systemInstruction={UF_KNOWLEDGE_BASE} voiceName="Kore" />
        </div>
    );
};

export default GlobalChatbot;
