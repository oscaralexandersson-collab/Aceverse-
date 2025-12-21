
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

  // Form data collector
  const [data, setData] = useState({
    company: user.company === 'My Startup' ? '' : user.company || '',
    industry: '',
    stage: 'Ide'
  });

  const industries = [
    'Tech & Mjukvara', 'E-handel', 'Tjänster', 'Hälsa', 'Hållbarhet', 'Utbildning', 'Annat'
  ];

  const stages = [
    { id: 'Ide', label: 'Idé-stadiet' },
    { id: 'MVP', label: 'Bygger Prototyp' },
    { id: 'Growth', label: 'Har Kunder' }
  ];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      addMessage('ai', `Hej ${user.firstName}! Jag är Aceverse, din AI-medgrundare. 👋`);
      setIsTyping(true);
      setTimeout(() => {
        addMessage('ai', 'Innan vi börjar bygga, låt oss ställa in din profil. Vad heter ditt företag eller projekt?');
        setIsTyping(false);
        setCurrentStep('company');
      }, 1500);
    }
  }, []);

  const addMessage = (role: 'user' | 'ai', text: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role,
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    // Add User Message
    addMessage('user', text);
    setInputValue('');
    setIsTyping(true);

    // Process Step
    setTimeout(async () => {
      if (currentStep === 'company') {
        const companyName = text;
        setData(prev => ({ ...prev, company: companyName }));
        
        addMessage('ai', `Snyggt namn! Vilken bransch passar bäst in på ${companyName}?`);
        setIsTyping(false);
        setCurrentStep('industry');

      } else if (currentStep === 'industry') {
        setData(prev => ({ ...prev, industry: text }));
        
        addMessage('ai', 'Uppfattat. Och var befinner ni er på resan just nu?');
        setIsTyping(false);
        setCurrentStep('stage');

      } else if (currentStep === 'stage') {
        // Final Step
        const updatedData = { ...data, stage: text }; // Use local var to ensure latest state
        addMessage('ai', 'Tack! Jag konfigurerar din arbetsyta nu...');
        
        try {
            const updatedUser = await db.completeOnboarding(user.id, {
                company: updatedData.company,
                industry: updatedData.industry,
                stage: text, // This might be raw text label or ID depending on flow, map it if needed
                description: ''
            });
            
            setTimeout(() => {
                onComplete(updatedUser);
            }, 1000);
        } catch (e) {
            console.error(e);
            setIsTyping(false);
        }
      }
    }, 1000);
  };

  const handleSkip = () => {
      addMessage('user', "Har inget namn än");
      setIsTyping(true);
      setTimeout(() => {
          setData(prev => ({ ...prev, company: 'Mitt Projekt' }));
          addMessage('ai', 'Inga problem, vi kallar det "Mitt Projekt" så länge. Vilken bransch är du intresserad av?');
          setIsTyping(false);
          setCurrentStep('industry');
      }, 1000);
  };

  const handleOptionClick = (option: string) => {
    handleSend(option);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-beige-100 rounded-full blur-3xl opacity-60"></div>
             <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-gray-100 rounded-full blur-3xl opacity-60"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 w-full p-6 flex justify-center border-b border-gray-50 bg-white/50 backdrop-blur-sm">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">
                    <Sparkles size={16} />
                 </div>
                 <span className="font-serif-display text-xl font-bold">Aceverse</span>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
            <div className="max-w-2xl mx-auto space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-[slideUp_0.3s_ease-out_forwards]`}>
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'ai' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                            {msg.role === 'ai' ? <Sparkles size={18} /> : <div className="font-bold text-xs">DU</div>}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-base leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-black text-white rounded-br-none' 
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                        }`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-4 animate-fadeIn">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
                            <Sparkles size={18} />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-6 py-4 flex items-center gap-2 shadow-sm">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Interaction Area */}
        <div className="relative z-10 p-6 md:p-8 bg-white border-t border-gray-50">
            <div className="max-w-2xl mx-auto">
                {/* Quick Options / Chips */}
                {!isTyping && currentStep === 'industry' && (
                    <div className="flex flex-wrap gap-2 mb-4 animate-fadeIn">
                        {industries.map(ind => (
                            <button 
                                key={ind}
                                onClick={() => handleOptionClick(ind)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm hover:border-black hover:bg-gray-50 transition-colors"
                            >
                                {ind}
                            </button>
                        ))}
                    </div>
                )}

                {!isTyping && currentStep === 'stage' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 animate-fadeIn">
                        {stages.map(st => (
                            <button 
                                key={st.id}
                                onClick={() => handleOptionClick(st.id)}
                                className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-black hover:bg-gray-50 transition-colors text-left"
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Field */}
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} 
                    className="relative flex items-center gap-4"
                >
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={
                            currentStep === 'company' ? "Skriv företagsnamn..." :
                            currentStep === 'industry' ? "Skriv eller välj bransch..." :
                            "Svara här..."
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-full pl-6 pr-14 py-4 text-base focus:outline-none focus:ring-1 focus:ring-black focus:bg-white transition-all shadow-sm"
                        autoFocus
                        disabled={isTyping}
                    />
                    
                    <button 
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="absolute right-2 p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ArrowRight size={20} />
                    </button>
                </form>

                {currentStep === 'company' && !isTyping && (
                    <div className="mt-4 text-center">
                        <button 
                            onClick={handleSkip}
                            className="text-sm text-gray-400 hover:text-black underline decoration-1 underline-offset-4"
                        >
                            Jag har inget namn än
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Onboarding;
