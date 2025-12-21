
import React from 'react';
import { NavProps, Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC<NavProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  const footerLinks: Record<string, { label: string, page?: Page }[]> = {
    [t('footer.product')]: [
      { label: t('footer.overview'), page: 'product' },
      { label: t('footer.wordAddin'), page: 'product' },
      { label: t('footer.review'), page: 'product' },
      { label: t('footer.workflows'), page: 'product' },
    ],
    [t('footer.solutions')]: [
      { label: t('footer.ma'), page: 'solutions' },
      { label: t('footer.litigation'), page: 'solutions' },
      { label: t('footer.finance'), page: 'solutions' },
    ],
    [t('footer.customers')]: [
      { label: t('footer.overview'), page: 'customers' },
    ],
    [t('footer.careers')]: [
      { label: t('footer.career'), page: 'careers' },
    ],
    [t('footer.company')]: [
      { label: t('footer.overview'), page: 'about' },
      { label: t('footer.securityPolicy'), page: 'security' },
      { label: t('nav.contact'), page: 'contact' },
    ],
    [t('footer.legal')]: [
      { label: t('footer.terms') },
      { label: t('footer.privacy') },
      { label: t('footer.securityPolicy') }
    ]
  };

  const handleLinkClick = (page?: Page) => {
    if (page) {
      onNavigate(page);
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className="bg-white dark:bg-black pt-24 pb-12 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-24">
           {/* Logo Column */}
           <div className="col-span-2 md:col-span-1 lg:col-span-1 mb-8 lg:mb-0">
               <img 
                  src="https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Logga-Ej%20bakrund.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvTG9nZ2EtRWogYmFrcnVuZC5wbmciLCJpYXQiOjE3NjQ3NTk3NjYsImV4cCI6MTc5NjI5NTc2Nn0.wItQw7FJaVd5ANf3TXe2kTAYHeEPzQB9gDJxEcs4ZYs" 
                  alt="Aceverse Logo" 
                  className="h-12 w-auto object-contain mb-4 mix-blend-multiply dark:mix-blend-normal dark:invert" 
               />
           </div>

           {Object.entries(footerLinks).map(([category, links]) => (
             <div key={category}>
               <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">{category}</h4>
               <ul className="space-y-4">
                 {links.map((link) => (
                   <li key={link.label}>
                     <button 
                        onClick={() => handleLinkClick(link.page)}
                        className={`text-sm text-left transition-colors ${link.page ? 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white cursor-pointer' : 'text-gray-400 dark:text-gray-600 cursor-default'}`}
                     >
                       {link.label}
                     </button>
                   </li>
                 ))}
               </ul>
             </div>
           ))}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <h1 className="font-serif-display text-[12vw] leading-none text-center tracking-tighter select-none pointer-events-none opacity-90 text-black dark:text-white">
                ACEVERSE
            </h1>
        </div>
        
        <div className="mt-8 flex flex-col md:flex-row justify-between text-xs text-gray-500 dark:text-gray-400">
            <p>&copy; 2025 Aceverse AB. {t('footer.rights')}</p>
            <div className="flex gap-4 mt-4 md:mt-0">
                <span>Västerås</span>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
