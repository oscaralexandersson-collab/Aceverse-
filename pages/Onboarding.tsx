
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Send, Building2 } from 'lucide-react';
import { User, ChatMessage } from '../types';
import { db } from '../services/db';

interface OnboardingProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

type Step = 'intro' | 'company' | 'industry' | 'stage' | 'completed';

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState({
    company: user.company === 'My Startup' ? '' : user.company || '',
    industry: '',
    stage: 'Ide'
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage('ai', `Välkommen ${user.firstName}! Jag är Aceverse AI-assistent för ditt UF-företag. 👋`);
      setIsTyping(true);
      setTimeout(() => {
        addMessage('ai', 'Låt oss konfigurera ditt projekt. Vad heter ditt UF-företag (eller den tillfälliga idén)?');
        setIsTyping(false);
        setCurrentStep('company');
      }, 1500);
    }
  }, []);

  const addMessage = (role: 'user' | 'ai', text: string) => {
    const newMsg: ChatMessage = { id: Date.now().toString(), role, text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setInputValue('');
    setIsTyping(true);

    setTimeout(async () => {
      if (currentStep === 'company') {
        setData(prev => ({ ...prev, company: text }));
        addMessage('ai', `Ett starkt namn! Vilken bransch arbetar ${text} inom?`);
        setIsTyping(false);
        setCurrentStep('industry');
      } else if (currentStep === 'industry') {
        setData(prev => ({ ...prev, industry: text }));
        addMessage('ai', 'Uppfattat. Var i UF-resan befinner ni er just nu?');
        setIsTyping(false);
        setCurrentStep('stage');
      } else if (currentStep === 'stage') {
        addMessage('ai', 'Tack! Jag skapar din GDPR-säkra arbetsyta nu...');
        try {
            const updatedUser = await db.completeOnboarding(user.id, { ...data, stage: text });
            setTimeout(() => onComplete(updatedUser), 1000);
        } catch (e) { console.error(e); setIsTyping(false); }
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-beige-100 rounded-full blur-3xl opacity-60"></div>
             <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-gray-100 rounded-full blur-3xl opacity-60"></div>
        </div>
        <div className="relative z-10 w-full p-6 flex justify-center border-b border-gray-50 bg-white/50 backdrop-blur-sm">
             <div className="flex items-center gap-2"><div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center"><Sparkles size={16} /></div><span className="font-serif-display text-xl font-bold">Aceverse</span></div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
            <div className="max-w-2xl mx-auto space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-[slideUp_0.3s_ease-out_forwards]`}>
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-white border border-gray-200'}`}>{msg.role === 'ai' ? <Sparkles size={18} /> : 'DU'}</div>
                        <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-base leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}><p>{msg.text}</p></div>
                    </div>
                ))}
                {isTyping && <div className="flex gap-4 animate-fadeIn"><div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center"><Sparkles size={18} /></div><div className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-2"><span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></span></div></div>}
                <div ref={messagesEndRef} />
            </div>
        </div>
        <div className="relative z-10 p-6 md:p-8 bg-white border-t border-gray-50">
            <div className="max-w-2xl mx-auto">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} className="relative flex items-center">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Svara här..." className="w-full bg-gray-50 border border-gray-200 rounded-full pl-6 pr-14 py-4 text-base focus:ring-1 focus:ring-black outline-none transition-all shadow-sm" autoFocus disabled={isTyping} />
                    <button type="submit" disabled={!inputValue.trim() || isTyping} className="absolute right-2 p-2 bg-black text-white rounded-full disabled:opacity-50"><ArrowRight size={20} /></button>
                </form>
            </div>
        </div>
    </div>
  );
};

export default Onboarding;
