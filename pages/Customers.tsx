
import React from 'react';
import Testimonial from '../components/Testimonial';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';
import { Users } from 'lucide-react';

const Customers: React.FC = () => {
    const { t } = useLanguage();
    // Using just text for logos to maintain clean aesthetic without uploading images
    const logos = [
        "Procivitas", "Victor Rydberg", "Jensen Education", "Thoren Business School", 
        "Stockholm School of Economics", "KTH Royal Institute", "Ung Företagsamhet", 
        "Junior Achievement", "TechStars", "Y Combinator Startup School", "Hyper Island", "Berghs"
      ];

  return (
    <div className="pt-32 pb-24 bg-white dark:bg-black transition-colors duration-300">
      
      {/* Header */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                <Users size={12} /> {t('nav.customers')}
            </div>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-black dark:text-white mb-12 whitespace-pre-line">
              {t('customers.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed font-light">
              {t('customers.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Logo Grid - Minimal Text */}
      <section className="px-6 py-24 border-y border-gray-100 dark:border-gray-900 mb-24">
          <div className="max-w-7xl mx-auto">
             <RevealOnScroll>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-16 md:gap-24">
                  {logos.map((logo, idx) => (
                      <div key={idx} className="flex items-center justify-center">
                          <span className="text-xl md:text-2xl font-serif font-bold text-gray-300 dark:text-gray-700 hover:text-black dark:hover:text-white transition-colors cursor-default text-center">
                              {logo}
                          </span>
                      </div>
                  ))}
               </div>
             </RevealOnScroll>
          </div>
      </section>

      {/* Testimonial (Reusing existing component, it's already clean enough but context might need adjustment) */}
      <Testimonial />

      {/* Stats - Monochrome */}
      <section className="px-6 py-32 bg-black dark:bg-white text-white dark:text-black mt-24">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-20 text-center">
              <RevealOnScroll delay={0}>
                  <div>
                      <div className="text-7xl font-serif-display mb-4">500+</div>
                      <div className="text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] text-xs font-bold">{t('customers.stats.startups')}</div>
                  </div>
              </RevealOnScroll>
              <RevealOnScroll delay={150}>
                  <div>
                      <div className="text-7xl font-serif-display mb-4">10k+</div>
                      <div className="text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] text-xs font-bold">{t('customers.stats.students')}</div>
                  </div>
              </RevealOnScroll>
              <RevealOnScroll delay={300}>
                  <div>
                      <div className="text-7xl font-serif-display mb-4">1M+</div>
                      <div className="text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] text-xs font-bold">{t('customers.stats.pitches')}</div>
                  </div>
              </RevealOnScroll>
          </div>
      </section>
    </div>
  );
};

export default Customers;
