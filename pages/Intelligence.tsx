
import React from 'react';
import { PageProps } from '../types';
import RevealOnScroll from '../components/RevealOnScroll';
import { Brain, Network, Zap, GitMerge, Database, ArrowRight, Share2, MessageSquare, BookOpen, Search } from 'lucide-react';

const Intelligence: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="pt-20 pb-24 bg-white dark:bg-black font-sans transition-colors duration-300">
        
        {/* HERO SECTION */}
        <section className="min-h-[80vh] flex items-center justify-center relative overflow-hidden px-6">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(90deg,black_1px,transparent_1px),linear-gradient(black_1px,transparent_1px)] dark:bg-[linear-gradient(90deg,white_1px,transparent_1px),linear-gradient(white_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            <div className="max-w-5xl w-full relative z-10 text-center">
                <RevealOnScroll>
                    <div className="inline-flex items-center gap-2 px-4 py-2 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 bg-white dark:bg-black">
                        <Brain size={12} /> The Brain of your Startup
                    </div>
                    <h1 className="font-serif-display text-6xl md:text-9xl leading-[0.8] text-black dark:text-white mb-8 tracking-tighter">
                        ENTREPRENEURIAL<br/>INTELLIGENCE
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed font-light">
                        Varför använda tio olika verktyg när du kan använda en hjärna? 
                        Aceverse binder samman din data för att skapa insikter som inget enskilt verktyg kan leverera.
                    </p>
                </RevealOnScroll>
            </div>
        </section>

        {/* DIAGRAM SECTION: The Problem vs Solution */}
        <section className="py-32 border-y border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-20">
                    {/* The Old Way */}
                    <RevealOnScroll>
                        <div className="p-8 md:p-12 bg-white dark:bg-black rounded-3xl border border-gray-200 dark:border-gray-800 opacity-50 hover:opacity-100 transition-opacity">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Dumma Verktyg (Silos)</h3>
                            <div className="flex justify-between items-center gap-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 border-2 border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center"><Database size={24} className="text-gray-400"/></div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">CRM</span>
                                </div>
                                <div className="h-px w-full bg-gray-300 dark:bg-gray-700 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black px-2 text-xs font-bold text-red-500">X</div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 border-2 border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center"><Zap size={24} className="text-gray-400"/></div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">AI</span>
                                </div>
                                <div className="h-px w-full bg-gray-300 dark:bg-gray-700 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black px-2 text-xs font-bold text-red-500">X</div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 border-2 border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center"><Share2 size={24} className="text-gray-400"/></div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Social</span>
                                </div>
                            </div>
                            <p className="mt-8 text-sm text-gray-500">Ditt CRM vet inte vad du marknadsför. Din AI-tjänst vet inte vad du säljer. Du måste vara mellanhanden.</p>
                        </div>
                    </RevealOnScroll>

                    {/* The Aceverse Way */}
                    <RevealOnScroll delay={200}>
                        <div className="p-8 md:p-12 bg-white dark:bg-black rounded-3xl border-2 border-black dark:border-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden">
                            <h3 className="text-xs font-black uppercase tracking-widest text-black dark:text-white mb-8">Aceverse Intelligence</h3>
                            
                            {/* Animated Network */}
                            <div className="relative h-32 flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-32 h-32 border border-dashed border-black/20 dark:border-white/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                                </div>
                                
                                <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center z-10 relative">
                                    <Brain size={24} className="text-white dark:text-black"/>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-black animate-pulse"></div>
                                </div>

                                {/* Connecting Lines */}
                                <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-black/20 dark:via-white/20 to-transparent top-1/2 -translate-y-1/2"></div>
                                <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-black/20 dark:via-white/20 to-transparent left-1/2 -translate-x-1/2"></div>
                            </div>

                            <p className="mt-8 text-sm font-bold text-black dark:text-white">All data delas. När du stänger en deal i CRM:et, föreslår Marknadsförings-motorn automatiskt ett LinkedIn-inlägg om det.</p>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>

        {/* DEEP DIVE FEATURES */}
        <section className="px-6 py-32 space-y-32">
            <div className="max-w-7xl mx-auto">
                
                {/* Feature 1: The AI Teacher (Central Hub) - NEW SECTION */}
                <div className="grid md:grid-cols-2 gap-20 items-center mb-32">
                    <RevealOnScroll className="md:order-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-black dark:border-white rounded-full text-[9px] font-black uppercase tracking-widest mb-6">
                            <MessageSquare size={10} /> Central Hub
                        </div>
                        <h2 className="font-serif-display text-5xl md:text-7xl mb-6 leading-[0.9]">
                            Din UF-lärare minns <br/><span className="border-b-4 border-black dark:border-white">allt.</span>
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                            Din vanliga lärare har 30 andra företag att hålla koll på. Aceverse har bara dig.
                            <br/><br/>
                            Du kan fråga UF-läraren om vad som helst. Den kan din <strong>Affärsplan</strong> ordagrant. Den vet exakt vem du ringde i morse via <strong>CRM:et</strong>. Den ser dina <strong>Marknadsmål</strong>.
                            <br/><br/>
                            Det är inte bara en chatbot. Det är ett gränssnitt mot hela ditt företags själ.
                        </p>
                    </RevealOnScroll>

                    <RevealOnScroll delay={200} className="md:order-1">
                        <div className="relative bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
                            {/* Chat Interface Simulation */}
                            <div className="space-y-6 relative z-10">
                                {/* User Message */}
                                <div className="flex justify-end">
                                    <div className="bg-black text-white dark:bg-white dark:text-black px-6 py-4 rounded-2xl rounded-tr-sm text-sm font-medium max-w-[80%]">
                                        Vad borde jag fokusera på idag?
                                    </div>
                                </div>

                                {/* AI Processing Animation */}
                                <div className="flex items-center gap-2 px-4">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Läser Affärsplan... Kollar CRM...</span>
                                </div>

                                {/* AI Response */}
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 px-6 py-6 rounded-2xl rounded-tl-sm text-sm text-gray-800 dark:text-gray-200 max-w-[90%] shadow-sm">
                                        <p className="mb-4">
                                            Enligt din <span className="font-bold border-b border-black dark:border-white">Tidsplan</span> har ni deadline på årsredovisningen imorgon.
                                        </p>
                                        <p>
                                            Dessutom ser jag i <span className="font-bold border-b border-black dark:border-white">CRM:et</span> att ni inte följt upp med <em>ICA Maxi</em> än. Ska jag skriva ett mail åt dig?
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Connecting Lines (Visual Metaphor) */}
                            <div className="absolute inset-0 pointer-events-none opacity-20">
                                <div className="absolute top-10 left-10 p-2 border border-black dark:border-white rounded text-[8px] font-black uppercase">Affärsplan</div>
                                <div className="absolute bottom-10 right-10 p-2 border border-black dark:border-white rounded text-[8px] font-black uppercase">CRM Data</div>
                                <svg className="absolute inset-0 w-full h-full">
                                    <path d="M 50 50 C 150 50, 150 150, 200 200" fill="none" stroke="currentColor" strokeDasharray="4 4" />
                                    <path d="M 300 300 C 250 300, 250 250, 200 200" fill="none" stroke="currentColor" strokeDasharray="4 4" />
                                </svg>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
                
                {/* Feature 2: Contextual Memory */}
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <RevealOnScroll>
                        <h2 className="font-serif-display text-4xl md:text-6xl mb-6">Kontextuellt Minne.</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                            De flesta AI-tjänster glömmer vem du är så fort du stänger fliken. Aceverse minns.
                            <br/><br/>
                            Vi bygger en dynamisk "kunskapsgraf" över ditt företag. Den vet dina säljmål, din varumärkesröst och dina senaste idéer. Du behöver aldrig upprepa din affärsidé igen.
                        </p>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold uppercase">Långtidsminne</div>
                            <div className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold uppercase">Auto-uppdatering</div>
                        </div>
                    </RevealOnScroll>
                    <RevealOnScroll delay={200}>
                        <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 relative flex items-center justify-center overflow-hidden">
                            {/* Abstract Data Points */}
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="absolute w-2 h-2 bg-black dark:bg-white rounded-full" 
                                     style={{ 
                                         top: `${50 + 35 * Math.sin(i * Math.PI / 4)}%`, 
                                         left: `${50 + 35 * Math.cos(i * Math.PI / 4)}%`,
                                     }}>
                                     <div className="absolute w-20 h-px bg-black/10 dark:bg-white/10 origin-left rotate-[180deg]" style={{ transform: `rotate(${i * 45 + 180}deg)` }}></div>
                                </div>
                            ))}
                            <div className="w-24 h-24 bg-white dark:bg-black rounded-full border-2 border-black dark:border-white z-10 flex items-center justify-center">
                                <Database size={32} />
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

                {/* Feature 3: Cross-Pollination */}
                <div className="grid md:grid-cols-2 gap-16 items-center md:flex-row-reverse mt-32">
                    <RevealOnScroll className="md:order-2">
                        <h2 className="font-serif-display text-4xl md:text-6xl mb-6">Data-Korsbefruktning.</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                            Information är värdelös i vakuum. Aceverse låter dina verktyg prata med varandra.
                            <br/><br/>
                            Din <strong>Pitch</strong> uppdateras automatiskt när din <strong>Affärsmodell</strong> ändras. 
                            Ditt <strong>Säljmanus</strong> justeras baserat på feedback från <strong>Marknadsanalysen</strong>.
                        </p>
                    </RevealOnScroll>
                    <RevealOnScroll delay={200} className="md:order-1">
                        <div className="h-80 w-full bg-white dark:bg-black border-2 border-black dark:border-white rounded-[2rem] p-8 relative flex flex-col justify-between">
                            <div className="flex justify-between">
                                <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900"><GitMerge size={24}/></div>
                                <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900"><Network size={24}/></div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-12">
                                <div className="h-px bg-black dark:bg-white w-full relative">
                                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 bg-black dark:bg-white rounded-full animate-[ping_2s_linear_infinite]"></div>
                                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 bg-black dark:bg-white rounded-full animate-[ping_2s_linear_infinite_1s]"></div>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black px-3 py-1 rounded-full">Realtids-Sync</span>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

            </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-32 text-center bg-black text-white dark:bg-white dark:text-black">
            <RevealOnScroll>
                <h2 className="font-serif-display text-5xl md:text-8xl mb-8">Upplev skillnaden.</h2>
                <button 
                    onClick={() => onNavigate('login')}
                    className="bg-white text-black dark:bg-black dark:text-white px-12 py-6 rounded-full text-xl font-bold hover:scale-105 transition-transform"
                >
                    Starta Motorn
                </button>
            </RevealOnScroll>
        </section>

    </div>
  );
};

export default Intelligence;
