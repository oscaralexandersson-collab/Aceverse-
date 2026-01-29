
import React, { useState, useEffect, useCallback } from 'react';
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
import Intelligence from './pages/Intelligence';
import PageTransition from './components/PageTransition';
import GlobalChatbot from './components/GlobalChatbot';
import { Page, User } from './types';
import { db } from './services/db';
import { supabase } from './services/supabase';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'in' | 'out'>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Connection State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncTrigger, setSyncTrigger] = useState(0);

  // --- 1. SESSION RECOVERY & INITIAL LOAD ---
  const loadUser = useCallback(async () => {
    try {
      const user = await db.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Only redirect if we are on landing/auth pages
        if (currentPage === 'home' || currentPage === 'login') {
          if (user.onboardingCompleted) {
            setCurrentPage('dashboard');
          } else {
            setCurrentPage('onboarding');
          }
        }
      } else {
        // Only clear if we actually expected a user but got none
        if (localStorage.getItem('aceverse-auth-token')) {
             console.warn("Token exists but no user found - session likely expired");
        }
      }
    } catch (e) {
      console.error("Load user failed", e);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadUser();

    // Supabase Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser();
        // Trigger a data refresh in children
        setSyncTrigger(prev => prev + 1); 
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentPage('home');
        localStorage.removeItem('aceverse-auth-token');
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  // --- 2. CONNECTION & WAKE-UP LISTENERS ---
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network back online. Reconnecting...");
      setIsOnline(true);
      setSyncTrigger(prev => prev + 1); // Force dashboard refresh
      loadUser(); // Re-verify session
    };

    const handleOffline = () => {
      console.log("Network lost.");
      setIsOnline(false);
    };

    const handleFocus = () => {
        // When tab comes into focus (e.g. laptop wake), check health
        if (document.visibilityState === 'visible') {
            console.log("Tab focused. Checking session health...");
            db.checkHealth().then(healthy => {
                if (!healthy) {
                    console.warn("Health check failed on focus. Retrying load...");
                    setSyncTrigger(prev => prev + 1);
                }
            });
        }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadUser]);

  // --- 3. HEARTBEAT (KEEP-ALIVE) ---
  useEffect(() => {
    // Ping database every 2 minutes to keep connection warm and detect silent drops
    const heartbeat = setInterval(async () => {
        if (!currentUser) return;
        const isHealthy = await db.checkHealth();
        if (!isHealthy && navigator.onLine) {
            console.warn("Heartbeat missed. Triggering refresh...");
            setSyncTrigger(prev => prev + 1);
        }
    }, 2 * 60 * 1000); 

    return () => clearInterval(heartbeat);
  }, [currentUser]);


  const handleNavigation = (newPage: Page) => {
    if (newPage === currentPage || isTransitioning) return;
    setIsTransitioning(true);
    setTransitionStage('in');
    
    // Increased duration before switch to allow longer transition to be visible (800ms)
    setTimeout(() => {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
      setTransitionStage('out');
      setTimeout(() => {
        setTransitionStage('idle');
        setIsTransitioning(false);
      }, 900); // Wait for the 1000ms animation to finish
    }, 800);
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
        }, 900);
    }, 800);
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
      case 'intelligence': return <Intelligence onNavigate={handleNavigation} />;
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
        if (currentUser) return <Dashboard user={currentUser} onLogout={handleLogout} syncTrigger={syncTrigger} />;
        return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
      case 'dashboard': 
        if (!currentUser) return <Login onLogin={handleLogin} onBack={() => handleNavigation('home')} />;
        return <Dashboard user={currentUser} onLogout={handleLogout} syncTrigger={syncTrigger} />;
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
      {/* user property passed to satisfy NavProps for Footer */}
      {showNav && <Footer currentPage={currentPage} onNavigate={handleNavigation} user={currentUser} />}
      {currentUser && <GlobalChatbot user={currentUser} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
