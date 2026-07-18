import React, { useState, useEffect } from 'react';
import { Search, Users, UserPlus, ChevronDown, Activity, Settings, Check, Clock, Loader2 } from 'lucide-react';

// Types
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  groupId: string;
  status: string;
  email: string;
  rodo: string;
  notes: string;
  op1Name: string;
  op1Email: string;
  op1Phone: string;
  op2Name: string;
  op2Email: string;
  op2Phone: string;
  isAdult: boolean;
};

type PendingRegistration = {
  childId: string;
  parentName: string;
  email: string;
  childName: string;
};

const MOCK_PENDING_INITIAL: PendingRegistration[] = [];

export default function UsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pending, setPending] = useState<PendingRegistration[]>(MOCK_PENDING_INITIAL);
  const [eventBookings, setEventBookings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // States for Add/Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [addForm, setAddForm] = useState({
    firstName: '', lastName: '', birthDate: '', group: '',
    op1Name: '', op1Email: '', op1Phone: '',
    op2Name: '', op2Email: '', op2Phone: '',
    rodo: 'TAK', notes: ''
  });

  const [editForm, setEditForm] = useState<Student | null>(null);
  const [approvingIds, setApprovingIds] = useState<string[]>([]);
  const [approvingEvents, setApprovingEvents] = useState<number[]>([]);

  const fetchUsers = () => {
    Promise.all([
      fetch('http://localhost:3000/api/users').then(res => res.json()),
      fetch('http://localhost:3000/api/groups').then(res => res.json()),
      fetch('http://localhost:3000/api/events/bookings').then(res => res.json()),
      fetch('http://localhost:3000/api/events').then(res => res.json())
    ])
    .then(([usersData, groupsData, bookingsData, eventsData]) => {
      if (Array.isArray(usersData)) {
        const approvedStudentsMap = new Map<string, Student>();
        const pendingChildren: PendingRegistration[] = [];

        usersData.forEach(p => {
          const approvedKids = p.children.filter((c: any) => c.status !== 'Oczekujący');
          const pendingKids = p.children.filter((c: any) => c.status === 'Oczekujący');

          approvedKids.forEach((c: any) => {
            if (!approvedStudentsMap.has(c.id)) {
              approvedStudentsMap.set(c.id, {
                id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                birthDate: c.birthDate,
                groupId: c.groupId,
                status: c.status,
                email: c.email,
                rodo: c.rodo,
                notes: c.notes,
                op1Name: c.op1Name,
                op1Email: c.op1Email,
                op1Phone: c.op1Phone,
                op2Name: c.op2Name,
                op2Email: c.op2Email,
                op2Phone: c.op2Phone,
                isAdult: p.id.startsWith('adult-')
              });
            }
          });
          
          pendingKids.forEach((pk: any) => {
            if (!pendingChildren.find(c => c.childId === pk.id)) {
              pendingChildren.push({
                childId: pk.id,
                parentName: p.name,
                email: p.email,
                childName: `${pk.firstName} ${pk.lastName}`
              });
            }
          });
        });

        setStudents(Array.from(approvedStudentsMap.values()));
        setPending(pendingChildren);
      } else {
        setStudents([]);
        setPending([]);
      }
      
      if (Array.isArray(groupsData)) setGroups(groupsData);
      if (Array.isArray(bookingsData)) setEventBookings(bookingsData);
      if (Array.isArray(eventsData)) setEvents(eventsData);
    })
    .catch(err => {
      console.error('Błąd pobierania danych z backendu:', err);
      setStudents([]);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch('http://localhost:3000/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      if (!res.ok) throw new Error('Błąd serwera');
      setShowAddModal(false);
      setAddForm({
        firstName: '', lastName: '', birthDate: '', group: '',
        op1Name: '', op1Email: '', op1Phone: '',
        op2Name: '', op2Email: '', op2Phone: '',
        rodo: 'TAK', notes: ''
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Nie udało się dodać ucznia.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setIsAdding(true);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${editForm.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          birthDate: editForm.birthDate,
          group: editForm.groupId,
          studentEmail: editForm.email,
          op1Name: editForm.op1Name,
          op1Email: editForm.op1Email,
          op1Phone: editForm.op1Phone,
          op2Name: editForm.op2Name,
          op2Email: editForm.op2Email,
          op2Phone: editForm.op2Phone,
          rodo: editForm.rodo,
          notes: editForm.notes,
          status: editForm.status
        })
      });
      if (!res.ok) throw new Error('Błąd serwera');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Nie udało się zapisać zmian.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStudent = async (childId: string, childName: string) => {
    if (!window.confirm(`Czy na pewno chcesz trwale usunąć dane ucznia ${childName}? (Prawo do bycia zapomnianym - RODO). Operacji nie można cofnąć.`)) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/users/${childId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Błąd serwera');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Nie udało się usunąć ucznia.');
    }
  };

  const approveRegistration = async (childId: string, groupId: string) => {
    if (!groupId) {
      alert('Wybierz grupę docelową przed zatwierdzeniem.');
      return;
    }
    setApprovingIds(prev => [...prev, childId]);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${childId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      if (!res.ok) throw new Error('Błąd serwera');
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Błąd zatwierdzania.');
    } finally {
      setApprovingIds(prev => prev.filter(id => id !== childId));
    }
  };

  const approveEvent = async (sheetRow: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/events/bookings/${sheetRow}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Błąd serwera');
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Błąd zatwierdzania zapisu na obóz.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedStudent(prev => prev === id ? null : id);
  };

  const openEditModal = (student: Student) => {
    setEditForm({ ...student });
    setShowEditModal(true);
  };

  const generatePass = async (childId: string) => {
    const isConfirmed = window.confirm('Ta funkcja generuje nowy karnet dla ucznia. Czy na pewno chcesz potwierdzić?');
    if (!isConfirmed) return;

    try {
      const res = await fetch(`http://localhost:3000/api/payments/passes/generate/${childId}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Błąd serwera');
      }
      alert('Karnet został wygenerowany pomyślnie!');
    } catch (err: any) {
      console.error(err);
      alert(`Błąd generowania karnetu: ${err.message}`);
    }
  };

  const filteredStudents = students.filter(s => {
    const searchString = `${s.firstName} ${s.lastName} ${s.email} ${s.op1Name} ${s.op1Email} ${s.op1Phone} ${s.op2Name} ${s.op2Email} ${s.op2Phone}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-white flex items-center gap-3">
            <Users className="text-primary" size={32} />
            Baza Uczniów
          </h2>
          <p className="text-gray-400 font-sans">Zarządzaj uczniami i przypisanymi do nich kontaktami</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-light text-background px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(244,114,182,0.4)]"
        >
          <UserPlus size={20} />
          Dodaj Ucznia
        </button>
      </div>

      {/* Pending Registrations Widget */}
      {pending.length > 0 && (
        <div className="bg-gradient-to-r from-[#18181B] to-surface border border-primary/40 rounded-2xl p-6 mb-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-bold text-white font-heading mb-4 flex items-center gap-2">
            <Clock className="text-primary" size={20} /> Oczekujące Rejestracje z Aplikacji
          </h2>
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.childId} className="bg-black/40 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-white font-bold font-sans">{req.childName}</p>
                  <p className="text-sm text-gray-400 mt-1">Zgłaszający: <span className="text-white">{req.parentName} ({req.email})</span></p>
                  <p className="text-xs text-green-500 mt-1">Zgody RODO i Biometryczne (WORM) - Poprawne ✓</p>
                </div>
                <div className="flex gap-2 items-center">
                  <select 
                    id={`select-group-${req.childId}`}
                    className="bg-[#27272A] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-primary"
                  >
                    <option value="">Wybierz grupę...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const sel = document.getElementById(`select-group-${req.childId}`) as HTMLSelectElement;
                      approveRegistration(req.childId, sel.value);
                    }}
                    disabled={approvingIds.includes(req.childId)}
                    className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approvingIds.includes(req.childId) ? <><Loader2 className="animate-spin" size={16} /> Zatwierdzanie...</> : <><Check size={16} /> Zatwierdź</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Oczekujące zapisy na Obozy */}
      {eventBookings.filter(b => b.status === 'Oczekujący' || b.paymentStatus === 'Do Zapłaty').length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/40 to-surface border border-blue-500/40 rounded-2xl p-6 mb-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-bold text-white font-heading mb-4 flex items-center gap-2">
            <Activity className="text-blue-500" size={20} /> Zapisy na Wydarzenia / Płatności
          </h2>
          <div className="space-y-3">
            {eventBookings.filter(b => b.status === 'Oczekujący' || b.paymentStatus === 'Do Zapłaty').map((b, idx) => {
              const ev = events.find(e => e.id === b.eventId);
              const eventTitle = ev ? ev.title : b.eventId;
              const isApproved = b.status !== 'Oczekujący';
              
              return (
                <div key={`eb-${idx}`} className={`bg-black/40 border border-gray-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isApproved ? 'p-3 opacity-80' : 'p-4'}`}>
                  <div>
                    <p className="text-white font-bold font-sans">{b.childName}</p>
                    <p className={`text-gray-400 ${isApproved ? 'text-xs' : 'text-sm'} mt-1`}>Wydarzenie: <span className="text-white font-bold">{eventTitle}</span></p>
                    <p className="text-xs mt-1">
                      Status zapisu: <span className={b.status === 'Oczekujący' ? 'text-yellow-500' : 'text-green-500'}>{b.status}</span>
                      {' | '}
                      Status płatności: <span className={b.paymentStatus === 'Do Zapłaty' ? 'text-red-500' : 'text-green-500'}>{b.paymentStatus}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {!isApproved && (
                      <button 
                        onClick={() => approveEvent(b.sheetRow, 'Zatwierdzony')}
                        disabled={approvingEvents.includes(b.sheetRow)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approvingEvents.includes(b.sheetRow) ? <><Loader2 className="animate-spin" size={16} /> Zatwierdzanie...</> : <><Check size={16} /> Zatwierdź Zapis</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-surface rounded-2xl p-2 mb-8 border border-gray-800/50 flex items-center shadow-lg backdrop-blur-sm">
        <div className="pl-4 pr-2 text-gray-400">
          <Search size={20} />
        </div>
        <input 
          type="text"
          placeholder="Szukaj ucznia, e-maila, telefonu lub opiekuna..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none text-white outline-none p-3 placeholder-gray-500 font-sans"
        />
      </div>

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-surface rounded-2xl border border-gray-800 overflow-hidden transition-all duration-300 hover:border-gray-700">
            {/* Student Row */}
            <div 
              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 transition-colors ${!student.isAdult ? 'cursor-pointer hover:bg-white/5' : ''}`}
              onClick={() => { if (!student.isAdult) toggleExpand(student.id); }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-flask bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-background font-bold text-xl">
                  {student.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-sans">{student.firstName} {student.lastName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span>Grupa: <span className="text-primary-light">{student.groupId}</span></span>
                    {student.isAdult && student.email && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span>{student.email}</span>
                        {student.op1Phone && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{student.op1Phone}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); generatePass(student.id); }} 
                    className="px-3 py-1 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-colors"
                    title="Wygeneruj karnet w środku miesiąca"
                  >
                    Karnet
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(student); }} 
                    className="p-2 text-gray-400 hover:text-white transition-colors" 
                    title="Edytuj dane ucznia"
                  >
                    <Settings size={20} />
                  </button>
                </div>
                {!student.isAdult && (
                  <div className="text-gray-400 flex items-center gap-2">
                    <span className="text-sm">Opiekunowie</span>
                    <ChevronDown size={20} className={`transform transition-transform duration-300 ${expandedStudent === student.id ? 'rotate-180 text-primary' : ''}`} />
                  </div>
                )}
              </div>
            </div>

            {/* Parents Expanded Area (Only for Minors) */}
            {!student.isAdult && (
              <div 
                className={`transition-all duration-500 ease-in-out bg-black/40 border-t border-gray-800/50 ${
                  expandedStudent === student.id ? 'max-h-96 opacity-100 py-6 px-6' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <h4 className="text-primary-light font-bold font-heading flex items-center gap-2 mb-4">
                  <Users size={18} />
                  Informacje Kontaktowe (Opiekunowie)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.op1Name ? (
                    <div className="bg-surface/50 rounded-xl p-4 border border-gray-800/80">
                      <p className="font-bold text-white mb-1">Główny Opiekun: {student.op1Name}</p>
                      <p className="text-sm text-gray-400">E-mail: <span className="text-gray-300">{student.op1Email}</span></p>
                      <p className="text-sm text-gray-400">Tel: <span className="text-gray-300">{student.op1Phone}</span></p>
                    </div>
                  ) : (
                    <div className="bg-surface/50 rounded-xl p-4 border border-gray-800/80 opacity-50">
                      <p className="text-sm text-gray-400">Brak danych pierwszego opiekuna</p>
                    </div>
                  )}
                  
                  {student.op2Name ? (
                    <div className="bg-surface/50 rounded-xl p-4 border border-gray-800/80">
                      <p className="font-bold text-white mb-1">Drugi Opiekun: {student.op2Name}</p>
                      <p className="text-sm text-gray-400">E-mail: <span className="text-gray-300">{student.op2Email}</span></p>
                      <p className="text-sm text-gray-400">Tel: <span className="text-gray-300">{student.op2Phone}</span></p>
                    </div>
                  ) : (
                    <div className="bg-surface/50 rounded-xl p-4 border border-gray-800/80 opacity-50">
                      <p className="text-sm text-gray-400">Brak danych drugiego opiekuna</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Add Student */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold font-heading text-white mb-6">Rejestracja Ucznia</h2>
            
            <form onSubmit={handleAddStudent} className="space-y-6">
              <div>
                <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Dane Ucznia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required type="text" placeholder="Imię" value={addForm.firstName} onChange={e => setAddForm({...addForm, firstName: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input required type="text" placeholder="Nazwisko" value={addForm.lastName} onChange={e => setAddForm({...addForm, lastName: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input required type="date" placeholder="Data Urodzenia" style={{ colorScheme: 'dark' }} value={addForm.birthDate} onChange={e => setAddForm({...addForm, birthDate: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <select required value={addForm.group} onChange={e => setAddForm({...addForm, group: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary appearance-none">
                    <option value="" disabled>Wybierz Grupę</option>
                    {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Główny Opiekun (Opiekun 1)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required type="text" placeholder="Imię i Nazwisko" value={addForm.op1Name} onChange={e => setAddForm({...addForm, op1Name: e.target.value})} className="sm:col-span-2 bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input required type="email" placeholder="E-mail" value={addForm.op1Email} onChange={e => setAddForm({...addForm, op1Email: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input required type="text" placeholder="Telefon" value={addForm.op1Phone} onChange={e => setAddForm({...addForm, op1Phone: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                </div>
              </div>

              <div>
                <h3 className="text-gray-400 font-bold mb-3 border-b border-gray-800 pb-2">Drugi Opiekun (Opcjonalnie)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="Imię i Nazwisko" value={addForm.op2Name} onChange={e => setAddForm({...addForm, op2Name: e.target.value})} className="sm:col-span-2 bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input type="email" placeholder="E-mail" value={addForm.op2Email} onChange={e => setAddForm({...addForm, op2Email: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input type="text" placeholder="Telefon" value={addForm.op2Phone} onChange={e => setAddForm({...addForm, op2Phone: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                </div>
              </div>

              <div>
                <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Dodatkowe Informacje</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-white font-bold">Zgoda RODO i Wizerunek (WORM):</label>
                    <select value={addForm.rodo} onChange={e => setAddForm({...addForm, rodo: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary">
                      <option value="TAK">TAK</option>
                      <option value="NIE">NIE</option>
                    </select>
                  </div>
                  <textarea placeholder="Uwagi (np. alergie, odbiór przez babcię itp.)" value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} className="w-full bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary h-20 resize-none"></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={isAdding} className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {isAdding ? 'Zapisywanie...' : 'Zarejestruj Ucznia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Student */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold font-heading text-white mb-6 flex items-center gap-2">
              <Settings className="text-primary" /> Edycja Danych Ucznia
            </h2>
            
            <form onSubmit={handleEditStudent} className="space-y-6">
              <div>
                <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Dane Ucznia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required type="text" placeholder="Imię" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input required type="text" placeholder="Nazwisko" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <input required type="date" placeholder="Data Urodzenia" style={{ colorScheme: 'dark' }} value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  <select required value={editForm.groupId} onChange={e => setEditForm({...editForm, groupId: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary appearance-none">
                    <option value="" disabled>Wybierz Grupę</option>
                    {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              {!editForm.isAdult && (
                <>
                  <div>
                    <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Główny Opiekun (Opiekun 1)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" placeholder="Imię i Nazwisko" value={editForm.op1Name} onChange={e => setEditForm({...editForm, op1Name: e.target.value})} className="sm:col-span-2 bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                      <input type="email" placeholder="E-mail" value={editForm.op1Email} onChange={e => setEditForm({...editForm, op1Email: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                      <input type="text" placeholder="Telefon" value={editForm.op1Phone} onChange={e => setEditForm({...editForm, op1Phone: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-400 font-bold mb-3 border-b border-gray-800 pb-2">Drugi Opiekun (Opcjonalnie)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" placeholder="Imię i Nazwisko" value={editForm.op2Name} onChange={e => setEditForm({...editForm, op2Name: e.target.value})} className="sm:col-span-2 bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                      <input type="email" placeholder="E-mail" value={editForm.op2Email} onChange={e => setEditForm({...editForm, op2Email: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                      <input type="text" placeholder="Telefon" value={editForm.op2Phone} onChange={e => setEditForm({...editForm, op2Phone: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                    </div>
                  </div>
                </>
              )}

              {editForm.isAdult && (
                <div>
                  <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Dane Kontaktowe</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="email" placeholder="E-mail (Login)" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                    <input type="text" placeholder="Telefon" value={editForm.op1Phone} onChange={e => setEditForm({...editForm, op1Phone: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary" />
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-primary-light font-bold mb-3 border-b border-gray-800 pb-2">Dodatkowe Informacje</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-white font-bold">Zgoda RODO i Wizerunek (WORM):</label>
                    <select value={editForm.rodo} onChange={e => setEditForm({...editForm, rodo: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary">
                      <option value="TAK">TAK</option>
                      <option value="NIE">NIE</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-white font-bold">Status w systemie:</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary">
                      <option value="Aktywny">Aktywny</option>
                      <option value="Oczekujący">Oczekujący</option>
                      <option value="Nieaktywny">Nieaktywny</option>
                    </select>
                  </div>
                  <textarea placeholder="Uwagi (np. alergie, odbiór przez babcię itp.)" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full bg-background border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-primary h-20 resize-none"></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-b border-gray-800 pb-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={isAdding} className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {isAdding ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 text-center">
              <button 
                type="button"
                onClick={() => handleDeleteStudent(editForm.id, `${editForm.firstName} ${editForm.lastName}`)}
                className="text-red-500 hover:text-white bg-red-500/10 hover:bg-red-600 px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Trwale usuń ucznia (Prawo do bycia zapomnianym)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
