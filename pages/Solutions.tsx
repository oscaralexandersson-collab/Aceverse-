
import React from 'react';
import { Lightbulb, TrendingUp, Mic, GraduationCap, ArrowUpRight, Share2, Building2, Users } from 'lucide-react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const Solutions: React.FC<PageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  const solutions = [
    {
        title: t('solutions.s1.title'),
        icon: <Lightbulb className="w-8 h-8" />,
        desc: t('solutions.s1.desc')
    },
    {
        title: t('solutions.s2.title'),
        icon: <TrendingUp className="w-8 h-8" />,
        desc: t('solutions.s2.desc')
    },
    {
        title: t('solutions.s3.title'),
        icon: <Mic className="w-8 h-8" />,
        desc: t('solutions.s3.desc')
    },
    {
        title: t('solutions.s4.title'),
        icon: <GraduationCap className="w-8 h-8" />,
        desc: t('solutions.s4.desc')
    }
  ];

  return (
    <div className="pt-20 pb-24">
      <section className="px-6 mb-24">
        <div className="max-w-7xl mx-auto text-center md:text-left">
          <RevealOnScroll>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-8">
              {t('solutions.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {t('solutions.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
            {solutions.map((sol, idx) => (
                <RevealOnScroll key={idx} delay={idx * 100}>
                  <div className="group border border-gray-200 dark:border-gray-800 p-12 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors relative overflow-hidden h-full">
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md w-fit mb-8 group-hover:bg-white dark:group-hover:bg-black transition-colors text-black dark:text-white">
                          {sol.icon}
                      </div>
                      <h3 className="font-serif-display text-3xl mb-4 text-gray-900 dark:text-white">{sol.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                          {sol.desc}
                      </p>
                      <button 
                        onClick={() => onNavigate('login')}
                        className="flex items-center gap-2 font-medium text-sm group-hover:translate-x-2 transition-transform hover:text-black dark:hover:text-white text-gray-700 dark:text-gray-300"
                      >
                          {t('nav.readMore')} <ArrowUpRight size={14} />
                      </button>
                  </div>
                </RevealOnScroll>
            ))}
        </div>
      </section>
      
      <section className="px-6 py-24 bg-beige-100 dark:bg-gray-900 mt-12 overflow-hidden relative transition-colors">
          {/* Background decoration to blend smoothly */}
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white dark:from-black to-transparent"></div>
          
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
              <div className="md:w-1/2">
                <RevealOnScroll>
                   <span className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-4 block">Ekosystemet</span>
                   <h2 className="font-serif-display text-5xl md:text-6xl mb-6 text-gray-900 dark:text-white">{t('solutions.partner.title')}</h2>
                   <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed text-lg">
                       {t('solutions.partner.desc')}
                   </p>
                   <button 
                    onClick={() => onNavigate('contact')}
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {t('solutions.partner.btn')}
                  </button>
                </RevealOnScroll>
              </div>
              
              <div className="md:w-1/2 w-full flex justify-center">
                  <RevealOnScroll delay={200} className="w-full">
                    {/* Seamless 3D Floating Visualization - Neutral Theme */}
                    <div className="relative w-full aspect-square md:aspect-[4/3] flex items-center justify-center perspective-1000">
                        
                        {/* Ambient Glow / Aura behind the object - Neutral White/Gray */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/50 dark:bg-gray-800/50 blur-[100px] rounded-full pointer-events-none"></div>

                        {/* The Floating Core System */}
                        <div className="relative w-64 h-64 animate-float preserve-3d">
                            
                            {/* Orbit Ring 1 (Tilted) - Gray */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] border border-gray-400/20 dark:border-gray-500/20 rounded-full animate-[spin_20s_linear_infinite] [transform:rotateX(70deg)_rotateY(10deg)]"></div>
                            
                            {/* Orbit Ring 2 (Tilted Reverse) - Gray */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-gray-400/30 dark:border-gray-500/30 rounded-full animate-[spin_25s_linear_infinite_reverse] [transform:rotateX(70deg)_rotateY(-10deg)]"></div>

                            {/* Central 3D Sphere (The Partner/Hub) - Black Obsidian */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-gray-700 via-gray-900 to-black dark:from-gray-200 dark:via-white dark:to-gray-100 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] flex items-center justify-center z-20 border-t border-white/20 dark:border-black/20 relative overflow-hidden group">
                                {/* Glossy Reflection */}
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 dark:from-black/10 to-transparent rounded-t-full"></div>
                                <Building2 className="text-white dark:text-black w-16 h-16 drop-shadow-md relative z-10 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                                
                                {/* Pulse Effect */}
                                <div className="absolute inset-0 bg-white/10 dark:bg-black/10 rounded-full animate-ping opacity-20"></div>
                            </div>

                            {/* Floating Satellite Cards - White/Black */}
                            {/* Card 1: Students */}
                            <div className="absolute top-0 right-[-40px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/50 dark:border-gray-700 p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.05)] flex items-center gap-3 animate-float z-30" style={{ animationDelay: '0s' }}>
                                <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase">Ansluter</div>
                                    <div className="font-bold text-gray-900 dark:text-white">Studenter</div>
                                </div>
                            </div>

                            {/* Card 2: Ideas */}
                            <div className="absolute bottom-[-20px] left-[-20px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/50 dark:border-gray-700 p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.05)] flex items-center gap-3 animate-float z-30" style={{ animationDelay: '1.5s' }}>
                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full flex items-center justify-center">
                                    <Lightbulb size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase">Genererar</div>
                                    <div className="font-bold text-gray-900 dark:text-white">Idéer</div>
                                </div>
                            </div>

                            {/* Card 3: Growth */}
                            <div className="absolute top-[20%] left-[-60px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/50 dark:border-gray-700 p-4 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.05)] flex items-center gap-3 animate-float z-10 scale-90 opacity-90 blur-[1px]" style={{ animationDelay: '2.5s' }}>
                                <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full flex items-center justify-center">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase">Mäter</div>
                                    <div className="font-bold text-gray-900 dark:text-white">Tillväxt</div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </RevealOnScroll>
              </div>
          </div>
      </section>
    </div>
  );
};

export default Solutions;
