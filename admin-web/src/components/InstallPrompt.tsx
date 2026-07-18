import React, { useState, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';

export default function InstallPrompt({ onPromptActiveChange }: { onPromptActiveChange?: (active: boolean) => void }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'instruction' | 'installed'>('idle');

  useEffect(() => {
    if (onPromptActiveChange) {
      onPromptActiveChange(showPrompt || installState !== 'idle');
    }
  }, [showPrompt, installState, onPromptActiveChange]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      let isDismissed = false;
      try { isDismissed = sessionStorage.getItem('installPromptDismissed') === 'true'; } catch(err) {}
      if (!window.matchMedia('(display-mode: standalone)').matches && !isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIos() && !isInStandaloneMode()) {
      let isDismissed = false;
      try { isDismissed = sessionStorage.getItem('installPromptDismissed') === 'true'; } catch(err) {}
      if (!isDismissed) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstallState('installing');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setTimeout(() => {
          setInstallState('installed');
        }, 5000);
      } else {
        setInstallState('idle');
      }
      setDeferredPrompt(null);
    } else {
      setInstallState('instruction');
    }
  };

  const handleContinue = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('installPromptDismissed', 'true');
      }
    } catch (e) {}
    setShowPrompt(false);
    setInstallState('idle');
  };

  if (!showPrompt && installState === 'idle') return null;

  if (installState === 'installing') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <Loader2 size={64} className="text-primary animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Trwa instalacja...</h2>
          <p className="text-gray-400">Proszę czekać, aplikacja jest dodawana do Twojego urządzenia.</p>
        </div>
      </div>
    );
  }

  if (installState === 'installed') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-3xl font-bold text-white mb-4">Zainstalowano!</h2>
          <p className="text-gray-400 mb-8 text-lg leading-relaxed">
            Aplikacja została dodana do Twojego urządzenia. Możesz teraz bezpiecznie zamknąć tę kartę.
          </p>
          <button 
            onClick={() => {
              try { window.close(); } catch(e) {}
              window.location.href = 'about:blank';
            }}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-colors text-lg"
          >
            OK, zamknij kartę
          </button>
        </div>
      </div>
    );
  }

  if (installState === 'instruction') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-bold text-white mb-4">Instrukcja dla iOS</h2>
          <p className="text-gray-400 mb-6 text-lg leading-relaxed">
            Aby zainstalować aplikację na iPhone/iPad:<br/><br/>
            1. Tapnij ikonę <strong>Udostępnij</strong> (kwadrat ze strzałką w górę) w menu przeglądarki Safari na dole ekranu.<br/>
            2. Przewiń listę i wybierz <strong>Do ekranu początkowego</strong>.<br/><br/>
            Gdy to zrobisz, zamknij tę stronę i uruchom aplikację "Antidotum" z ekranu głównego.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="relative bg-[#1A1A1D] border border-gray-800 rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl">
        <button 
          onClick={handleContinue}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Download size={32} className="text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">Zainstaluj Aplikację</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Dodaj tę stronę do ekranu głównego telefonu/tabletu. Aplikacja będzie działać w trybie pełnoekranowym bez pasków przeglądarki.
        </p>
        
        <button 
          onClick={handleInstallClick}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-colors text-lg mb-3"
        >
          Zainstaluj teraz
        </button>
        <button 
          onClick={handleContinue}
          className="w-full bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-400 font-bold py-3 px-6 rounded-xl transition-colors text-lg"
        >
          Kontynuuj w przeglądarce
        </button>
      </div>
    </div>
  );
}
