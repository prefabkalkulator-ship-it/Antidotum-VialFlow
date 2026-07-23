import React, { useState, useEffect } from 'react';
import { QrCode, ScanFace, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qrcode-logo';
import InstallPrompt from '../components/InstallPrompt';

export default function ReceptionTablet() {
  const [qrValue, setQrValue] = useState('');
  const [lastScannedChild, setLastScannedChild] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState(400);

  // Dynamiczne skalowanie QR w zależności od rozmiaru i orientacji ekranu
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width < 640) {
        // Telefony (pionowo)
        setQrSize(Math.min(260, width - 48));
      } else if (width < 1024) {
        // Tablety (pionowo/poziomo)
        const availableHeight = height - 200; // Szacowane wolne miejsce w pionie po nagłówku
        setQrSize(Math.min(340, width - 120, availableHeight));
      } else {
        // Desktopy / Duże ekrany
        setQrSize(400);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zmiana kodu QR co 10 sekund (Zabezpieczenie przed robieniem zdjęć kodów)
  useEffect(() => {
    const generateQr = () => {
      setQrValue(JSON.stringify({ 
        terminalId: 'REC-MAIN-1', 
        timestamp: Date.now(),
        action: 'check-in'
      }));
    };
    generateQr();
    const interval = setInterval(generateQr, 10000);
    return () => clearInterval(interval);
  }, []);

  // Short polling z backendu
  useEffect(() => {
    const pollCheckins = async () => {
      try {
        const res = await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/tablet/recent-checkins?terminalId=REC-MAIN-1');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setLastScannedChild(data[0].childName || "Uczeń");
            setTimeout(() => setLastScannedChild(null), 3000);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollCheckins, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0B0B0C] overflow-hidden">
      <InstallPrompt />
      
      {/* Panel boczny (nagłówek w widoku pionowym) */}
      <div className="w-full md:w-1/3 bg-surface border-b md:border-b-0 md:border-r border-gray-800 p-6 md:p-10 flex flex-col justify-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-white mb-2 md:mb-4">
          Witaj w <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">Antidotum</span>
        </h1>
        <p className="text-sm sm:text-base md:text-xl text-gray-400 font-sans leading-relaxed mb-4 md:mb-12">
          Przygotuj swoją aplikację mobilną i zeskanuj kod widoczny na ekranie, aby potwierdzić obecność.
        </p>

        <div className="flex items-center gap-4 bg-black/30 p-4 md:p-6 rounded-2xl border border-gray-800">
          <ScanFace size={32} className="text-primary" />
          <div>
            <h3 className="text-white font-bold font-sans text-base md:text-lg">System Szybkiej Odprawy</h3>
            <p className="text-gray-500 font-sans text-xs md:text-sm">Bezdotykowo. Bezpiecznie.</p>
          </div>
        </div>
      </div>

      {/* Główny obszar z kodem QR */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black p-6 md:p-12 relative">
        <div className="absolute top-4 right-4 md:top-10 md:right-10">
          <div className="px-4 py-2 bg-gray-900 rounded-full text-gray-500 font-mono text-xs md:text-sm border border-gray-800">
            Terminal: REC-MAIN-1
          </div>
        </div>

        <div className="bg-white p-6 sm:p-12 rounded-[30px] sm:rounded-[40px] shadow-[0_0_100px_rgba(244,114,182,0.15)] mb-6 md:mb-8 transform transition-transform hover:scale-105">
          <QRCode 
            value={qrValue} 
            size={qrSize} 
            qrStyle="dots" 
            eyeRadius={10} 
            fgColor="#0B0B0C"
            logoImage="https://cdn-icons-png.flaticon.com/512/25/25231.png" // Placeholder logo
            logoWidth={Math.round(qrSize * 0.2)}
            logoHeight={Math.round(qrSize * 0.2)}
            removeQrCodeBehindLogo={true}
          />
        </div>
        
        <div className="flex items-center gap-3 text-gray-400 mt-2 md:mt-4 animate-pulse">
          <QrCode size={20} />
          <span className="text-sm md:text-xl font-sans tracking-widest">KOD ODŚWIEŻANY CYKLICZNIE</span>
        </div>
      </div>

      {/* Pełnoekranowy Overlay na udany Check-in */}
      <div className={`fixed inset-0 bg-green-500/10 backdrop-blur-md z-50 flex flex-col items-center justify-center transition-all duration-500 ${lastScannedChild ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-[#18181B] border-2 border-green-500 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center transform scale-100 sm:scale-110 max-w-[90%] text-center">
          <CheckCircle2 size={64} className="text-green-500 mb-4 animate-bounce" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-heading">Obecność Zapisana!</h2>
          <p className="text-lg md:text-xl text-green-400 font-sans font-bold">{lastScannedChild}</p>
        </div>
      </div>
    </div>
  );
}
