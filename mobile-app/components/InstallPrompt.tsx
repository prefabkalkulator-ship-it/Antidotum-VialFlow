import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Download, X } from 'lucide-react-native';

const COLORS = {
  primary: '#F472B6',
  background: '#0B0B0C',
  surface: '#18181B',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  success: '#10B981'
};

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
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

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
      <Modal transparent={false} animationType="fade">
        <View style={[styles.overlay, {backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20}]}>
           <ActivityIndicator size="large" color={COLORS.primary} style={{marginBottom: 20}} />
           <Text style={{color: COLORS.text, fontSize: 24, fontWeight: 'bold'}}>Trwa instalacja...</Text>
           <Text style={{color: COLORS.textMuted, marginTop: 15, textAlign: 'center', fontSize: 16}}>
             Proszę czekać, aplikacja jest dodawana do Twojego urządzenia.
           </Text>
        </View>
      </Modal>
    );
  }

  if (installState === 'installed') {
    return (
      <Modal transparent={false} animationType="fade">
        <View style={[styles.overlay, {backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20}]}>
           <Text style={{color: COLORS.text, fontSize: 32, fontWeight: 'bold', marginBottom: 20}}>Zainstalowano!</Text>
           <Text style={{color: COLORS.textMuted, textAlign: 'center', fontSize: 18, marginBottom: 40}}>
             Aplikacja została pomyślnie dodana do Twojego urządzenia. Możesz teraz zamknąć tę kartę.
           </Text>
           <TouchableOpacity 
             style={[styles.button, { width: '80%' }]} 
             onPress={() => {
               try { window.close(); } catch(e) {}
               if (typeof window !== 'undefined') window.location.href = 'about:blank';
             }}
           >
             <Text style={styles.buttonText}>OK, zamknij kartę</Text>
           </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (installState === 'instruction') {
    return (
      <Modal transparent={false} animationType="fade">
        <View style={[styles.overlay, {backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20}]}>
           <Text style={{color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20}}>Instrukcja dla iOS</Text>
           <Text style={{color: COLORS.textMuted, textAlign: 'center', fontSize: 18, lineHeight: 28}}>
             Aby zainstalować aplikację na iPhone/iPad:{"\n\n"}
             1. Tapnij ikonę Udostępnij (kwadrat ze strzałką w górę) w menu Safari na dole ekranu.{"\n"}
             2. Przewiń listę i wybierz "Do ekranu początkowego".{"\n\n"}
             Gdy to zrobisz, zamknij tę stronę i uruchom aplikację "Antidotum" z ekranu głównego.
           </Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.promptContainer}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 15, right: 15, zIndex: 10 }}
            onPress={handleContinue}
          >
            <X size={24} color="#888" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Download color={COLORS.primary} size={32} />
          </View>
          
          <Text style={styles.title}>Zainstaluj Aplikację</Text>
          <Text style={styles.desc}>
            Dodaj tę stronę do ekranu głównego telefonu/tabletu. Aplikacja będzie działać w trybie pełnoekranowym bez pasków przeglądarki.
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={handleInstallClick}>
            <Text style={styles.buttonText}>Zainstaluj teraz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333', marginTop: 10}]} onPress={handleContinue}>
            <Text style={[styles.buttonText, {color: COLORS.textMuted}]}>Kontynuuj w przeglądarce</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  promptContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, alignItems: 'center' },
  closeButton: { position: 'absolute', top: 15, right: 15, padding: 5 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(244,114,182,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  desc: { color: COLORS.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  button: { backgroundColor: COLORS.primary, width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
