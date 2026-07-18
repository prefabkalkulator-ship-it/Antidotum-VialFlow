import React, { useState, useEffect } from 'react';
import { QrCode, ScanFace, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qrcode-logo';
import InstallPrompt from '../components/InstallPrompt';

export default function ReceptionTablet() {
  const [qrValue, setQrValue] = useState('');
  const [lastScannedChild, setLastScannedChild] = useState<string | null>(null);

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
    <div className="flex h-screen bg-[#0B0B0C] overflow-hidden">
      <InstallPrompt />
      
      {/* Panel boczny z informacjami */}
      <div className="w-1/3 bg-surface border-r border-gray-800 p-10 flex flex-col justify-center relative">
        <h1 className="text-5xl font-heading font-bold text-white mb-4">
          Witaj w <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">Antidotum</span>
        </h1>
        <p className="text-xl text-gray-400 font-sans leading-relaxed mb-12">
          Przygotuj swoją aplikację mobilną i zeskanuj kod widoczny na ekranie, aby potwierdzić obecność.
        </p>

        <div className="flex items-center gap-4 bg-black/30 p-6 rounded-2xl border border-gray-800">
          <ScanFace size={32} className="text-primary" />
          <div>
            <h3 className="text-white font-bold font-sans text-lg">System Szybkiej Odprawy</h3>
            <p className="text-gray-500 font-sans">Bezdotykowo. Bezpiecznie.</p>
          </div>
        </div>

        {/* Overlay na udany Check-in */}
        <div className={`absolute inset-0 bg-green-500/10 backdrop-blur-md z-10 flex flex-col items-center justify-center transition-all duration-500 ${lastScannedChild ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-[#18181B] border-2 border-green-500 p-8 rounded-3xl shadow-2xl flex flex-col items-center transform scale-110">
            <CheckCircle2 size={64} className="text-green-500 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2 font-heading">Obecność Zapisana!</h2>
            <p className="text-xl text-green-400 font-sans font-bold">{lastScannedChild}</p>
          </div>
        </div>
      </div>

      {/* Główny obszar z kodem QR */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
        <div className="absolute top-10 right-10">
          <div className="px-4 py-2 bg-gray-900 rounded-full text-gray-500 font-mono text-sm border border-gray-800">
            Terminal: REC-MAIN-1
          </div>
        </div>

        <div className="bg-white p-12 rounded-[40px] shadow-[0_0_100px_rgba(244,114,182,0.15)] mb-8 transform transition-transform hover:scale-105">
          <QRCode 
            value={qrValue} 
            size={400} 
            qrStyle="dots" 
            eyeRadius={10} 
            fgColor="#0B0B0C"
            logoImage="https://cdn-icons-png.flaticon.com/512/25/25231.png" // Placeholder logo
            logoWidth={80}
            logoHeight={80}
            removeQrCodeBehindLogo={true}
          />
        </div>
        
        <div className="flex items-center gap-3 text-gray-400 mt-4 animate-pulse">
          <QrCode size={24} />
          <span className="text-xl font-sans tracking-widest">KOD ODŚWIEŻANY CYKLICZNIE</span>
        </div>
      </div>
    </div>
  );
}
