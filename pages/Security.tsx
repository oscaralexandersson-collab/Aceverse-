
import React from 'react';
import SecurityComponent from '../components/Security'; // Reuse the existing timeline component
import { Shield, Lock, UserCheck, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const SecurityPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="pt-32 pb-24 bg-white dark:bg-black transition-colors duration-300">
      
      {/* Header */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                <Shield size={12} /> {t('securityPage.tag')}
            </div>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-black dark:text-white mb-12 max-w-5xl">
              {t('securityPage.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed font-light">
               {t('securityPage.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* The existing timeline component is already styled well, keeping it */}
      <SecurityComponent />

      {/* Detailed Grid - Restyled to Black & White */}
      <section className="px-6 py-32 bg-gray-50 dark:bg-zinc-950 transition-colors border-t border-gray-100 dark:border-gray-900">
          <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-24">
                  <RevealOnScroll>
                      <div className="group">
                          <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black mb-8 group-hover:scale-110 transition-transform">
                              <Shield size={24} /> 
                          </div>
                          <h3 className="font-serif-display text-3xl mb-4 text-black dark:text-white">
                              {t('securityPage.grid.ip.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                              {t('securityPage.grid.ip.desc')}
                          </p>
                      </div>
                  </RevealOnScroll>

                  <RevealOnScroll delay={100}>
                      <div className="group">
                          <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black mb-8 group-hover:scale-110 transition-transform">
                              <UserCheck size={24} /> 
                          </div>
                          <h3 className="font-serif-display text-3xl mb-4 text-black dark:text-white">
                              {t('securityPage.grid.age.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                              {t('securityPage.grid.age.desc')}
                          </p>
                      </div>
                  </RevealOnScroll>

                  <RevealOnScroll delay={200}>
                      <div className="group">
                          <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black mb-8 group-hover:scale-110 transition-transform">
                              <Lock size={24} /> 
                          </div>
                          <h3 className="font-serif-display text-3xl mb-4 text-black dark:text-white">
                              {t('securityPage.grid.privacy.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                              {t('securityPage.grid.privacy.desc')}
                          </p>
                      </div>
                  </RevealOnScroll>

                  <RevealOnScroll delay={300}>
                      <div className="group">
                          <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black mb-8 group-hover:scale-110 transition-transform">
                              <EyeOff size={24} /> 
                          </div>
                          <h3 className="font-serif-display text-3xl mb-4 text-black dark:text-white">
                              {t('securityPage.grid.training.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                              {t('securityPage.grid.training.desc')}
                          </p>
                      </div>
                  </RevealOnScroll>
              </div>
          </div>
      </section>
    </div>
  );
};

export default SecurityPage;
