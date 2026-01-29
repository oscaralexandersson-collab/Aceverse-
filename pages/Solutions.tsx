
import React from 'react';
import { Lightbulb, TrendingUp, Mic, GraduationCap, ArrowUpRight, Building2, Users } from 'lucide-react';
import { PageProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const Solutions: React.FC<PageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  const solutions = [
    {
        title: t('solutions.s1.title'),
        icon: <Lightbulb className="w-6 h-6" />,
        desc: t('solutions.s1.desc')
    },
    {
        title: t('solutions.s2.title'),
        icon: <TrendingUp className="w-6 h-6" />,
        desc: t('solutions.s2.desc')
    },
    {
        title: t('solutions.s3.title'),
        icon: <Mic className="w-6 h-6" />,
        desc: t('solutions.s3.desc')
    },
    {
        title: t('solutions.s4.title'),
        icon: <GraduationCap className="w-6 h-6" />,
        desc: t('solutions.s4.desc')
    }
  ];

  return (
    <div className="pt-32 pb-24 bg-white dark:bg-black transition-colors duration-300">
      
      {/* Header */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                <Lightbulb size={12} /> {t('nav.solutions')}
            </div>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-black dark:text-white mb-12 max-w-5xl">
              {t('solutions.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed font-light">
              {t('solutions.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
            {solutions.map((sol, idx) => (
                <RevealOnScroll key={idx} delay={idx * 100}>
                  <div className="group border border-gray-200 dark:border-gray-800 p-12 rounded-[2rem] hover:bg-gray-50 dark:hover:bg-gray-900 transition-all relative overflow-hidden h-full flex flex-col justify-between">
                      <div>
                          <div className="w-12 h-12 flex items-center justify-center border border-black dark:border-white rounded-full mb-8 text-black dark:text-white">
                              {sol.icon}
                          </div>
                          <h3 className="font-serif-display text-4xl mb-4 text-black dark:text-white">{sol.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 font-light text-lg">
                              {sol.desc}
                          </p>
                      </div>
                      <button 
                        onClick={() => onNavigate('login')}
                        className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform text-black dark:text-white"
                      >
                          {t('nav.readMore')} <ArrowUpRight size={14} />
                      </button>
                  </div>
                </RevealOnScroll>
            ))}
        </div>
      </section>
      
      {/* Ecosystem Section */}
      <section className="px-6 py-24 bg-gray-50 dark:bg-zinc-950 border-t border-gray-100 dark:border-gray-900">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
              <div className="md:w-1/2">
                <RevealOnScroll>
                   <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-6 block">Ekosystemet</span>
                   <h2 className="font-serif-display text-5xl md:text-6xl mb-8 text-black dark:text-white">{t('solutions.partner.title')}</h2>
                   <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed text-lg font-light">
                       {t('solutions.partner.desc')}
                   </p>
                   <button 
                    onClick={() => onNavigate('contact')}
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-all"
                  >
                    {t('solutions.partner.btn')}
                  </button>
                </RevealOnScroll>
              </div>
              
              <div className="md:w-1/2 w-full flex justify-center">
                  <RevealOnScroll delay={200} className="w-full">
                    {/* Abstract Ecosystem Visual - Monochrome */}
                    <div className="relative w-full aspect-square md:aspect-[4/3] flex items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                        
                        <div className="relative w-64 h-64">
                            {/* Central Hub */}
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="w-32 h-32 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center shadow-2xl">
                                    <Building2 className="text-black dark:text-white w-12 h-12" strokeWidth={1} />
                                </div>
                            </div>

                            {/* Orbiting Elements */}
                            <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
                                    <Users size={20} />
                                </div>
                            </div>
                            <div className="absolute inset-0 animate-[spin_25s_linear_infinite_reverse]" style={{ width: '140%', height: '140%', left: '-20%', top: '-20%' }}>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-black dark:text-white">
                                    <Lightbulb size={20} />
                                </div>
                            </div>
                            
                            {/* Rings */}
                            <div className="absolute inset-0 rounded-full border border-dashed border-gray-300 dark:border-gray-700"></div>
                            <div className="absolute inset-[-20%] rounded-full border border-dashed border-gray-200 dark:border-gray-800 opacity-50"></div>
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
