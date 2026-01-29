
import React from 'react';
import { ArrowRight, Briefcase } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import RevealOnScroll from '../components/RevealOnScroll';

const Careers: React.FC = () => {
    const { t, language } = useLanguage();
    
    const jobs = (translations[language] as any).careers.jobs as { role: string, dept: string, loc: string }[];

    const handleApply = (role: string) => {
      alert(t('careers.alert').replace('{role}', role));
    };

  return (
    <div className="pt-32 pb-24 bg-white dark:bg-black transition-colors duration-300">
      
      {/* Header */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
            <div>
                 <RevealOnScroll>
                    <div className="inline-flex items-center gap-2 px-3 py-1 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                        <Briefcase size={12} /> {t('careers.tag')}
                    </div>
                    <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-black dark:text-white mb-8 whitespace-pre-line">
                        {t('careers.title')}
                    </h1>
                 </RevealOnScroll>
            </div>
            <div className="flex items-end">
                <RevealOnScroll delay={200}>
                    <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-4 font-light">
                        {t('careers.desc')}
                    </p>
                </RevealOnScroll>
            </div>
        </div>
      </section>

      <section className="px-6">
          <div className="max-w-7xl mx-auto">
             <RevealOnScroll>
                 {/* Monochrome Culture Visual */}
                 <div className="aspect-[21/9] bg-gray-100 dark:bg-zinc-900 mb-24 overflow-hidden rounded-[2rem] relative group flex items-center justify-center">
                     <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.02)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.02)_50%,rgba(0,0,0,0.02)_75%,transparent_75%,transparent)] bg-[size:40px_40px]"></div>
                     
                     <div className="relative z-10 text-center">
                         <span className="text-9xl font-serif-display text-black/5 dark:text-white/5 font-bold tracking-tighter">FUTURE</span>
                     </div>
                 </div>
             </RevealOnScroll>

             <div className="max-w-5xl mx-auto">
                 <RevealOnScroll>
                    <h2 className="font-serif-display text-4xl mb-12 text-black dark:text-white">{t('careers.jobsTitle')}</h2>
                 </RevealOnScroll>
                 <div className="border-t border-black dark:border-white">
                     {jobs.map((job, idx) => (
                         <RevealOnScroll key={idx} delay={idx * 100}>
                             <div 
                                onClick={() => handleApply(job.role)}
                                className="group flex flex-col md:flex-row md:items-center justify-between py-10 border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors px-4"
                             >
                                 <div>
                                     <h3 className="text-2xl font-bold mb-2 text-black dark:text-white group-hover:translate-x-2 transition-transform">{job.role}</h3>
                                     <div className="text-gray-500 dark:text-gray-400 text-sm flex gap-4 uppercase tracking-widest font-medium">
                                         <span>{job.dept}</span>
                                         <span className="text-gray-300 dark:text-gray-700">|</span>
                                         <span>{job.loc}</span>
                                     </div>
                                 </div>
                                 <div className="mt-6 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black dark:text-white">
                                         {t('careers.apply')} <ArrowRight size={16} />
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
