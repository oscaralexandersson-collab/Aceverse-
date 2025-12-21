
import React from 'react';
import SecurityComponent from '../components/Security'; // Reuse the existing component
import { Shield, Lock, UserCheck, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import RevealOnScroll from '../components/RevealOnScroll';

const SecurityPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="pt-20">
      <section className="px-6 mb-24">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <span className="text-sm font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-4 block">{t('securityPage.tag')}</span>
            <h1 className="font-serif-display text-6xl md:text-8xl leading-[0.9] text-gray-900 dark:text-white mb-12 whitespace-pre-line">
              {t('securityPage.title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
               {t('securityPage.desc')}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Reuse the black banner section */}
      <SecurityComponent />

      {/* Detailed Grid */}
      <section className="px-6 py-32 bg-white dark:bg-black transition-colors">
          <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-16">
                  <RevealOnScroll>
                      <div>
                          <h3 className="font-serif-display text-3xl mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                              <Shield className="w-6 h-6" /> {t('securityPage.grid.ip.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-12">
                              {t('securityPage.grid.ip.desc')}
                          </p>

                          <h3 className="font-serif-display text-3xl mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                              <UserCheck className="w-6 h-6" /> {t('securityPage.grid.age.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {t('securityPage.grid.age.desc')}
                          </p>
                      </div>
                  </RevealOnScroll>
                  <RevealOnScroll delay={200}>
                      <div>
                          <h3 className="font-serif-display text-3xl mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                              <Lock className="w-6 h-6" /> {t('securityPage.grid.privacy.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-12">
                              {t('securityPage.grid.privacy.desc')}
                          </p>

                          <h3 className="font-serif-display text-3xl mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                              <EyeOff className="w-6 h-6" /> {t('securityPage.grid.training.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
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
