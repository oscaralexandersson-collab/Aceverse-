
import React from 'react';
import { ArrowRight, Brain, Users, BookOpen, CheckCircle2, Zap, Plus } from 'lucide-react';
import { PageProps } from '../types';
import RevealOnScroll from './RevealOnScroll';

const FeatureSection: React.FC<Partial<PageProps>> = ({ onNavigate }) => {

  return (
    <div id="features" className="bg-white dark:bg-black transition-colors duration-300 overflow-hidden">
      
      {/* Intro Header */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black dark:border-white pb-12">
                <h2 className="font-serif-display text-6xl md:text-8xl text-black dark:text-white leading-[0.9]">
                  En plattform.<br/>
                  Oändliga möjligheter.
                </h2>
                <p className="text-xl text-gray-500 max-w-md mb-2">
                    Aceverse binder samman din data, dina mål och ditt team i ett enda sömlöst flöde.
                </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Feature 1: Intelligence */}
      <section className="py-24 px-6 border-b border-gray-100 dark:border-gray-900">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
              <RevealOnScroll>
                  <div className="mb-6 w-12 h-12 flex items-center justify-center border border-black dark:border-white rounded-full">
                      <Brain size={20} className="text-black dark:text-white"/>
                  </div>
                  <h3 className="font-serif-display text-4xl md:text-5xl mb-6 text-black dark:text-white">Entrepreneurial Intelligence.</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                      Aceverse är inte bara ett verktyg, det är en hjärna. Ditt CRM pratar med din Marknadsföring. Din Pitch-studio vet vad du säljer. Allt hänger ihop för att ge dig insikter som inget annat system kan.
                  </p>
                  <ul className="space-y-4">
                      {['Kontextuellt minne', 'Automatisk data-delning', 'Proaktiva förslag'].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm font-bold text-black dark:text-white uppercase tracking-wide">
                              <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full"></div> {item}
                          </li>
                      ))}
                  </ul>
              </RevealOnScroll>
              
              <RevealOnScroll delay={200}>
                  {/* Abstract Visual: Connected Nodes */}
                  <div className="aspect-square bg-gray-50 dark:bg-zinc-900 rounded-[3rem] relative overflow-hidden flex items-center justify-center group">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]"></div>
                      
                      {/* Central Hub */}
                      <div className="w-24 h-24 bg-black dark:bg-white rounded-full z-10 flex items-center justify-center shadow-2xl relative">
                          <Zap size={32} className="text-white dark:text-black animate-pulse"/>
                      </div>

                      {/* Satellites */}
                      {[0, 90, 180, 270].map((deg, i) => (
                          <div key={i} className="absolute w-full h-full flex items-center justify-center" style={{ transform: `rotate(${deg}deg)` }}>
                              <div className="w-px h-32 bg-gradient-to-b from-transparent via-black/20 dark:via-white/20 to-transparent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full origin-bottom group-hover:h-40 transition-all duration-700"></div>
                              <div className="absolute top-[15%] w-12 h-12 border border-black/10 dark:border-white/10 rounded-full flex items-center justify-center bg-white dark:bg-black group-hover:scale-110 transition-transform">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </RevealOnScroll>
          </div>
      </section>

      {/* Feature 2: Compliance (Reversed Layout) */}
      <section className="py-24 px-6 border-b border-gray-100 dark:border-gray-900">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
              <RevealOnScroll className="lg:order-2">
                  <div className="mb-6 w-12 h-12 flex items-center justify-center border border-black dark:border-white rounded-full">
                      <BookOpen size={20} className="text-black dark:text-white"/>
                  </div>
                  <h3 className="font-serif-display text-4xl md:text-5xl mb-6 text-black dark:text-white">Tränad på UF-Kriterier.</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                      Vår AI gissar inte. Den är tränad på UF:s officiella bedömningsmatriser och tävlingshandbok. Få feedback som faktiskt höjer ditt betyg och förbereder dig för juryn.
                  </p>
                  <button onClick={() => onNavigate && onNavigate('product')} className="group flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black dark:text-white border-b-2 border-black dark:border-white pb-1 hover:opacity-70 transition-opacity">
                      Läs om UF-läraren <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
              </RevealOnScroll>

              <RevealOnScroll delay={200} className="lg:order-1">
                  {/* Visual: Grading / Checkmarks */}
                  <div className="aspect-[4/3] bg-gray-50 dark:bg-zinc-900 rounded-[3rem] p-12 relative overflow-hidden flex flex-col justify-center gap-4">
                      {[1, 2, 3].map((_, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transform transition-all hover:scale-105 hover:border-black dark:hover:border-white">
                              <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shrink-0">
                                  <CheckCircle2 size={16} />
                              </div>
                              <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-black dark:bg-white w-[80%]"></div>
                              </div>
                              <span className="text-xs font-bold font-mono">10/10</span>
                          </div>
                      ))}
                  </div>
              </RevealOnScroll>
          </div>
      </section>

      {/* Feature 3: Teams */}
      <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
              <RevealOnScroll>
                  <div className="mb-6 w-12 h-12 flex items-center justify-center border border-black dark:border-white rounded-full">
                      <Users size={20} className="text-black dark:text-white"/>
                  </div>
                  <h3 className="font-serif-display text-4xl md:text-5xl mb-6 text-black dark:text-white">Teams Mode.</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                      UF är en lagsport. Arbeta i samma vy, dela leads, chatta och bygg bolaget tillsammans i realtid. Ingen hamnar efter, alla har samma information.
                  </p>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                  {/* Visual: Collaboration (Replaced with Product Page Chat UI) */}
                  <div className="relative h-[500px] w-full bg-white dark:bg-black rounded-[3rem] border-2 border-black dark:border-white p-6 overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)] flex flex-col">
                      
                      {/* Window Controls - Monochrome */}
                      <div className="flex gap-2 mb-6">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                      </div>

                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold text-xs">A</div>
                              <div>
                                  <h4 className="font-bold text-xs text-black dark:text-white">EcoWear UF Team</h4>
                                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white"></span> 3 Online</span>
                              </div>
                          </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar p-1">
                          
                          {/* User 1 */}
                          <div className="flex gap-3 animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '0.1s'}}>
                              <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-500">VD</div>
                              <div className="flex-1">
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-sm p-3 text-xs text-gray-700 dark:text-gray-300">
                                      Hur går det med säljpitchen?
                                  </div>
                              </div>
                          </div>

                          {/* User 2 */}
                          <div className="flex gap-3 flex-row-reverse animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '0.5s'}}>
                              <div className="w-6 h-6 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-[9px] font-bold">MK</div>
                              <div className="flex-1 flex flex-col items-end">
                                  <div className="bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-sm p-3 text-xs">
                                      Klar! Har laddat upp den. 🚀
                                  </div>
                              </div>
                          </div>

                          {/* System / AI Message - Monochrome */}
                          <div className="flex justify-center animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '1.2s'}}>
                              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-2xl max-w-[90%] flex items-start gap-2">
                                  <div className="w-6 h-6 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black shrink-0"><Zap size={12} fill="currentColor"/></div>
                                  <div>
                                      <span className="text-[8px] font-black uppercase tracking-widest text-black dark:text-white mb-1 block">Aceverse Intelligence</span>
                                      <p className="text-[10px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                          Jag har analyserat pitchen. Ni saknar en "Call to Action" enligt <strong>Kriterie 5</strong>. Vill ni ha förslag?
                                      </p>
                                  </div>
                              </div>
                          </div>

                          {/* User 1 Response */}
                          <div className="flex gap-3 animate-[slideUp_0.5s_ease-out_forwards]" style={{animationDelay: '2.5s', opacity: 0}}>
                              <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-500">VD</div>
                              <div className="flex-1">
                                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl rounded-tl-sm p-3 text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                      <div className="flex gap-1">
                                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                      </div>

                      {/* Input Area */}
                      <div className="mt-4 relative">
                          <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between">
                              <span className="text-xs text-gray-400">Skriv till teamet...</span>
                              <div className="w-6 h-6 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
                                  <ArrowRight size={10}/>
                              </div>
                          </div>
                      </div>

                  </div>
              </RevealOnScroll>
          </div>
      </section>

    </div>
  );
};

export default FeatureSection;
