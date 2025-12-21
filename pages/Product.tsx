
import React from 'react';
import { Check, ArrowRight, Sparkles, MessageSquare, BarChart3, PieChart, Zap, Target, Search, CheckCircle2 } from 'lucide-react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import RevealOnScroll from '../components/RevealOnScroll';

const Product: React.FC<PageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  
  // Need to safely cast/retrieve list from translations because 't' returns string.
  // Accessing directly from object for array data
  const featureList = (translations[language] as any).product.f1.list as string[];

  return (
    <div className="pt-20 pb-24">
      {/* Product Hero */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <span className="text-sm font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-4 block">{t('product.tag')}</span>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-12 max-w-5xl">
              {t('product.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {t('product.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Feature 1: AI Advisor Visual */}
      <section className="px-6 py-24 bg-beige-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <RevealOnScroll>
              {/* Abstract AI Chat Interface */}
              <div className="w-full aspect-square md:aspect-[4/3] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                  {/* Subtle Grid Background */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                  <div className="absolute inset-0 p-8 flex flex-col justify-center relative z-10">
                      <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
                           
                           {/* Message 1: User */}
                           <div className="self-end bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl rounded-br-none shadow-lg transform translate-y-2 animate-[slideUp_0.8s_ease-out_forwards] max-w-[80%]">
                               <p className="text-sm font-medium opacity-90">Hur sätter jag rätt pris på min produkt?</p>
                           </div>

                           {/* Typing Indicator - Neutral */}
                           <div className="self-start flex items-center gap-2 mb-1 animate-[fadeIn_0.5s_ease-out_0.8s_forwards] opacity-0">
                               <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                   <Sparkles size={12} className="text-gray-500 dark:text-gray-400" />
                               </div>
                               <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Aceverse AI tänker...</span>
                           </div>

                           {/* Message 2: AI Response */}
                           <div className="self-start bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl rounded-bl-none shadow-xl transform animate-[slideUp_0.8s_ease-out_1.5s_forwards] opacity-0 relative overflow-hidden">
                               {/* Shimmer effect for "loading" text feel */}
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50/50 dark:via-gray-700/50 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                               
                               <div className="space-y-3">
                                   <div className="flex items-center gap-2 mb-2">
                                       <span className="text-xs font-bold text-gray-900 dark:text-white">Analys klar</span>
                                       <Check size={12} className="text-black dark:text-white" />
                                   </div>
                                   <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full"></div>
                                   <div className="h-2 w-[90%] bg-gray-100 dark:bg-gray-700 rounded-full"></div>
                                   <div className="h-2 w-[60%] bg-gray-100 dark:bg-gray-700 rounded-full"></div>
                               </div>
                               
                               {/* Floating Insight Card - Neutral */}
                               <div className="mt-4 bg-beige-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex items-start gap-3">
                                   <Zap size={16} className="text-black dark:text-white mt-0.5" />
                                   <div>
                                       <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">Strategiförslag</div>
                                       <div className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight">Baserat på dina konkurrenter rekommenderar jag en freemium-modell.</div>
                                   </div>
                               </div>
                           </div>
                      </div>
                  </div>
              </div>
            </RevealOnScroll>
            
            <RevealOnScroll delay={200}>
              <div>
                  <h2 className="font-serif-display text-4xl md:text-5xl mb-6 text-gray-900 dark:text-white">{t('product.f1.title')}</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
                      {t('product.f1.desc')}
                  </p>
                  <ul className="space-y-4 mb-8">
                      {featureList.map((item, idx) => (
                          <li key={item} className="flex items-center gap-3 text-gray-800 dark:text-gray-200 font-medium" style={{ transitionDelay: `${idx * 100}ms` }}>
                              <div className="bg-black dark:bg-white text-white dark:text-black rounded-full p-1"><Check size={12} /></div>
                              {item}
                          </li>
                      ))}
                  </ul>
              </div>
            </RevealOnScroll>
        </div>
      </section>

       {/* Feature 2: CRM Visual - The Lead Magnet */}
       <section className="px-6 py-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <RevealOnScroll>
              <div>
                  <h2 className="font-serif-display text-4xl md:text-5xl mb-6 text-gray-900 dark:text-white">{t('product.f2.title')}</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
                     {t('product.f2.desc')}
                  </p>
                  <button 
                    onClick={() => onNavigate('login')}
                    className="flex items-center gap-2 text-black dark:text-white font-semibold hover:underline decoration-2 underline-offset-4"
                  >
                      {t('product.f2.link')} <ArrowRight size={16} />
                  </button>
              </div>
            </RevealOnScroll>
            
            <RevealOnScroll delay={200}>
               {/* Seamless 3D Gravity Core Visualization */}
              <div className="relative w-full aspect-square md:aspect-[4/3] flex items-center justify-center perspective-1000">
                  {/* Background Aura */}
                  <div className="absolute w-[60%] h-[60%] bg-gray-100/80 dark:bg-gray-800/80 rounded-full blur-[80px] -z-10 animate-pulse-slow"></div>

                  {/* The 3D Composition */}
                  <div className="relative w-full h-full preserve-3d flex items-center justify-center">
                      
                      {/* Central Intelligence Core */}
                      <div className="relative w-32 h-32 preserve-3d animate-[float_6s_ease-in-out_infinite]">
                          {/* The Black Box */}
                          <div className="absolute inset-0 bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-gray-700/50 dark:border-gray-300/50 flex items-center justify-center z-20 transform rotate-12">
                               <div className="relative w-16 h-16 border border-white/10 dark:border-black/10 rounded-full flex items-center justify-center">
                                   <div className="absolute inset-0 border-t border-white/30 dark:border-black/30 rounded-full animate-spin"></div>
                                   <Target className="text-white dark:text-black" size={28} strokeWidth={1.5} />
                               </div>
                          </div>
                          {/* Decorative Elements behind core */}
                          <div className="absolute inset-0 bg-gray-900/20 dark:bg-white/20 rounded-3xl transform -rotate-6 scale-110 -z-10 blur-sm"></div>
                      </div>

                      {/* Floating Lead Cards - Orbiting */}
                      
                      {/* Lead 1: Incoming (Top Right) - Glass Style */}
                      <div className="absolute top-[15%] right-[10%] w-48 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/60 dark:border-gray-700 rounded-xl shadow-xl animate-float" style={{ animationDelay: '0.5s' }}>
                          <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-600">JD</div>
                              <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">John Doe</div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400">CEO, TechStart</div>
                              </div>
                              <div className="ml-auto w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse"></div>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-black dark:bg-white w-[85%] rounded-full"></div>
                          </div>
                          <div className="mt-1 flex justify-between text-[9px] text-gray-400 font-medium">
                               <span>Match Score</span>
                               <span>85%</span>
                          </div>
                      </div>

                      {/* Lead 2: Processing (Left) - Glass Style */}
                      <div className="absolute top-[40%] left-[5%] w-44 p-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/60 dark:border-gray-700 rounded-xl shadow-lg animate-float blur-[0.5px] scale-95" style={{ animationDelay: '2s' }}>
                          <div className="flex items-center gap-3 mb-2 opacity-80">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-600">SJ</div>
                              <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">Sarah J.</div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Founder, Eco...</div>
                              </div>
                          </div>
                          <div className="flex gap-1 mt-1">
                              <div className="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded text-[9px] text-gray-600 dark:text-gray-300">SaaS</div>
                              <div className="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded text-[9px] text-gray-600 dark:text-gray-300">Stockholm</div>
                          </div>
                      </div>

                      {/* Lead 3: Converted (Bottom Right - Stacked) - Black Card */}
                      <div className="absolute bottom-[20%] right-[15%] w-52 bg-black dark:bg-white text-white dark:text-black p-4 rounded-xl shadow-2xl animate-float" style={{ animationDelay: '3.5s' }}>
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-xs font-bold">MK</div>
                                  <div>
                                       <div className="text-xs font-bold">Möte Bokato</div>
                                       <div className="text-[10px] text-gray-400 dark:text-gray-600">Tis 14:00</div>
                                  </div>
                              </div>
                              <div className="bg-white/20 dark:bg-black/10 p-1.5 rounded-full">
                                  <CheckCircle2 size={12} />
                              </div>
                          </div>
                          <div className="p-2 bg-white/10 dark:bg-black/5 rounded text-[10px] text-gray-300 dark:text-gray-600 italic border border-white/5 dark:border-black/5">
                              "Ser fram emot att höra mer..."
                          </div>
                      </div>
                      
                      {/* Connecting Beams (SVG) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md">
                          <defs>
                              <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
                                  <stop offset="50%" stopColor="rgba(0,0,0,0.2)" />
                                  <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
                              </linearGradient>
                          </defs>
                          <path d="M 70% 25% Q 50% 50% 55% 45%" fill="none" stroke="url(#beamGrad)" strokeWidth="1" strokeDasharray="4 4" className="animate-[shimmer_3s_linear_infinite]" />
                          <path d="M 25% 45% Q 40% 50% 45% 50%" fill="none" stroke="url(#beamGrad)" strokeWidth="1" strokeDasharray="4 4" className="animate-[shimmer_4s_linear_infinite]" />
                      </svg>
                  </div>
              </div>
            </RevealOnScroll>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-32 bg-black dark:bg-white text-white dark:text-black text-center transition-colors">
        <div className="max-w-3xl mx-auto">
            <RevealOnScroll>
              <h2 className="font-serif-display text-5xl md:text-6xl mb-8">{t('product.cta.title')}</h2>
              <button 
                onClick={() => onNavigate('login')}
                className="bg-white dark:bg-black text-black dark:text-white px-8 py-4 text-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full"
              >
                  {t('product.cta.btn')}
              </button>
            </RevealOnScroll>
        </div>
      </section>
    </div>
  );
};

export default Product;
