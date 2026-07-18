import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, TrendingUp, AlertTriangle, Play, FileSpreadsheet, Info, X, Loader2, CheckCircle2 } from 'lucide-react';

export default function FinanceDashboard({ userEmail = '' }: { userEmail?: string }) {
  const [activeTab, setActiveTab] = useState<'karnety' | 'okazjonalne'>('karnety');
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txStudent, setTxStudent] = useState('');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txMethod, setTxMethod] = useState('Gotówka');
  const [txHandledBy, setTxHandledBy] = useState(userEmail);
  const [txStatus, setTxStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [students, setStudents] = useState<{id: string, name: string}[]>([]);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [pendingPasses, setPendingPasses] = useState<any[]>([]);
  const [allPasses, setAllPasses] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [activePassesCount, setActivePassesCount] = useState(0);
  const [unpaidPassesTotal, setUnpaidPassesTotal] = useState(0);

  const [txType, setTxType] = useState<'Karnet' | 'Wydarzenie'>('Karnet');
  const [selectedEventSheetRow, setSelectedEventSheetRow] = useState<number | null>(null);
  const [selectedPassSheetRow, setSelectedPassSheetRow] = useState<number | null>(null);

  const normalizedTxStudent = txStudent.trim().toLowerCase();
  const currentChildId = students.find(s => s.name.toLowerCase() === normalizedTxStudent)?.id;

  const loadData = () => {
    Promise.all([
      fetch('http://localhost:3000/api/users').then(res => res.json()),
      fetch('http://localhost:3000/api/events/bookings').then(res => res.json()),
      fetch('http://localhost:3000/api/events').then(res => res.json()),
      fetch('http://localhost:3000/api/payments/passes/all').then(res => res.json()),
      fetch('http://localhost:3000/api/payments/history').then(res => res.json())
    ])
    .then(([usersData, bookingsData, eventsData, passesData, historyData]) => {
      if (Array.isArray(usersData)) {
        const allKidsMap = new Map();
        usersData.forEach((p: any) => {
          if (p.children && Array.isArray(p.children)) {
            p.children.forEach((c: any) => {
              allKidsMap.set(c.id, { id: c.id, name: `${c.firstName} ${c.lastName}`.trim() });
            });
          } else if (p.role === 'Uczen_Dorosly') {
            allKidsMap.set(p.id, { id: p.id, name: `${p.firstName} ${p.lastName}`.trim() });
          }
        });
        setStudents(Array.from(allKidsMap.values()));
      }
      
      if (Array.isArray(bookingsData)) {
        setPendingEvents(bookingsData.filter(b => b.paymentStatus === 'Do Zapłaty'));
      }
      
      if (Array.isArray(eventsData)) {
        setEventsList(eventsData);
      }

      if (Array.isArray(passesData)) {
        setAllPasses(passesData);
        setPendingPasses(passesData.filter(p => p.status === 'Do Zapłaty'));
        const active = passesData.filter(p => p.status === 'Opłacony' || p.status === 'Aktywny').length;
        setActivePassesCount(active);
        const unpaidTotal = passesData.filter(p => p.status === 'Do Zapłaty').reduce((sum, p) => sum + Number(p.price || 0), 0);
        setUnpaidPassesTotal(unpaidTotal);
      }

      if (Array.isArray(historyData)) {
        setPaymentHistory(historyData);
        const currentMonthStr = new Date().toLocaleString('pl-PL', { month: '2-digit', year: 'numeric' });
        const revenue = historyData.filter(h => h.date && h.date.includes(currentMonthStr)).reduce((sum, h) => sum + Number(h.amount || 0), 0);
        setMonthlyRevenue(revenue);
      }
    })
    .catch(err => console.error('Błąd pobierania danych', err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxStatus('loading');
    try {
      const computedChildId = currentChildId || 'MANUAL';
      
      let apiUrl = 'http://localhost:3000/api/payments/add';
      
      if (txType === 'Wydarzenie' && selectedEventSheetRow) {
        apiUrl = `http://localhost:3000/api/events/bookings/${selectedEventSheetRow}/pay`;
      } else if (txType === 'Karnet' && selectedPassSheetRow) {
        apiUrl = `http://localhost:3000/api/payments/passes/${currentChildId}/pay`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: computedChildId,
          childName: txStudent,
          amount: parseFloat(txAmount),
          title: txTitle,
          type: txType,
          method: txMethod,
          status: 'Zakończona',
          handledByEmail: txHandledBy,
          sheetRow: txType === 'Wydarzenie' ? selectedEventSheetRow : selectedPassSheetRow
        })
      });

      if (!res.ok) throw new Error('Błąd dodawania transakcji');
      setTxStatus('success');
      loadData(); // Odświeżenie danych po wpłacie
      setTimeout(() => {
        setShowTransactionModal(false);
        setTxStatus('idle');
        setTxStudent('');
        setTxTitle('');
        setTxAmount('');
        setTxHandledBy(userEmail);
        setSelectedEventSheetRow(null);
        setSelectedPassSheetRow(null);
        setTxType('Karnet');
      }, 2000);
    } catch (err) {
      console.error(err);
      setTxStatus('error');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light mb-2">
            Finanse & Księgowość
          </h1>
          <p className="text-gray-400 font-sans">
            Integracja Google Sheets dla wpłat z aplikacji i wpłat własnych.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold font-sans transition-all shadow-[0_0_15px_rgba(244,114,182,0.3)] w-full sm:w-auto"
          >
            + Zarejestruj Wpłatę
          </button>
          
          <a 
            href="https://docs.google.com/spreadsheets/d/1TuWdBscC14BSZmQaxRKPAg1K2njDis5PD1IVUi1j5ME" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600/20 text-green-500 hover:bg-green-600/30 px-6 py-3 rounded-xl font-bold font-sans transition-all border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)] w-full sm:w-auto"
          >
            <FileSpreadsheet size={20} />
            Otwórz Arkusz
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface border border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm">Przychód (Miesiąc)</h3>
            <Wallet className="text-primary" size={24} />
          </div>
          <p className="text-3xl font-heading font-bold text-white mb-2">{monthlyRevenue.toLocaleString('pl-PL')} PLN</p>
          <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
            Aktualny miesiąc na żywo z Arkusza
          </div>
        </div>

        <div className="bg-surface border border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm">Aktywne Karnety</h3>
            <CreditCard className="text-blue-400" size={24} />
          </div>
          <p className="text-3xl font-heading font-bold text-white mb-2">{activePassesCount}</p>
          <p className="text-gray-500 text-sm">Opłaconych w terminie</p>
        </div>

        <div className="bg-surface border border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl border-t-4 border-t-red-500">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm">Zaległości</h3>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <p className="text-3xl font-heading font-bold text-white mb-2">{unpaidPassesTotal.toLocaleString('pl-PL')} PLN</p>
          <button onClick={() => alert('Użyj narzędzi cron do wysyłki')} className="text-red-500 font-bold text-sm text-left hover:text-red-400 underline">
            Wyślij powiadomienia Push
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full md:w-auto bg-[#18181B] rounded-xl p-1 border border-gray-800 shadow-inner mb-6 flex-col sm:flex-row">
        <button 
          onClick={() => setActiveTab('karnety')}
          className={`flex-1 sm:flex-none px-4 md:px-8 py-3 rounded-lg font-bold font-sans transition-all text-center ${activeTab === 'karnety' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Karnety Uczniów
        </button>
        <button 
          onClick={() => setActiveTab('okazjonalne')}
          className={`flex-1 sm:flex-none px-4 md:px-8 py-3 rounded-lg font-bold font-sans transition-all text-center ${activeTab === 'okazjonalne' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Ostatnie Transakcje
        </button>
      </div>

      {/* Content */}
      <div className="bg-surface border border-gray-800 rounded-2xl p-6 shadow-xl animate-fade-in">
        {activeTab === 'karnety' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3 font-medium">Uczeń</th>
                  <th className="pb-3 font-medium">Grupa</th>
                  <th className="pb-3 font-medium">Typ Karnetu</th>
                  <th className="pb-3 font-medium">Ważny do</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {allPasses.map((pass, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-[#18181B] transition-colors">
                    <td className="py-4 text-white font-bold">{pass.childName}</td>
                    <td className="py-4 text-gray-300">{pass.group}</td>
                    <td className="py-4 text-gray-300">{pass.variant} ({pass.price} PLN)</td>
                    <td className={`py-4 ${pass.status === 'Do Zapłaty' ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{pass.validUntil}</td>
                    <td className="py-4">
                      {pass.status === 'Do Zapłaty' ? (
                        <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30 flex items-center gap-1 w-max">
                          <AlertTriangle size={12} /> Zalega
                        </span>
                      ) : (
                        <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">
                          {pass.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {allPasses.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Brak karnetów w systemie</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'okazjonalne' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-gray-800">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Uczeń</th>
                  <th className="pb-3 font-medium">Tytuł</th>
                  <th className="pb-3 font-medium">Kwota</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.slice().reverse().map((tx, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-[#18181B] transition-colors">
                    <td className="py-4 text-gray-300">{tx.date}</td>
                    <td className="py-4 text-white font-bold">{tx.childName}</td>
                    <td className="py-4 text-gray-300">{tx.title} <span className="text-gray-500 text-xs">({tx.method})</span></td>
                    <td className="py-4 text-primary font-bold">{tx.amount} PLN</td>
                    <td className="py-4">
                      <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">
                        {tx.status || 'Zakończona'}
                      </span>
                    </td>
                  </tr>
                ))}
                {paymentHistory.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Brak historii transakcji</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-[#0B0B0C] p-4 rounded-xl border border-gray-800 text-sm text-gray-400 flex items-start gap-3">
        <Info className="text-blue-500 shrink-0" size={18} />
        <p>Ta strona pobiera i zapisuje dane z połączonego Arkusza Google "Antidotum_Payments_DB". Zarejestrowane wpłaty automatycznie pojawiają się w arkuszu oraz w aplikacji rodziców.</p>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowTransactionModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 font-heading">Rejestruj Wpłatę</h2>
            
            {txStatus === 'success' ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="text-green-500 mb-4" size={64} />
                <h3 className="text-xl font-bold text-white mb-2">Pomyślnie Zapisano!</h3>
                <p className="text-gray-400 text-center">Transakcja została wysłana do Księgi Głównej (Arkusz Google).</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterTransaction} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Imię i Nazwisko Ucznia</label>
                  <input 
                    required 
                    list="student-search-list"
                    type="text" 
                    value={txStudent} 
                    onChange={e => setTxStudent(e.target.value)} 
                    placeholder="Wyszukaj z bazy..." 
                    className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" 
                  />
                  <datalist id="student-search-list">
                    {students.map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Typ Płatności</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-white">
                      <input type="radio" name="txType" value="Karnet" checked={txType === 'Karnet'} onChange={() => { setTxType('Karnet'); setTxTitle(''); setTxAmount(''); setSelectedPassSheetRow(null); }} /> Karnet / Dowolna
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input type="radio" name="txType" value="Wydarzenie" checked={txType === 'Wydarzenie'} onChange={() => { setTxType('Wydarzenie'); setTxTitle(''); setTxAmount(''); setSelectedEventSheetRow(null); }} /> Opłata za Wydarzenie
                    </label>
                  </div>
                </div>

                {txType === 'Wydarzenie' && currentChildId && (
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Wybierz zaległe wydarzenie</label>
                    <select 
                      className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none"
                      onChange={e => {
                        const row = Number(e.target.value);
                        setSelectedEventSheetRow(row);
                        const ev = pendingEvents.find(b => b.sheetRow === row);
                        if (ev) {
                          const eventDetails = eventsList.find(e => e.id === ev.eventId);
                          setTxTitle(eventDetails ? eventDetails.title : ev.eventId);
                        }
                      }}
                      value={selectedEventSheetRow || ''}
                      required
                    >
                      <option value="" disabled>-- Wybierz wydarzenie ucznia --</option>
                      {pendingEvents.filter(b => b.childId === currentChildId).map(b => {
                        const eventDetails = eventsList.find(e => e.id === b.eventId);
                        const displayTitle = eventDetails ? eventDetails.title : b.eventId;
                        return (
                          <option key={b.sheetRow} value={b.sheetRow}>{displayTitle} (Zapis z: {b.timestamp})</option>
                        );
                      })}
                    </select>
                  </div>
                )}
                
                {txType === 'Karnet' && currentChildId && (
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Wybierz zaległy karnet (opcjonalnie)</label>
                    <select 
                      className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none"
                      onChange={e => {
                        const row = Number(e.target.value);
                        if (row === 0) {
                           setSelectedPassSheetRow(null);
                           setTxTitle('');
                           setTxAmount('');
                           return;
                        }
                        setSelectedPassSheetRow(row);
                        const pass = pendingPasses.find(p => p.sheetRow === row);
                        if (pass) {
                          setTxTitle(pass.variant);
                          setTxAmount(pass.price || '150');
                        }
                      }}
                      value={selectedPassSheetRow || 0}
                    >
                      <option value={0}>-- Inna płatność (Dowolna kwota) --</option>
                      {pendingPasses.filter(p => p.childId === currentChildId).map(p => (
                        <option key={p.sheetRow} value={p.sheetRow}>{p.variant} (Termin: {p.validUntil} - {p.price} PLN)</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Tytuł Wpłaty (Na co)</label>
                  <input required type="text" value={txTitle} onChange={e => setTxTitle(e.target.value)} placeholder={txType === 'Wydarzenie' ? "np. Obóz Letni (wybierz wyżej by uzupełnić ID)" : "np. Karnet Lipiec, Strój Turniejowy"} className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-400 mb-2">Kwota (PLN)</label>
                    <input required type="number" step="0.01" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-400 mb-2">Metoda</label>
                    <select value={txMethod} onChange={e => setTxMethod(e.target.value)} className="w-full bg-background border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none">
                      <option value="Gotówka">Gotówka</option>
                      <option value="Przelew Bankowy">Przelew Bankowy</option>
                      <option value="Karta">Karta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 font-bold text-sm">Pracownik przyjmujący (E-mail)</label>
                  <input type="email" required placeholder="np. instruktor@antidotum.pl" className="w-full bg-background border border-gray-700 rounded-xl p-3 text-white focus:border-primary outline-none" value={txHandledBy} onChange={e => setTxHandledBy(e.target.value)} />
                </div>

                {txStatus === 'error' && (
                  <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-lg flex items-center gap-2 text-red-500 text-sm font-bold">
                    <AlertTriangle size={16} /> Błąd podczas łączenia z API.
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={txStatus === 'loading'}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl mt-6 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {txStatus === 'loading' ? <><Loader2 className="animate-spin" size={20} /> Zapisywanie...</> : 'Zapisz do Księgi'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
