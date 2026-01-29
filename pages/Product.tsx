
import React from 'react';
import { 
    Check, ArrowRight, Sparkles, MessageSquare, BarChart3, PieChart, 
    Zap, Target, Search, CheckCircle2, User, Mic, Send, Globe, 
    FileText, Users, Share2, Briefcase, Brain, Layers, MousePointer2, Plus, Terminal, ArrowUpRight, TrendingUp, BookOpen, Award
} from 'lucide-react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const Product: React.FC<PageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="pt-20 pb-24 bg-white dark:bg-black overflow-hidden transition-colors duration-300 font-sans">
      
      {/* 1. INTRO: ENTREPRENEURIAL INTELLIGENCE */}
      <section className="px-6 py-32 text-center relative border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            {/* CLICKABLE BADGE */}
            <button 
                onClick={() => onNavigate('intelligence')}
                className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-black dark:border-white bg-transparent text-black dark:text-white text-[10px] font-black uppercase tracking-[0.15em] mb-8 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
            >
                <Brain size={14} /> Entrepreneurial Intelligence <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
            </button>
            <h1 className="font-serif-display text-5xl md:text-8xl leading-[0.95] text-black dark:text-white mb-8 tracking-tight font-medium">
              Mer än bara verktyg.<br/>
              <span className="font-bold border-b-4 border-black dark:border-white">Det är intelligens.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-16 font-light">
              Aceverse är inte en samling isolerade appar. Det är ett ekosystem där ditt CRM pratar med din Marknadsföring, och där din Pitch-coach vet exakt vad du säljer. Allt hänger ihop.
            </p>

            {/* NEW: UF CRITERIA BAR */}
            <div className="inline-flex flex-col md:flex-row items-center gap-6 md:gap-12 py-6 px-10 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black"><Check size={12} strokeWidth={4} /></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Byggt på UF-läroplanen</span>
                </div>
                <div className="hidden md:block w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black"><Check size={12} strokeWidth={4} /></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Optimerad för Tävlingskriterier</span>
                </div>
            </div>

          </RevealOnScroll>
        </div>
      </section>

      {/* 2. THE MEGA BENTO GRID (AIRY VERSION - STRICT MONOCHROME) */}
      <section className="px-6 py-32 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
            {/* Added gap-10 and auto-rows-[350px] for more air */}
            <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-3 gap-8 md:gap-12 auto-rows-[380px]">
                
                {/* A. ADVISOR (Large) */}
                <div className="md:col-span-4 md:row-span-2 group relative bg-gray-50 dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden p-10 md:p-12 flex flex-col justify-between hover:border-black dark:hover:border-white transition-all duration-500 hover:shadow-2xl">
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black"><MessageSquare size={24}/></div>
                                <h3 className="font-serif-display text-4xl text-black dark:text-white">UF-läraren</h3>
                            </div>
                            <span className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <BookOpen size={12}/> Kan UF-Handboken
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 max-w-lg text-xl leading-relaxed">
                            En medgrundare som aldrig sover. Få feedback direkt baserad på <strong>UF:s bedömningsmatris</strong> för affärsplaner och strategisk vägledning i realtid.
                        </p>
                    </div>
                    {/* UI Mockup - Monochrome */}
                    <div className="mt-12 bg-white dark:bg-black rounded-t-3xl border-t border-x border-gray-200 dark:border-gray-800 p-8 relative translate-y-6 group-hover:translate-y-0 transition-transform duration-500 shadow-lg">
                        <div className="flex gap-4 mb-6">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Zap size={18} className="text-black dark:text-white"/></div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-3xl rounded-tl-none text-base text-black dark:text-white w-full border border-gray-100 dark:border-gray-800 shadow-sm">
                                Enligt <span className="font-bold border-b border-black dark:border-white">Tävlingskriterierna</span> saknar er målgruppsanalys kvantitativ data. Ska vi fixa det?
                            </div>
                        </div>
                        <div className="flex gap-4 flex-row-reverse">
                            <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black"><User size={18}/></div>
                            <div className="bg-black dark:bg-white text-white dark:text-black p-5 rounded-3xl rounded-tr-none text-base shadow-sm">
                                Ja, hjälp oss ta fram siffror!
                            </div>
                        </div>
                    </div>
                </div>

                {/* B. MARKETING ENGINE (Tall) */}
                <div className="md:col-span-2 md:row-span-2 bg-black dark:bg-white text-white dark:text-black rounded-[3rem] p-10 flex flex-col relative overflow-hidden group border border-black dark:border-white">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="w-14 h-14 bg-white/20 dark:bg-black/10 rounded-full flex items-center justify-center backdrop-blur-sm mb-8"><Globe size={28}/></div>
                            <h3 className="font-serif-display text-4xl mb-6">Marketing Engine</h3>
                            <p className="text-white/70 dark:text-black/70 text-lg mb-8 leading-relaxed">Generera LinkedIn-inlägg och content-planer direkt från din CRM-data. <br/><br/><span className="text-white dark:text-black font-bold border-b border-white/30 dark:border-black/30">Bygger varumärke enligt juryns krav.</span></p>
                        </div>
                        <button className="bg-white dark:bg-black text-black dark:text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-3 w-fit">
                            Skapa Kampanj <ArrowRight size={14}/>
                        </button>
                    </div>
                    {/* Abstract Content Flow - Wireframe style */}
                    <div className="absolute bottom-0 right-0 w-full h-1/2 flex flex-col gap-3 p-6 opacity-30 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="bg-white/10 dark:bg-black/10 p-4 rounded-xl border border-white/20 dark:border-black/20 transform translate-x-12 rotate-[-5deg]">
                            <div className="h-2 w-full bg-white/10 dark:bg-black/10 rounded mb-2"></div>
                            <div className="h-2 w-2/3 bg-white/10 dark:bg-black/10 rounded"></div>
                        </div>
                        <div className="bg-white/10 dark:bg-black/10 p-4 rounded-xl border border-white/20 dark:border-black/20 transform translate-x-4">
                             <div className="h-2 w-full bg-white/10 dark:bg-black/10 rounded mb-2"></div>
                             <div className="h-2 w-1/2 bg-white/10 dark:bg-black/10 rounded"></div>
                        </div>
                    </div>
                </div>

                {/* C. CRM (Wide) - UPDATED VISUAL: Monochrome Deals List */}
                <div className="md:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[3rem] p-10 flex flex-col justify-between group hover:border-black dark:hover:border-white transition-all hover:shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-serif-display text-3xl text-black dark:text-white mb-2">Smart CRM</h3>
                            <p className="text-gray-500">Hantera sponsorer & sälj. <span className="block text-xs font-bold uppercase tracking-wider mt-2 text-black dark:text-white">Krav för "Årets Säljare"</span></p>
                        </div>
                        <div className="w-12 h-12 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-black dark:text-white"><Target size={24}/></div>
                    </div>
                    {/* Deal Pipeline Visualization (Monochrome) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-black dark:bg-white"></div>
                                <div>
                                    <div className="text-sm font-bold text-black dark:text-white">ICA Maxi</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Förhandling</div>
                                </div>
                            </div>
                            <div className="text-sm font-bold font-mono">15 000 kr</div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full border-2 border-gray-400"></div>
                                <div>
                                    <div className="text-sm font-bold text-black dark:text-white">TechHub AB</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Möte bokat</div>
                                </div>
                            </div>
                            <div className="text-sm font-bold font-mono">8 500 kr</div>
                        </div>
                    </div>
                </div>

                {/* D. PITCH STUDIO (Square) - UPDATED VISUAL: Monochrome Scorecard */}
                <div className="md:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[3rem] p-10 group hover:border-black dark:hover:border-white transition-all hover:shadow-xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="font-serif-display text-3xl text-black dark:text-white mb-2">Pitch Studio</h3>
                            <p className="text-gray-500">AI-bedömning enligt <br/><span className="text-black dark:text-white font-bold">UF:s tävlingsprotokoll.</span></p>
                        </div>
                        <div className="w-12 h-12 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-black dark:text-white"><Mic size={24}/></div>
                    </div>
                    {/* Scorecard Visualization (Monochrome) */}
                    <div className="space-y-4 bg-gray-50 dark:bg-black p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Retorik (Kriterie 4)</span>
                            <span className="text-xs font-bold text-black dark:text-white">8/10</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-black dark:bg-white w-[80%] rounded-full"></div>
                        </div>
                        
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Struktur (Kriterie 2)</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">6/10</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-400 dark:bg-gray-600 w-[60%] rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* E. REPORT BUILDER (Wide) - UPDATED TEXT */}
                <div className="md:col-span-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between group hover:border-black dark:hover:border-white transition-all">
                    <div className="max-w-xl mb-8 md:mb-0">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-700"><FileText size={28} className="text-black dark:text-white"/></div>
                            <h3 className="font-serif-display text-4xl text-black dark:text-white">Rapport-Coachen</h3>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
                            Få professionell feedback på er årsredovisning. Aceverse hjälper er förbättra struktur och språk enligt <strong>tävlingsreglerna för Årets Årsredovisning</strong>.
                        </p>
                    </div>
                    <button className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-black dark:text-white px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center gap-3 shadow-lg">
                        Förbättra Rapport <ArrowRight size={16}/>
                    </button>
                </div>

            </div>
        </div>
      </section>

      {/* 3. TEAMS MODE SECTION (STRICT MONOCHROME CHAT) */}
      <section className="px-6 py-32 bg-white dark:bg-black relative overflow-hidden">
          
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:60px_60px] opacity-50 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto relative z-10">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                  
                  {/* Left: Text Content */}
                  <div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black dark:border-white bg-white dark:bg-black text-xs font-black uppercase tracking-widest mb-8">
                          <Users size={14} /> Nyhet: Teams Mode
                      </div>
                      <h2 className="font-serif-display text-6xl md:text-7xl mb-8 leading-tight text-black dark:text-white">Bygg bolaget <br/> tillsammans.</h2>
                      <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-12">
                          UF-företagande är en lagsport. Med Aceverse Teams får alla i gruppen tillgång till samma hjärna. Dela leads, samarbeta i realtid och håll koll på vem som gör vad.
                      </p>
                      <ul className="space-y-6">
                          {['Delad Arbetsyta', 'Rollfördelning', 'Internchatt & Video'].map((item, i) => (
                              <li key={i} className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors cursor-default group">
                                  <div className="w-8 h-8 rounded-full border border-black dark:border-white flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors"><Check size={14}/></div>
                                  <h4 className="font-bold text-lg text-black dark:text-white">{item}</h4>
                              </li>
                          ))}
                      </ul>
                  </div>

                  {/* Right: Simulated Team Chat - UPDATED (MONOCHROME) */}
                  <div className="relative h-[600px] bg-white dark:bg-black rounded-[3rem] border-2 border-black dark:border-white p-8 overflow-hidden shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] dark:shadow-[15px_15px_0px_0px_rgba(255,255,255,1)] flex flex-col">
                      
                      {/* Window Controls - Monochrome */}
                      <div className="flex gap-2 mb-6">
                          <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                          <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                          <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                      </div>

                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold">A</div>
                              <div>
                                  <h4 className="font-bold text-sm text-black dark:text-white">EcoWear UF Team</h4>
                                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white"></span> 3 Online</span>
                              </div>
                          </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar p-2">
                          
                          {/* User 1 */}
                          <div className="flex gap-4 animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '0.1s'}}>
                              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">VD</div>
                              <div className="flex-1">
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-700 dark:text-gray-300">
                                      Hur går det med säljpitchen till mässan?
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-1 block pl-1">Alice • 10:42</span>
                              </div>
                          </div>

                          {/* User 2 */}
                          <div className="flex gap-4 flex-row-reverse animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '0.5s'}}>
                              <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-xs font-bold">MK</div>
                              <div className="flex-1 flex flex-col items-end">
                                  <div className="bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-sm p-4 text-sm">
                                      Klar! Har laddat upp utkastet i Pitch Studio nu. 🚀
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-1 block pr-1">Max • 10:45</span>
                              </div>
                          </div>

                          {/* System / AI Message - Monochrome */}
                          <div className="flex justify-center animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '1.2s'}}>
                              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl max-w-[80%] flex items-start gap-3">
                                  <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black shrink-0"><Zap size={16} fill="currentColor"/></div>
                                  <div>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-1 block">Aceverse Intelligence</span>
                                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                          Snyggt jobbat! Jag har analyserat pitchen. Struktur och retorik ser bra ut, men ni saknar en tydlig "Call to Action" på slutet enligt <strong>Tävlingskriterie 5</strong>. Vill ni att jag ger förslag?
                                      </p>
                                  </div>
                              </div>
                          </div>

                          {/* User 1 Response */}
                          <div className="flex gap-4 animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '2.5s', opacity: 0}}>
                              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">VD</div>
                              <div className="flex-1">
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                      <div className="flex gap-1">
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                      </div>

                      {/* Input Area */}
                      <div className="mt-4 relative">
                          <div className="h-12 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between">
                              <span className="text-sm text-gray-400">Skriv till teamet...</span>
                              <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
                                  <ArrowRight size={14}/>
                              </div>
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 text-center bg-gray-50 dark:bg-black border-t border-gray-100 dark:border-gray-900">
        <RevealOnScroll>
            <h2 className="font-serif-display text-5xl md:text-8xl text-black dark:text-white mb-10">Redo att bygga?</h2>
            <button 
                onClick={() => onNavigate('login')}
                className="bg-black dark:bg-white text-white dark:text-black px-12 py-6 rounded-full text-xl font-bold hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-transparent hover:border-black dark:hover:border-white"
            >
                Kom igång gratis
            </button>
        </RevealOnScroll>
      </section>
    </div>
  );
};

export default Product;
