
import React from 'react';
import { ArrowUpRight, Network } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import RevealOnScroll from '../components/RevealOnScroll';

const Careers: React.FC = () => {
    const { t, language } = useLanguage();
    
    // Safely cast careers jobs from translations
    const jobs = (translations[language] as any).careers.jobs as { role: string, dept: string, loc: string }[];

    const handleApply = (role: string) => {
      alert(t('careers.alert').replace('{role}', role));
    };

  return (
    <div className="pt-20 pb-24">
      <section className="px-6 mb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
            <div>
                 <RevealOnScroll>
                    <span className="text-sm font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-4 block">{t('careers.tag')}</span>
                    <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-8 whitespace-pre-line">
                        {t('careers.title')}
                    </h1>
                 </RevealOnScroll>
            </div>
            <div className="flex items-end">
                <RevealOnScroll delay={200}>
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                        {t('careers.desc')}
                    </p>
                </RevealOnScroll>
            </div>
        </div>
      </section>

      <section className="px-6">
          <div className="max-w-7xl mx-auto">
             <RevealOnScroll>
                 {/* Abstract Culture Visualization */}
                 <div className="aspect-[21/9] bg-gray-900 dark:bg-gray-800 mb-24 overflow-hidden rounded-sm relative group flex items-center justify-center">
                     {/* Background Gradient */}
                     <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-black dark:from-black dark:via-gray-900 dark:to-gray-800"></div>
                     
                     {/* Grid */}
                     <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                     {/* Connected Nodes Animation */}
                     <div className="relative w-full h-full">
                        {[...Array(20)].map((_, i) => (
                            <div 
                                key={i}
                                className="absolute w-1.5 h-1.5 bg-white rounded-full animate-float opacity-70"
                                style={{
                                    top: `${Math.random() * 80 + 10}%`,
                                    left: `${Math.random() * 80 + 10}%`,
                                    animationDuration: `${3 + Math.random() * 5}s`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            >
                                <div className="absolute top-1/2 left-1/2 w-24 h-[1px] bg-gradient-to-r from-white/20 to-transparent origin-left rotate-[360deg] animate-pulse"></div>
                            </div>
                        ))}
                     </div>
                     
                     <div className="absolute bottom-8 left-8 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                         <div className="flex items-center gap-2 text-white">
                             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                             <span className="text-sm font-medium">Remote & On-site</span>
                         </div>
                     </div>
                 </div>
             </RevealOnScroll>

             <div className="max-w-4xl mx-auto">
                 <RevealOnScroll>
                    <h2 className="font-serif-display text-4xl mb-12 text-gray-900 dark:text-white">{t('careers.jobsTitle')}</h2>
                 </RevealOnScroll>
                 <div className="space-y-4">
                     {jobs.map((job, idx) => (
                         <RevealOnScroll key={idx} delay={idx * 100}>
                             <div 
                                onClick={() => handleApply(job.role)}
                                className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 px-4 -mx-4 transition-colors"
                             >
                                 <div>
                                     <h3 className="text-xl font-medium mb-1 text-gray-900 dark:text-white">{job.role}</h3>
                                     <div className="text-gray-500 dark:text-gray-400 text-sm flex gap-4">
                                         <span>{job.dept}</span>
                                         <span>•</span>
                                         <span>{job.loc}</span>
                                     </div>
                                 </div>
                                 <div className="mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <div className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                                         {t('careers.apply')} <ArrowUpRight size={14} />
                                     </div>
                                 </div>
                             </div>
                         </RevealOnScroll>
                     ))}
                 </div>
             </div>
          </div>
      </section>
    </div>
  );
};

export default Careers;
