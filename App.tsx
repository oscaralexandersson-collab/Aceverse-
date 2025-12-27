
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Product from './pages/Product';
import Solutions from './pages/Solutions';
import SecurityPage from './pages/Security';
import Customers from './pages/Customers';
import Careers from './pages/Careers';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contact from './pages/Contact';
import About from './pages/About';
import Onboarding from './pages/Onboarding';
import PageTransition from './components/PageTransition';
import GlobalChatbot from './components/GlobalChatbot';
import { Page, User } from './types';
import { db } from './services/db';
import { supabase } from './services/supabase';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'in' | 'out'>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        const user = await db.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          if (user.onboardingCompleted) {
            setCurrentPage('dashboard');
          } else {
            setCurrentPage('onboarding');
          }
        } else {
          // No user found, just stay on home
          setCurrentPage('home');
        }
      } catch (e) {
        console.error("Initial load failed", e);
        setCurrentPage('home');
      } finally {
        // Essential: must hide loading even if DB fails
        setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const user = await db.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // If already on home/login, push to dashboard/onboarding
          if (currentPage === 'home' || currentPage === 'login') {
            if (user.onboardingCompleted) setCurrentPage('dashboard');
            else setCurrentPage('onboarding');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentPage('home');
        localStorage.removeItem('aceverse-auth-token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigation = (newPage: Page) => {
    if (newPage === currentPage || isTransitioning) return;
    setIsTransitioning(true);
    setTransitionStage('in');
    setTimeout(() => {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
      setTransitionStage('out');
      setTimeout(() => {
        setTransitionStage('idle');
        setIsTransitioning(false);
      }, 600);
    }, 600);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.onboardingCompleted) handleNavigation('dashboard');
    else handleNavigation('onboarding');
  };

  const handleLogout = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTransitionStage('in');
    
    // Start transition, then logout
    setTimeout(async () => {
        await db.logout();
        setCurrentUser(null);
        setCurrentPage('home');
        window.scrollTo(0, 0);
        
        setTransitionStage('out');
        setTimeout(() => {
            setTransitionStage('idle');
            setIsTransitioning(false);
        }, 600);
    }, 600);
  };

  const renderPage = () => {
    if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold tracking-widest uppercase opacity-50">Aceverse...</p>
      </div>
    );

    // If logged in but not finished onboarding, force them there (unless on Home)
    if (currentUser && !currentUser.onboardingCompleted && currentPage !== 'home' && currentPage !== 'login') {
      return <Onboarding user={currentUser} onComplete={(u) => { setCurrentUser(u); handleNavigation('dashboard'); }} />;
    }

    switch (currentPage) {
      case 'home': return <Home onNavigate={handleNavigation} />;
      case 'product': return <Product onNavigate={handleNavigation} />;
      case 'solutions': return <Solutions onNavigate={handleNavigation} />;
      case 'security': return <SecurityPage />;
      case 'customers': return <Customers />;
      case 'careers': return <Careers />;
      case 'contact': return <Contact />;
      case 'about': return <About onNavigate={handleNavigation} />;
      case 'onboarding': 
        if (!currentUser) return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
        return <Onboarding user={currentUser} onComplete={(u) => { setCurrentUser(u); handleNavigation('dashboard'); }} />;
      case 'login': 
        if (currentUser) return <Dashboard user={currentUser} onLogout={handleLogout} />;
        return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
      case 'dashboard': 
        if (!currentUser) return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
        return <Dashboard user={currentUser} onLogout={handleLogout} />;
      default: return <Home onNavigate={handleNavigation} />;
    }
  };

  const isInternal = (currentPage === 'dashboard' || currentPage === 'onboarding');
  const showNav = !isInternal && currentPage !== 'login';

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col transition-colors duration-300">
      <PageTransition stage={transitionStage} />
      {showNav && <Navbar currentPage={currentPage} onNavigate={handleNavigation} user={currentUser} />}
      <main className="flex-1">{renderPage()}</main>
      {showNav && <Footer currentPage={currentPage} onNavigate={handleNavigation} />}
      {currentUser && <GlobalChatbot user={currentUser} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
