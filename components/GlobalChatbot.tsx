
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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

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
        Du är en GDPR-säker UF-lärare. Behandla inga känsliga personuppgifter (Art. 9).
    `;

    const voiceSystemInstruction = `
        ${baseSystemInstruction}
        # RÖST-SPECIFIKA GDPR-REGLER
        ✅ **KORTA SVAR:** Max 30 sekunder.
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
                        text: `Hej ${user.firstName}! 👋 Jag är din UF-lärare. Vad jobbar ni med just nu?`,
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
                <button 
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-8 right-8 z-[60] group cursor-pointer animate-fadeIn"
                >
                    <div className="absolute bottom-full mb-3 right-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            UF-läraren
                        </span>
                        <div className="absolute bottom-[-4px] right-6 w-2 h-2 bg-white dark:bg-gray-800 transform rotate-45 border-r border-b border-gray-100 dark:border-gray-700"></div>
                    </div>
                    <div className="relative w-16 h-16 bg-black dark:bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 overflow-hidden">
                        <Sparkles size={28} className="text-white dark:text-black relative z-10" strokeWidth={1.5} />
                    </div>
                </button>
            ) : (
                <div className={`fixed bottom-8 right-8 z-[60] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 overflow-hidden ${isMinimized ? 'w-72 h-16' : 'w-[90vw] md:w-[400px] h-[600px] max-h-[80vh]'}`}>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 dark:border-gray-800" onClick={() => setIsMinimized(!isMinimized)}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-md">
                                <Sparkles size={16} className="text-white dark:text-black" />
                            </div>
                            <div>
                                <h3 className="font-serif-display font-bold text-sm text-gray-900 dark:text-white">UF-läraren</h3>
                                {!isMinimized && <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setIsVoiceModeOpen(true); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors text-gray-600 dark:text-gray-300" title="Prata med läraren">
                                <Mic size={18} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                                <ChevronDown size={18} />
                            </button>
                        </div>
                    </div>
                    {!isMinimized && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950/50">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                            {msg.role === 'ai' ? <Sparkles size={14} /> : <div className="text-[10px] font-bold">DU</div>}
                                        </div>
                                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                            <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3 items-center text-gray-400 text-xs pl-2 animate-fadeIn">
                                        <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center opacity-50">
                                            <Sparkles size={14} className="animate-spin" />
                                        </div>
                                        <span>UF-läraren skriver...</span>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                <form onSubmit={handleSend} className="relative flex items-center">
                                    <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Fråga om UF-regler, idéer eller hjälp..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full pl-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white" />
                                    <button type="submit" disabled={!input.trim()} className="absolute right-2 p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-80 disabled:opacity-50 transition-all shadow-md"><Send size={16} /></button>
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
