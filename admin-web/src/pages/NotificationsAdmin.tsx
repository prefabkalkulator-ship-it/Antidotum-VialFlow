import React, { useState, useEffect } from 'react';
import { Bell, Clock, Users, User, Check } from 'lucide-react';

export default function NotificationsAdmin({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications/get')
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        if (onCountChange) {
          onCountChange(data.filter((n: any) => !n.isRead).length);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
      setNotifications(updated);
      if (onCountChange) {
        onCountChange(updated.filter(n => !n.isRead).length);
      }
    } catch (e) { console.error('Błąd oznaczania', e); }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    setMarkingAll(true);
    // Wykonaj wszystkie w tle asynchronicznie i czekaj na finał
    await Promise.all(unreadIds.map(id => 
      fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).catch(() => {})
    ));
    
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    if (onCountChange) onCountChange(0);
    setMarkingAll(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light flex items-center gap-3">
            <Bell className="text-primary" size={32} />
            Skrzynka Odbiorcza
          </h1>
          <p className="text-gray-400 mt-2">Ostatnie powiadomienia i wiadomości w systemie.</p>
        </div>
        
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className={`flex items-center gap-2 px-4 py-2 bg-surface border ${markingAll ? 'border-gray-800 opacity-70 cursor-not-allowed' : 'border-gray-700 hover:border-primary/50'} text-white rounded-lg transition-colors whitespace-nowrap`}
          >
            {markingAll ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Check size={18} className="text-green-400" />
            )}
            {markingAll ? 'Przetwarzanie...' : 'Oznacz wszystkie jako przeczytane'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 bg-surface border border-gray-800 rounded-2xl">
          <p className="text-gray-400">Brak powiadomień w systemie.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif, idx) => (
            <div key={idx} className={`border rounded-2xl p-5 transition-colors ${notif.isRead ? 'bg-surface/50 border-gray-800/50' : 'bg-surface border-gray-700 hover:border-primary/50'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-lg ${notif.isRead ? 'text-gray-400' : 'text-white'}`}>Wiadomość od: {notif.senderName || notif.sender || 'System'}</h3>
                <span className="text-xs text-gray-500 flex items-center gap-1 bg-background px-2 py-1 rounded-md">
                  <Clock size={12} /> {new Date(notif.date).toLocaleString('pl-PL')}
                </span>
              </div>
              <p className="text-gray-300 mb-4 whitespace-pre-wrap">{notif.content}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-800 pt-3">
                <div className="flex gap-4">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={14} className="text-primary" /> Temat/Kanał: <span className="font-medium text-gray-200">{notif.title || 'Brak tematu'}</span>
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users size={14} className="text-cyan-400" /> Adresat: <span className="font-medium text-gray-200">{Array.isArray(notif.targetGroups) ? notif.targetGroups.join(', ') : (notif.targetGroups || 'Wszyscy')}</span>
                  </span>
                </div>
                {!notif.isRead && (
                  <button 
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
                  >
                    <Check size={14} className="text-green-400" /> Oznacz przeczytane
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
