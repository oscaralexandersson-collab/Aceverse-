
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2, Mic, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage } from '../types';
import { db } from '../services/db';
import { UF_KNOWLEDGE_BASE } from './dashboard/Advisor';
import { VoiceMode } from './VoiceMode';

interface GlobalChatbotProps {
    user: User;
}

const GlobalChatbot: React.FC<GlobalChatbotProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showPeek, setShowPeek] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // --- Proactive Greeting Logic ---
    useEffect(() => {
        // Visa en liten hälsningsbubbla efter 3 sekunder om chatten inte är öppen
        const timer = setTimeout(() => {
            if (!isOpen) setShowPeek(true);
        }, 3000);
        
        // Göm den igen efter 8 sekunder
        const hideTimer = setTimeout(() => {
            setShowPeek(false);
        }, 11000);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, [isOpen]);

    // Context preparation
    const hasReport = !!(user.companyReport && typeof user.companyReport.fullMarkdown === 'string');
    
    const companyContext = hasReport
        ? `AKTUELLT FÖRETAGSDATA (ANVÄND DETTA):
           Namn: ${user.company}
           Bransch: ${user.companyReport?.meta?.website || 'Okänd'}
           Rapportöversikt: ${user.companyReport?.fullMarkdown?.substring(0, 500)}...
           Ekonomisk Sammanfattning: ${JSON.stringify(user.companyReport?.summary || {})}`
        : `FÖRETAG: ${user.company || 'Start-up fas'}. Användaren håller på att starta upp.`;

    const baseSystemInstruction = `
        ${UF_KNOWLEDGE_BASE}
        
        ANVÄNDARENS KONTEXT (Pseudonymiserad):
        Användar-ID: ${user.id}
        ${companyContext}

        INSTRUKTION:
        Du är en GDPR-säker UF-lärare. Var personlig, coachande och extremt snabb i dina svar.
    `;

    const voiceSystemInstruction = `
        ${baseSystemInstruction}
        # RÖST-SPECIFIKA GDPR-REGLER
        ✅ **KORTA SVAR:** Max 30 sekunder. Prata som en engagerad mentor.
    `;

    const connectToSession = async () => {
        try {
            const ufSession = await db.ensureSystemSession(user.id);
            if (ufSession) {
                setSessionId(ufSession.id);
                const data = await db.getUserData(user.id);
                const sessionMessages = data.chatHistory
                    .filter(m => m.sessionId === ufSession.id)
                    .sort((a, b) => a.timestamp - b.timestamp);
                
                if (sessionMessages.length > 0) {
                    setMessages(sessionMessages);
                } else {
                    const greeting: ChatMessage = {
                        id: 'init',
                        role: 'ai',
                        text: `Hej ${user.firstName}! 👋 Jag är din UF-lärare. Hur går det med ${user.company || 'affärsidén'}?`,
                        timestamp: Date.now(),
                        sessionId: ufSession.id
                    };
                    setMessages([greeting]);
                }
            }
        } catch (e) {
            console.error("Failed to connect to chat session:", e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            connectToSession();
            setShowPeek(false);
        }
    }, [isOpen, user.id]);

    useEffect(() => {
        if (messages.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

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
        const tempUserMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: tempUserMsgId, role: 'user', text: currentInput, timestamp: Date.now(), sessionId: currentSessId! }]);
        setInput('');
        setIsTyping(true);

        try {
            await db.addMessage(user.id, { role: 'user', text: currentInput, sessionId: currentSessId });
            db.updateChatSession(user.id, currentSessId, { lastMessageAt: Date.now(), preview: currentInput.substring(0, 50) + "..." });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const history = messages.slice(-10).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: baseSystemInstruction, temperature: 0.7 },
                history: history
            });

            const result = await chat.sendMessageStream({ message: currentInput });
            let fullText = '';
            const tempAiId = 'ai-' + Date.now();
            
            setMessages(prev => [...prev, { id: tempAiId, role: 'ai', text: '', timestamp: Date.now(), sessionId: currentSessId! }]);

            for await (const chunk of result) {
                const text = chunk.text;
                if (text) {
                    fullText += text;
                    setMessages(prev => prev.map(m => m.id === tempAiId ? { ...m, text: fullText } : m));
                }
            }

            await db.addMessage(user.id, { role: 'ai', text: fullText, sessionId: currentSessId });
        } catch (error) {
            console.error("Chat error:", error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {!isOpen ? (
                <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end">
                    {/* Peek Greeting Bubble */}
                    <div className={`mb-4 max-w-xs bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-500 transform ${showPeek ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                        <button onClick={() => setShowPeek(false)} className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-full p-1 text-gray-400 hover:text-black shadow-sm"><X size={10}/></button>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                           Behöver du hjälp med affärsplanen eller pitch-träning? Jag finns här! 👋
                        </p>
                    </div>

                    <button 
                        onClick={() => setIsOpen(true)}
                        className="group cursor-pointer relative"
                    >
                        <div className="absolute -inset-2 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative w-16 h-16 bg-black dark:bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12 overflow-hidden border-2 border-white/10 dark:border-black/5">
                            <Sparkles size={28} className="text-white dark:text-black relative z-10" strokeWidth={1.5} />
                            {/* Ambient Pulse */}
                            <div className="absolute inset-0 bg-white/10 dark:bg-black/5 animate-pulse"></div>
                        </div>
                    </button>
                </div>
            ) : (
                <div className={`fixed bottom-8 right-8 z-[60] bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-500 overflow-hidden ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isMinimized ? 'w-72 h-16 rounded-full' : 'w-[90vw] md:w-[420px] h-[650px] max-h-[85vh]'}`}>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 dark:border-gray-800" onClick={() => setIsMinimized(!isMinimized)}>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
                                    <Sparkles size={20} className="text-white dark:text-black" />
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm"></span>
                            </div>
                            <div>
                                <h3 className="font-serif-display font-bold text-base text-gray-900 dark:text-white">UF-läraren</h3>
                                {!isMinimized && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by Aceverse AI</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setIsVoiceModeOpen(true); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full transition-all text-gray-600 dark:text-gray-300 hover:scale-110" title="Ring upp">
                                <Mic size={20} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full transition-all text-gray-600 dark:text-gray-300">
                                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full transition-all text-gray-600 dark:text-gray-300">
                                <ChevronDown size={20} />
                            </button>
                        </div>
                    </div>
                    {!isMinimized && (
                        <>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-950/30">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-3 max-w-[92%] animate-[slideUp_0.4s_ease-out_forwards] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                                            {msg.role === 'ai' ? <Sparkles size={14} /> : <div className="text-[10px] font-bold">DU</div>}
                                        </div>
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                            <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3 items-center text-gray-400 text-[10px] uppercase font-bold tracking-widest pl-2 animate-fadeIn">
                                        <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center opacity-30">
                                            <Sparkles size={14} className="animate-spin" />
                                        </div>
                                        <span>Skriver svar...</span>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                            <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                <form onSubmit={handleSend} className="relative flex items-center group">
                                    <input 
                                        value={input} 
                                        onChange={(e) => setInput(e.target.value)} 
                                        placeholder="Skriv din fråga här..." 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-all text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner" 
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!input.trim() || isTyping} 
                                        className="absolute right-2.5 p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-30 transition-all shadow-lg"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            )}
            {/* VoiceMode placeras här för att vara utanför clip/overflow-behållare */}
            <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} systemInstruction={voiceSystemInstruction} voiceName="Puck" />
        </>
    );
};

export default GlobalChatbot;
