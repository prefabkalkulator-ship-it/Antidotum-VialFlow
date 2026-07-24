import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FlaskConical, Activity, Loader2, UploadCloud, CheckCircle2, AlertTriangle, Medal, Play, Send, CheckSquare, XCircle, ChevronDown, Search } from 'lucide-react';

interface Choreography {
  id: string;
  title: string;
  instructor: string;
  level: string;
}

interface AnalysisReport {
  score: number;
  timingAccuracy: number;
  postureAccuracy: number;
  feedback: string[];
}

interface Student {
  id: string;
  name: string;
  groupName: string;
}

export default function AiVideoCoach() {
  const [viewMode, setViewMode] = useState<'homework' | 'manual'>('homework');
  
  // Ręczna analiza (stare stany)
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [selectedChoreoId, setSelectedChoreoId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // Zadania Domowe (nowe stany)
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState('');
  const [showStudentSearchModal, setShowStudentSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrowanie Tabeli
  const [tableFilter, setTableFilter] = useState('all');
  const [showTableSearchModal, setShowTableSearchModal] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  
  const [groups, setGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Nowe stany dynamicznych zadań i wyników
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [selectedActiveTaskId, setSelectedActiveTaskId] = useState<string>('');
  const [homeworkResults, setHomeworkResults] = useState<any[]>([]);
  const [refLink, setRefLink] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [isLoadingHomework, setIsLoadingHomework] = useState(false);

  const fetchTasksAndResults = async () => {
    setIsLoadingHomework(true);
    try {
      const tasksRes = await fetch('http://localhost:3000/api/coach/tasks');
      const tasksData = await tasksRes.json();
      if (Array.isArray(tasksData)) {
        setActiveTasks(tasksData);
        if (tasksData.length > 0 && !selectedActiveTaskId) {
          setSelectedActiveTaskId(tasksData[0].id);
        }
      }

      const resultsRes = await fetch('http://localhost:3000/api/coach/homework/results');
      const resultsData = await resultsRes.json();
      if (Array.isArray(resultsData)) {
        setHomeworkResults(resultsData);
      }
    } catch (err) {
      console.error('Błąd pobierania zadań i wyników:', err);
    } finally {
      setIsLoadingHomework(false);
    }
  };

  useEffect(() => {
    fetch('http://localhost:3000/api/coach/choreographies')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChoreographies(data);
          if (data.length > 0) setSelectedChoreoId(data[0].id);
        } else {
          console.error('Expected choreographies to be array, got:', data);
          setChoreographies([]);
        }
      })
      .catch(e => {
        console.error('Error fetching choreographies:', e);
        setChoreographies([]);
      });

    fetch('http://localhost:3000/api/groups')
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(e => {
        console.error('Error fetching groups:', e);
        setGroups([]);
      });

    fetch('http://localhost:3000/api/users')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const allKids: Student[] = [];
          data.forEach(p => {
            if (p.children && Array.isArray(p.children)) {
              p.children.forEach((c: any) => allKids.push({
                id: c.id,
                name: `${c.firstName} ${c.lastName}`,
                groupName: c.groupName || c.group || ''
              }));
            }
          });
          setStudents(allKids);
        } else {
          setStudents([]);
        }
      })
      .catch(e => {
        console.error('Error fetching students:', e);
        setStudents([]);
      });

    fetchTasksAndResults();
  }, [selectedActiveTaskId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setReport(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
  });

  const analyzeVideo = async () => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('choreoId', selectedChoreoId);
    try {
      const res = await fetch('http://localhost:3000/api/coach/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      alert('Błąd podczas analizy');
    } finally {
      setIsProcessing(false);
    }
  };

  const dummyHomeworkResults = [
    { id: '1', name: 'Zosia Kowalska', group: 'Balet', score: 92, status: 'green' },
    { id: '2', name: 'Jan Nowak', group: 'Balet', score: 85, status: 'green' },
    { id: '3', name: 'Maja Wójcik', group: 'Balet', score: 65, status: 'yellow' },
    { id: '4', name: 'Kuba Wiśniewski', group: 'Balet', score: 35, status: 'red' },
    { id: '5', name: 'Anna Dąbrowska', group: 'Balet', score: null, status: 'pending' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light mb-2">AI Trener</h1>
          <p className="text-gray-400 font-sans">Automatyczna weryfikacja zadań domowych i analiza ruchu.</p>
        </div>
        
        <div className="flex w-full md:w-auto bg-[#18181B] rounded-xl p-1 border border-gray-800 shadow-inner">
          <button 
            onClick={() => setViewMode('homework')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-lg font-bold font-sans transition-all text-center ${viewMode === 'homework' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Zadania Domowe
          </button>
          <button 
            onClick={() => setViewMode('manual')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-lg font-bold font-sans transition-all text-center ${viewMode === 'manual' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Ręczna Analiza
          </button>
        </div>
      </div>

      {viewMode === 'homework' ? (
        <div className="animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white font-heading">Aktywne Zadania Domowe</h2>
            <button 
              onClick={() => {
                setShowHomeworkModal(true);
                if (choreographies.length > 0 && !selectedChoreoId) {
                  setSelectedChoreoId(choreographies[0].id);
                }
              }}
              className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(244,114,182,0.3)] flex justify-center items-center gap-2"
            >
              <Send size={18} /> Zleć nowe zadanie
            </button>
          </div>

          <div className="bg-surface border border-gray-800 rounded-2xl p-6 shadow-xl mb-8 w-full min-w-0 overflow-hidden">
            {isLoadingHomework && activeTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Loader2 size={32} className="animate-spin mx-auto mb-3 text-primary" />
                Ładowanie zadań domowych...
              </div>
            ) : activeTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-sans">
                <AlertTriangle size={32} className="mx-auto mb-3 text-gray-600" />
                Brak aktywnych zadań domowych. Kliknij "Zleć nowe zadanie" powyżej, aby dodać pierwsze ćwiczenie.
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-800 pb-6">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Wybierz Zadanie Domowe do podglądu</label>
                    <div className="relative max-w-md">
                      <select 
                        className="w-full bg-[#18181B] text-white p-3 pr-10 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-gray-800 appearance-none cursor-pointer"
                        value={selectedActiveTaskId}
                        onChange={(e) => setSelectedActiveTaskId(e.target.value)}
                      >
                        {activeTasks.map(t => (
                          <option key={t.id} value={t.id}>{t.title} ({t.targetType === 'group' ? `Grupa: ${t.targetValue}` : `Uczeń: ${t.targetValue}`})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                    </div>
                  </div>
                  
                  {activeTasks.find(t => t.id === selectedActiveTaskId)?.videoUrl && (
                    <a 
                      href={activeTasks.find(t => t.id === selectedActiveTaskId)?.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-white text-sm font-bold flex items-center gap-2 mt-4 md:mt-0"
                    >
                      <Play size={16} /> Zobacz wideo referencyjne
                    </a>
                  )}
                </div>

                {(() => {
                  const currentTask = activeTasks.find(t => t.id === selectedActiveTaskId);
                  if (!currentTask) return null;

                  let targetStudents: Student[] = [];
                  if (currentTask.targetType === 'group') {
                    targetStudents = students.filter(s => String(s.groupName).toLowerCase() === String(currentTask.targetValue).toLowerCase());
                  } else {
                    targetStudents = students.filter(s => String(s.name).toLowerCase() === String(currentTask.targetValue).toLowerCase());
                  }

                  return (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm">
                          <strong>Grupa/Uczeń docelowy:</strong> {currentTask.targetValue} • 
                          <strong> Termin:</strong> {currentTask.deadline || 'Brak'} • 
                          <strong> Zlecił:</strong> {currentTask.instructor}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4 mt-6">
                        <h4 className="text-sm text-gray-500 uppercase tracking-widest font-bold">Statusy oddania zadań (RODO-compliant self-practice)</h4>
                        <div className="relative w-full sm:w-64">
                          <select 
                            className="w-full bg-[#18181B] text-white p-2 pr-8 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-gray-800 appearance-none cursor-pointer"
                            value={tableFilter}
                            onChange={(e) => {
                              if (e.target.value === 'individual') {
                                setShowTableSearchModal(true);
                              } else {
                                setTableFilter(e.target.value);
                              }
                            }}
                          >
                            <option value="all">Wszyscy z przypisanych</option>
                            {currentTask.targetType === 'group' && (
                              <option value={currentTask.targetValue}>Tylko grupa: {currentTask.targetValue}</option>
                            )}
                            <option value="individual">Szukaj ucznia...</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                      </div>

                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left whitespace-nowrap">
                          <thead>
                            <tr className="text-gray-500 text-sm border-b border-gray-800">
                              <th className="pb-3 font-medium">Uczeń</th>
                              <th className="pb-3 font-medium">Grupa</th>
                              <th className="pb-3 font-medium">Status Zaliczenia</th>
                              <th className="pb-3 font-medium">Data Zaliczenia</th>
                              <th className="pb-3 font-medium">Notatka Zwrotna Ucznia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {targetStudents
                              .filter(student => {
                                if (tableFilter === 'all') return true;
                                if (tableFilter === 'individual') return true;
                                if (tableFilter === currentTask.targetValue) return true;
                                return student.name.toLowerCase().includes(tableFilter.toLowerCase());
                              })
                              .map(student => {
                                const result = homeworkResults.find(r => r.taskId === currentTask.id && String(r.studentName).toLowerCase() === String(student.name).toLowerCase());
                                return (
                                  <tr key={student.id} className="border-b border-gray-800/50 hover:bg-[#18181B] transition-colors">
                                    <td className="py-4 text-white font-bold">{student.name}</td>
                                    <td className="py-4 text-gray-400">{student.groupName || 'Brak'}</td>
                                    <td className="py-4">
                                      {result ? (
                                        <span className="text-green-500 flex items-center gap-2"><CheckSquare size={14} /> Odrobione</span>
                                      ) : (
                                        <span className="text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" style={{ animationDuration: '3s' }} /> W trakcie</span>
                                      )}
                                    </td>
                                    <td className="py-4 text-gray-400">
                                      {result ? new Date(result.submissionDate).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="py-4 text-gray-300 max-w-xs truncate" title={result?.notes || ''}>
                                      {result?.notes || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            {targetStudents.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                                  Brak uczniów przypisanych do tego kryterium.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 min-w-0 animate-fade-in">
          <div className="lg:col-span-2 flex flex-col gap-8 min-w-0">
            <div className="bg-surface border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-white font-bold mb-4 font-sans flex items-center gap-2">
                <FlaskConical className="text-primary" size={20} /> Wideo Referencyjne
              </h3>
              <div className="relative">
                <button 
                  className="w-full bg-[#18181B] text-white border border-gray-700 rounded-xl p-4 font-sans focus:outline-none focus:border-primary flex justify-between items-center shadow-inner"
                  onClick={() => document.getElementById('choreoDropdown')?.classList.toggle('hidden')}
                >
                  <span>
                    {choreographies.find(c => c.id === selectedChoreoId)?.title || 'Wybierz choreografię...'} 
                  </span>
                  <span className="text-gray-500">▼</span>
                </button>
                <div id="choreoDropdown" className="hidden absolute z-50 w-full mt-2 bg-[#18181B] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                  {Array.isArray(choreographies) && choreographies.map(ch => (
                    <div 
                      key={ch.id} 
                      className={`p-4 cursor-pointer hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0 ${selectedChoreoId === ch.id ? 'bg-primary/10 text-primary' : 'text-gray-300'}`}
                      onClick={() => {
                        setSelectedChoreoId(ch.id);
                        document.getElementById('choreoDropdown')?.classList.add('hidden');
                      }}
                    >
                      <div className="font-bold">{ch.title}</div>
                      <div className="text-xs text-gray-500 mt-1">Instruktor: {ch.instructor}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all bg-[#0B0B0C] min-h-[250px] ${
                isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
                <UploadCloud size={24} className={isDragActive ? 'text-primary animate-bounce' : 'text-gray-500'} />
              </div>
              {file ? (
                <div className="text-center">
                  <h3 className="text-lg text-white font-bold font-sans">{file.name}</h3>
                  <p className="text-gray-500 text-xs mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg text-white font-bold font-heading mb-1">Wrzuć Nagranie Ucznia</h3>
                  <p className="text-gray-500 font-sans text-sm">Przeciągnij plik mp4</p>
                </div>
              )}
            </div>

            <button 
              onClick={analyzeVideo}
              disabled={!file || isProcessing}
              className={`w-full py-4 rounded-xl font-bold font-sans flex items-center justify-center gap-3 transition-all ${
                !file || isProcessing 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(244,114,182,0.3)]'
              }`}
            >
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Activity size={24} />}
              {isProcessing ? 'AI analizuje ruchy...' : 'Rozpocznij Analizę Techniki'}
            </button>
          </div>

          <div className="lg:col-span-3">
            {isProcessing && !report && (
              <div className="h-full min-h-[400px] border border-gray-800 bg-[#0B0B0C] rounded-2xl flex flex-col items-center justify-center p-10">
                <Loader2 size={40} className="text-primary animate-spin mb-4" />
                <h2 className="text-2xl text-white font-bold font-heading mb-2">Przetwarzanie Klatka po Klatce</h2>
                <p className="text-gray-400 font-sans text-center">AI buduje szkielet ruchu 3D z wideo ucznia i nakłada go na szkielet referencyjny...</p>
              </div>
            )}

            {report && (
              <div className="bg-surface border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                <div className="bg-gradient-to-r from-primary/20 to-transparent p-8 border-b border-gray-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl text-white font-bold font-heading mb-1">Raport Techniki Tanecznej</h2>
                    <p className="text-primary font-sans">Automatyczna detekcja błędów w układzie</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold font-heading text-white flex items-baseline gap-1">
                      {report.score} <span className="text-xl text-gray-500">/100</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-[#0B0B0C] border border-gray-800 p-5 rounded-xl">
                      <p className="text-gray-400 font-sans text-sm mb-2">Zgodność Rytmiczna</p>
                      <div className="text-3xl font-bold text-white mb-2">{report.timingAccuracy}%</div>
                      <div className="bg-gray-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${report.timingAccuracy}%` }}></div>
                      </div>
                    </div>
                    <div className="bg-[#0B0B0C] border border-gray-800 p-5 rounded-xl">
                      <p className="text-gray-400 font-sans text-sm mb-2">Postawa</p>
                      <div className="text-3xl font-bold text-white mb-2">{report.postureAccuracy}%</div>
                      <div className="bg-gray-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${report.postureAccuracy}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-white font-bold mb-4 text-lg">Uwagi od Asystenta:</h3>
                  <ul className="space-y-3">
                    {report.feedback.map((f, i) => (
                      <li key={i} className="flex gap-3 text-gray-300 bg-[#18181B] p-3 rounded-lg border border-gray-800">
                        <AlertTriangle size={18} className="text-yellow-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!isProcessing && !report && (
              <div className="h-full border border-gray-800 border-dashed rounded-2xl flex items-center justify-center text-gray-500 font-sans p-10 text-center">
                Wybierz choreografię, wrzuć nagranie i kliknij "Rozpocznij Analizę".
              </div>
            )}
          </div>
        </div>
      )}

      {showHomeworkModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold font-heading text-white mb-6">Nowe Zadanie Domowe</h2>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Wybierz Choreografię 3D</label>
              <div className="relative">
                <select 
                  className="w-full bg-[#27272A] text-white p-3 pr-12 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent appearance-none cursor-pointer"
                  value={selectedChoreoId}
                  onChange={(e) => setSelectedChoreoId(e.target.value)}
                >
                  {Array.isArray(choreographies) && choreographies.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.title} ({ch.instructor})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Adresat Zadania (Grupa lub Uczeń)</label>
              <div className="relative">
                <select 
                  className="w-full bg-[#27272A] text-white p-3 pr-12 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent appearance-none cursor-pointer"
                  value={targetGroup}
                  onChange={(e) => {
                    if (e.target.value === 'individual') {
                      setShowStudentSearchModal(true);
                    } else {
                      setTargetGroup(e.target.value);
                    }
                  }}
                >
                  <option value="" disabled>-- Wybierz grupę lub ucznia --</option>
                  <optgroup label="Grupy Zorganizowane">
                    {Array.isArray(groups) && groups.map(g => (
                      <option key={g.id} value={g.name}>Cała Grupa: {g.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Indywidualnie">
                    <option value="individual">Wyszukaj ucznia z bazy...</option>
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do referencji (YouTube/Drive)</label>
              <input 
                type="text" 
                className="w-full bg-[#27272A] text-white p-3 rounded-lg focus:outline-none focus:border-primary border border-transparent" 
                placeholder="https://..." 
                value={refLink}
                onChange={(e) => setRefLink(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Termin wykonania</label>
              <input 
                type="date" 
                style={{ colorScheme: 'dark' }} 
                className="w-full bg-[#27272A] text-white p-3 rounded-lg focus:outline-none focus:border-primary border border-transparent" 
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setShowHomeworkModal(false);
                  setRefLink('');
                  setDeadlineDate('');
                  setTargetGroup('');
                }} 
                className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Anuluj
              </button>
              <button 
                onClick={handleCreateTask} 
                disabled={!targetGroup || targetGroup === 'individual' || !selectedChoreoId}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                Zleć Zadanie
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentSearchModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold font-heading text-white mb-4">Wyszukaj ucznia</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                autoFocus
                placeholder="Imię lub nazwisko..." 
                className="w-full bg-[#27272A] text-white p-3 pl-10 rounded-lg focus:outline-none focus:border-primary border border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto mb-4 bg-[#0B0B0C] border border-gray-800 rounded-lg p-2">
              {students
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(s => (
                  <button 
                    key={s.id}
                    onClick={() => {
                      setTargetGroup(s.name);
                      setShowStudentSearchModal(false);
                    }}
                    className="w-full text-left p-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {s.name} ({s.groupName || 'Brak grupy'})
                  </button>
              ))}
              {searchQuery && !students.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="p-3 text-gray-500 text-sm text-center">Brak wyników</div>
              )}
            </div>

            <button 
              onClick={() => {
                setShowStudentSearchModal(false);
                setTargetGroup('');
              }} 
              className="w-full py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Cofnij
            </button>
          </div>
        </div>
      )}

      {showTableSearchModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold font-heading text-white mb-4">Filtruj wyniki wg ucznia</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                autoFocus
                placeholder="Imię lub nazwisko..." 
                className="w-full bg-[#27272A] text-white p-3 pl-10 rounded-lg focus:outline-none focus:border-primary border border-transparent"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto mb-4 bg-[#0B0B0C] border border-gray-800 rounded-lg p-2">
              {students
                .filter(s => s.name.toLowerCase().includes(tableSearchQuery.toLowerCase()))
                .map(s => (
                  <button 
                    key={s.id}
                    onClick={() => {
                      setTableFilter(s.name);
                      setShowTableSearchModal(false);
                    }}
                    className="w-full text-left p-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {s.name} ({s.groupName || 'Brak grupy'})
                  </button>
              ))}
              {tableSearchQuery && !students.some(s => s.name.toLowerCase().includes(tableSearchQuery.toLowerCase())) && (
                <div className="p-3 text-gray-500 text-sm text-center">Brak wyników</div>
              )}
            </div>

            <button 
              onClick={() => {
                setShowTableSearchModal(false);
                setTableFilter('all');
              }} 
              className="w-full py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Anuluj Filtrowanie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
