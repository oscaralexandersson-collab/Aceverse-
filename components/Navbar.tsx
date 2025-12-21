
import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, LayoutDashboard, Globe, Moon, Sun } from 'lucide-react';
import { NavProps, NavItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar: React.FC<NavProps> = ({ currentPage, onNavigate, user }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: NavItem[] = [
    { label: t('nav.product'), page: 'product', hasDropdown: true },
    { label: t('nav.solutions'), page: 'solutions', hasDropdown: true },
    { label: t('nav.security'), page: 'security', hasDropdown: false },
    { label: t('nav.customers'), page: 'customers', hasDropdown: false },
    { label: t('nav.about'), page: 'about', hasDropdown: false },
    { label: t('nav.contact'), page: 'contact', hasDropdown: false },
  ];

  const handleNavClick = (page: any) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'sv' ? 'en' : 'sv');
  };

  // Hide Navbar on dashboard or login pages if desired, but for now we'll keep it logic-aware
  if (currentPage === 'dashboard') return null;

  return (
    <div className={`sticky top-0 z-50 ${currentPage === 'login' ? 'hidden' : ''}`}>
      {/* Top Banner */}
      <div className="bg-black dark:bg-gray-900 text-white py-2 px-4 text-center text-xs font-medium border-b border-white/10">
        <span className="opacity-70 mr-2">{t('nav.news')} |</span>
        <span className="font-semibold mr-2">{t('nav.newsText')}</span>
        <button className="opacity-70 hover:opacity-100 underline decoration-white/50">{t('nav.readMore')}</button>
      </div>

      {/* Main Navbar */}
      <nav 
        className={`bg-white dark:bg-black transition-all duration-300 border-b border-gray-100 dark:border-gray-800 py-4`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleNavClick('home')}
          >
            <img 
              src="https://zinjxhibtukdhkcakkzk.supabase.co/storage/v1/object/sign/Bilder/Logga-Ej%20bakrund.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lNjg2NDQ1Mi0wNDkyLTRmZjctYmQ2Yi1iOTI5YzQ1MzBkZTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJCaWxkZXIvTG9nZ2EtRWogYmFrcnVuZC5wbmciLCJpYXQiOjE3NjQ3NTk3NjYsImV4cCI6MTc5NjI5NTc2Nn0.wItQw7FJaVd5ANf3TXe2kTAYHeEPzQB9gDJxEcs4ZYs" 
              alt="Aceverse Logo" 
              className="h-10 w-auto object-contain mix-blend-multiply dark:mix-blend-normal dark:invert"
            />
            <span className="font-semibold text-xl tracking-tight hidden md:block dark:text-white">Aceverse</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button 
                key={link.label} 
                onClick={() => handleNavClick(link.page)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 group ${
                  currentPage === link.page 
                  ? 'text-black dark:text-white font-semibold' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {link.label}
                {link.hasDropdown && <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-6">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white uppercase tracking-wide border border-gray-200 dark:border-gray-800 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
                <Globe size={14} />
                {language === 'sv' ? 'SV' : 'EN'}
            </button>

            {user ? (
              <button 
                onClick={() => handleNavClick('dashboard')}
                className="bg-black dark:bg-white dark:text-black text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <LayoutDashboard size={16} />
                {t('nav.dashboard')}
              </button>
            ) : (
              <>
                <button 
                  onClick={() => handleNavClick('login')}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                >
                  {t('nav.login')}
                </button>
                <button 
                  onClick={() => handleNavClick('login')}
                  className="bg-black dark:bg-white dark:text-black text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  {t('nav.getStarted')}
                </button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
                onClick={toggleTheme}
                className="text-gray-900 dark:text-white"
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-white uppercase"
            >
                {language === 'sv' ? 'SV' : 'EN'}
            </button>
            <button 
                className="text-gray-900 dark:text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 p-6 lg:hidden flex flex-col gap-4 shadow-lg h-[calc(100vh-80px)] overflow-y-auto">
            {navLinks.map((link) => (
              <button 
                key={link.label} 
                onClick={() => handleNavClick(link.page)}
                className="text-left text-lg font-medium text-gray-900 dark:text-white py-3 border-b border-gray-50 dark:border-gray-800"
              >
                {link.label}
              </button>
            ))}
            <div className="flex flex-col gap-4 mt-4">
              {user ? (
                <button 
                  onClick={() => handleNavClick('dashboard')}
                  className="bg-black dark:bg-white dark:text-black text-white w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={16} />
                  {t('nav.dashboard')}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleNavClick('login')}
                    className="text-left text-lg font-medium text-gray-900 dark:text-white"
                  >
                    {t('nav.login')}
                  </button>
                  <button 
                    onClick={() => handleNavClick('login')}
                    className="bg-black dark:bg-white dark:text-black text-white w-full py-3 text-sm font-medium"
                  >
                    {t('nav.getStarted')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
