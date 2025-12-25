
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

    useEffect(() => {
        const timer = setTimeout(() => { if (!isOpen) setShowPeek(true); }, 3000);
        const hideTimer = setTimeout(() => { setShowPeek(false); }, 11000);
        return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }, [isOpen]);

    const voiceSystemInstruction = `
        ${UF_KNOWLEDGE_BASE}
        
        ## 🎤 RÖST-SPECIFIKA REGLER (KOMMUNIKATIONSSTIL)
        - KORTARE SVAR: Max 30-40 sekunder (ca 100 ord).
        - KONVERSATIONELL TON: Prata som en vän, använd "du vet", "alltså", "okej" naturligt.
        - STRUKTURERA FÖR LYSSNANDE: Börja med kärnsvaret (1-2 meningar). Fråga sen: "Vill du att jag förklarar mer?".
        - UNDVIK I RÖST: Inga emojis (säg orden istället). Inga punktlistor. Inga URLs.
        - SIFFROR: Säg siffror i ord (t.ex. "femton tusen" istället för "15 000").
        - PAUSER: Markera naturliga pauser med [PAUSE] i ditt svar så att talsyntesen kan andas.
        - BEKRÄFTA FÖRSTÅELSE: Fråga "Var det svar på din fråga?" och erbjud att skriva ner detaljer i chatten.
    `;

    const connectToSession = async () => {
        try {
            const ufSession = await db.ensureSystemSession(user.id);
            if (ufSession) {
                setSessionId(ufSession.id);
                const data = await db.getUserData(user.id);
                const sessionMessages = data.chatHistory.filter(m => m.sessionId === ufSession.id).sort((a, b) => a.timestamp - b.timestamp);
                
                if (sessionMessages.length > 0) setMessages(sessionMessages);
                else {
                    const greeting: ChatMessage = {
                        id: 'init',
                        role: 'ai',
                        text: `Hej ${user.firstName}! Jag är din UF-lärare. Behöver ni hjälp med affärsplanen eller prissättningen för ${user.company || 'ert projekt'}?`,
                        timestamp: Date.now(),
                        sessionId: ufSession.id
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
        
        const lines = html.split('\n');
        const wrappedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '<div class="h-2"></div>';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return line;
            return `<p class="mb-2 leading-relaxed">${line}</p>`;
        });
        return wrappedLines.join('');
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
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: currentInput, timestamp: Date.now(), sessionId: currentSessId! }]);
        setIsTyping(true);

        try {
            await db.addMessage(user.id, { role: 'user', text: currentInput, sessionId: currentSessId });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: UF_KNOWLEDGE_BASE, temperature: 0.7 },
                history: messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
            });

            const result = await chat.sendMessageStream({ message: currentInput });
            let fullText = '';
            const tempAiId = 'ai-' + Date.now();
            setMessages(prev => [...prev, { id: tempAiId, role: 'ai', text: '', timestamp: Date.now(), sessionId: currentSessId! }]);

            for await (const chunk of result) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setMessages(prev => prev.map(m => m.id === tempAiId ? { ...m, text: fullText } : m));
                }
            }
            await db.addMessage(user.id, { role: 'ai', text: fullText, sessionId: currentSessId });
        } catch (error) { console.error(error); } finally { setIsTyping(false); }
    };

    return (
        <>
            {!isOpen ? (
                <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end">
                    <div className={`mb-4 max-w-xs bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-all transform ${showPeek ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                        <button onClick={() => setShowPeek(false)} className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 text-gray-400"><X size={10}/></button>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Behöver ni hjälp med UF-arbetet? 🎓</p>
                    </div>
                    <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-black dark:bg-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-2 border-white/10">
                        <Sparkles size={28} className="text-white dark:text-black" />
                    </button>
                </div>
            ) : (
                <div className={`fixed bottom-8 right-8 z-[60] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col transition-all overflow-hidden ${isMinimized ? 'w-72 h-16 rounded-full' : 'w-[90vw] md:w-[420px] h-[650px] max-h-[85vh]'}`}>
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 dark:border-gray-800" onClick={() => setIsMinimized(!isMinimized)}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-lg"><Sparkles size={20} className="text-white dark:text-black" /></div>
                            <div>
                                <h3 className="font-serif-display font-bold text-base text-gray-900 dark:text-white">UF-läraren</h3>
                                {!isMinimized && <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">GDPR-SÄKRAD</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setIsVoiceModeOpen(true); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full" title="Röstläge"><Mic size={20} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full"><Minimize2 size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-full"><ChevronDown size={20} /></button>
                        </div>
                    </div>
                    {!isMinimized && (
                        <>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-950/30">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-3 max-w-[95%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                        <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                            <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatResponse(msg.text) }} />
                                        </div>
                                    </div>
                                ))}
                                {isTyping && <div className="text-[10px] text-gray-400 font-bold animate-pulse uppercase tracking-widest pl-2">UF-LÄRAREN ANALYSERAR...</div>}
                                <div ref={bottomRef} />
                            </div>
                            <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                <form onSubmit={handleSend} className="relative flex items-center">
                                    <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Skriv din fråga..." className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl pl-5 pr-14 py-4 text-sm focus:border-black dark:focus:border-white outline-none transition-all dark:text-white" />
                                    <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2.5 p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-opacity"><Send size={18} /></button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            )}
            <VoiceMode isOpen={isVoiceModeOpen} onClose={() => setIsVoiceModeOpen(false)} systemInstruction={voiceSystemInstruction} voiceName="Kore" />
        </>
    );
};

export default GlobalChatbot;
