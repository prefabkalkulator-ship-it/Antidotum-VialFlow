import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Menu, FlaskConical } from 'lucide-react';
import Sidebar from './components/Sidebar';
import UsersPage from './pages/UsersPage';
import EventOrchestrator from './pages/EventOrchestrator';
import AiVideoCoach from './pages/AiVideoCoach';
import RagChat from './pages/RagChat';
import ReceptionTablet from './pages/ReceptionTablet';
import FinanceDashboard from './pages/FinanceDashboard';
import InstallPrompt from './components/InstallPrompt';

function InfoPlaceholder() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light mb-6">O Aplikacji</h1>
      <div className="bg-surface border border-gray-800 rounded-2xl p-6 md:p-8 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Antidotum Lab</h2>
        <p className="text-gray-400 mb-4">[Placeholder: Ten panel służy do zarządzania szkołą tańca Antidotum z wykorzystaniem sztucznej inteligencji. Pozwala organizować wydarzenia z pomocą asystenta oraz weryfikować zadania domowe.]</p>
      </div>
      <div className="bg-surface border border-gray-800 rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-4">Instrukcja Użytkownika</h2>
        <ul className="text-gray-400 list-decimal list-inside space-y-2">
          <li>Wybierz 'Uczniowie', aby wyświetlić listę z bazy danych.</li>
          <li>W zakładce 'Wydarzenia' możesz podyktować AI zarys imprezy.</li>
          <li>'AI Trener' to zautomatyzowane sprawdzanie choreografii klatka po klatce.</li>
          <li>W 'Asystent' znajdziesz czatbota wspierającego administrację.</li>
        </ul>
      </div>
    </div>
  );
}

import EventQuestions from './pages/EventQuestions';

function MainApp({ userEmail }: { userEmail: string }) {
  const location = useLocation();
  const isKioskMode = location.pathname === '/reception';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch('/api/events/questions/pending')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPendingCount(data.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden relative w-full">
      {!isKioskMode && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} pendingCount={pendingCount} />}
      
      <div className="flex-1 flex flex-col min-w-0">
        {!isKioskMode && (
          <div className="md:hidden flex items-center p-4 border-b border-gray-800 bg-surface shrink-0 z-30">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white hover:bg-gray-800 rounded-lg">
              <Menu size={24} />
            </button>
            <span className="ml-4 font-bold font-heading text-lg flex items-center gap-2">
              <FlaskConical className="text-primary" size={20} /> Antidotum Lab
            </span>
          </div>
        )}
        
        <main className="flex-1 overflow-auto relative w-full">
          <Routes>
            <Route path="/" element={<UsersPage />} />
            <Route path="/events" element={<EventOrchestrator />} />
            <Route path="/questions" element={<EventQuestions onCountChange={setPendingCount} />} />
            <Route path="/coach" element={<AiVideoCoach />} />
            <Route path="/chat" element={<RagChat />} />
            <Route path="/finances" element={<FinanceDashboard userEmail={userEmail} />} />
            <Route path="/reception" element={<ReceptionTablet />} />
            <Route path="/info" element={<InfoPlaceholder />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [promptActive, setPromptActive] = useState(false);

  useEffect(() => {
    if (showIntro && !promptActive) {
      const timer = setTimeout(() => setShowIntro(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showIntro, promptActive]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, pin: pinInput })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.role === 'Administrator' || data.role === 'Instruktor') {
          if (data.token) localStorage.setItem('jwtToken', data.token);
          setRole(data.role);
          setIsAuthenticated(true);
        } else {
          setError('Brak uprawnień dostępu do panelu (wymagany Admin/Instruktor).');
        }
      } else {
        setError(data.error || 'Błąd logowania');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    }
    setIsLoading(false);
  };

  if (showIntro || promptActive) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0B0C] flex flex-col items-center justify-center">
        <InstallPrompt onPromptActiveChange={setPromptActive} />
        <img 
          src="/assets/antidotum-intro.gif" 
          alt="Antidotum Intro" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-background items-center justify-center p-4">
        <div className="bg-surface border border-gray-800 p-8 rounded-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">Antidotum Lab</h1>
            <p className="text-gray-400 mt-2">Logowanie dla kadry</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Adres E-mail</label>
              <input 
                type="email" 
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">PIN</label>
              <input 
                type="password" 
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors tracking-widest text-center"
                placeholder="••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors mt-6"
            >
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <MainApp userEmail={loginInput} />
    </BrowserRouter>
  );
}
