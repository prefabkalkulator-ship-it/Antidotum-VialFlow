import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Calendar, Info, FlaskConical, Sparkles, Wallet, MessageSquare } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, pendingCount = 0 }: { isOpen: boolean; onClose: () => void; pendingCount?: number }) {
  const navItems = [
    { to: '/', icon: <Users size={20} />, label: 'Uczniowie' },
    { to: '/events', icon: <Calendar size={20} />, label: 'Wydarzenia' },
    { to: '/questions', icon: <MessageSquare size={20} />, label: 'Pytania & Komenty', badge: pendingCount },
    { to: '/coach', icon: <FlaskConical size={20} />, label: 'AI Trener' },
    { to: '/chat', icon: <Sparkles size={20} />, label: 'Asystent' },
    { to: '/finances', icon: <Wallet size={20} />, label: 'Finanse' },
    { to: '/info', icon: <Info size={20} />, label: 'Info' },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />}
      <div className={`fixed md:sticky top-0 h-screen w-64 bg-surface border-r border-gray-800 flex flex-col p-6 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-flask bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center shadow-[0_0_15px_rgba(244,114,182,0.3)]">
          <span className="font-heading font-bold text-background text-xl">A</span>
        </div>
        <span className="font-heading font-bold text-xl tracking-wider text-white">Antidotum</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/10 text-primary font-bold shadow-[inset_4px_0_0_0_rgba(244,114,182,1)]' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
            onClick={onClose}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </div>
            {!!item.badge && item.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-300">AD</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Admin</p>
            <p className="text-xs text-gray-500">Workspace</p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
