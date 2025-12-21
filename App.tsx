
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
import PageTransition from './components/PageTransition'; // Import Transition
import GlobalChatbot from './components/GlobalChatbot'; // Import Chatbot
import { Page, User } from './types';
import { db } from './services/db';
import { supabase } from './services/supabase';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Transition States
  const [transitionStage, setTransitionStage] = useState<'idle' | 'in' | 'out'>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await db.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // AUTO REDIRECT: If user is found, go directly to dashboard/onboarding
          if (user.onboardingCompleted) {
              setCurrentPage('dashboard');
          } else {
              setCurrentPage('onboarding');
          }
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Removed the artificial timeout delay to make auto-login feel instant
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const user = await db.getCurrentUser();
        if (user) setCurrentUser(user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        handleNavigation('home');
      }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  // New Navigation Handler with Transition
  const handleNavigation = (newPage: Page) => {
    if (newPage === currentPage || isTransitioning) return;

    setIsTransitioning(true);
    setTransitionStage('in');

    // 1. Wait for cover animation (600ms - Snappier)
    setTimeout(() => {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
      
      // 2. Start reveal animation
      setTransitionStage('out');

      // 3. Reset after reveal (600ms)
      setTimeout(() => {
        setTransitionStage('idle');
        setIsTransitioning(false);
      }, 600);
    }, 600);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.onboardingCompleted) {
        handleNavigation('dashboard');
    } else {
        handleNavigation('onboarding');
    }
  };

  const handleLogout = async () => {
    await db.logout();
    setCurrentUser(null);
    handleNavigation('home');
  };

  const handleOnboardingComplete = (updatedUser: User) => {
      setCurrentUser(updatedUser);
      handleNavigation('dashboard');
  };

  const renderPage = () => {
    if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-black text-gray-500 dark:text-gray-400 animate-pulse">Loading Aceverse...</div>;

    if (currentUser && !currentUser.onboardingCompleted && currentPage !== 'home') {
        return <Onboarding user={currentUser} onComplete={handleOnboardingComplete} />;
    }

    // Pass handleNavigation instead of setCurrentPage to all pages
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
          return <Onboarding user={currentUser} onComplete={handleOnboardingComplete} />;
      case 'login': 
        if (currentUser) {
            if (!currentUser.onboardingCompleted) return <Onboarding user={currentUser} onComplete={handleOnboardingComplete} />;
            return <Dashboard user={currentUser} onLogout={handleLogout} />;
        }
        return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
      case 'dashboard': 
        if (!currentUser) return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
        if (!currentUser.onboardingCompleted) return <Onboarding user={currentUser} onComplete={handleOnboardingComplete} />;
        return <Dashboard user={currentUser} onLogout={handleLogout} />;
      default: return <Home onNavigate={handleNavigation} />;
    }
  };

  const isInternalApp = (currentPage === 'dashboard' || currentPage === 'onboarding') || (currentPage === 'login' && currentUser);
  const showNavAndFooter = !isInternalApp && currentPage !== 'login';

  return (
    <div className="min-h-screen bg-white dark:bg-black selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black flex flex-col transition-colors duration-300">
      {/* Global Transition Overlay */}
      <PageTransition stage={transitionStage} />

      {showNavAndFooter && (
        <Navbar currentPage={currentPage} onNavigate={handleNavigation} user={currentUser} />
      )}
      
      <main key={currentPage} className="flex-1">
        {renderPage()}
      </main>

      {showNavAndFooter && (
        <Footer currentPage={currentPage} onNavigate={handleNavigation} />
      )}

      {/* Global UF-Coach Chatbot - Only visible when logged in */}
      {currentUser && (
        <GlobalChatbot user={currentUser} />
      )}
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
