
import React from 'react';
import Testimonial from '../components/Testimonial';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const Customers: React.FC = () => {
    const { t } = useLanguage();
    const logos = [
        "Procivitas", "Victor Rydberg", "Jensen Education", "Thoren Business School", 
        "Stockholm School of Economics", "KTH Royal Institute", "Ung Företagsamhet", 
        "Junior Achievement", "TechStars", "Y Combinator Startup School", "Hyper Island", "Berghs"
      ];

  return (
    <div className="pt-20 pb-24">
      <section className="px-6 mb-24">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-12 whitespace-pre-line">
              {t('customers.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {t('customers.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Logo Grid */}
      <section className="px-6 py-12 mb-24">
          <div className="max-w-7xl mx-auto">
             <RevealOnScroll>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-16">
                  {logos.map((logo, idx) => (
                      <div key={idx} className="h-20 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 pb-8">
                          <span className="text-xl md:text-2xl font-serif font-bold text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-300 transition-colors cursor-default text-center">
                              {logo}
                          </span>
                      </div>
                  ))}
               </div>
             </RevealOnScroll>
          </div>
      </section>

      {/* Featured Case Study */}
      <Testimonial />

      {/* Additional Stats */}
      <section className="px-6 py-32 bg-gray-900 dark:bg-white text-white dark:text-black mt-24 transition-colors">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 text-center">
              <RevealOnScroll delay={0}>
                  <div>
                      <div className="text-6xl font-serif-display mb-4">500+</div>
                      <div className="text-gray-400 dark:text-gray-500 uppercase tracking-widest text-sm">{t('customers.stats.startups')}</div>
                  </div>
              </RevealOnScroll>
              <RevealOnScroll delay={150}>
                  <div>
                      <div className="text-6xl font-serif-display mb-4">10k+</div>
                      <div className="text-gray-400 dark:text-gray-500 uppercase tracking-widest text-sm">{t('customers.stats.students')}</div>
                  </div>
              </RevealOnScroll>
              <RevealOnScroll delay={300}>
                  <div>
                      <div className="text-6xl font-serif-display mb-4">1M+</div>
                      <div className="text-gray-400 dark:text-gray-500 uppercase tracking-widest text-sm">{t('customers.stats.pitches')}</div>
                  </div>
              </RevealOnScroll>
          </div>
      </section>
    </div>
  );
};

export default Customers;
