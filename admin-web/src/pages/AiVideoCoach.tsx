import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FlaskConical, Activity, Loader2, UploadCloud, CheckCircle2, AlertTriangle, Medal, Play, Send, CheckSquare, XCircle, X, ChevronDown, ChevronUp, Search, Plus, Trash2, Music, Sparkles } from 'lucide-react';
import AdminChoreoPreview from '../components/AdminChoreoPreview';
import { DANCE_MOVE_LIBRARY, DEFAULT_CHOREOGRAPHY_SEQUENCE } from '../utils/DanceMoveLibrary';
import type { ChoreographySequence } from '../utils/DanceMoveLibrary';

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

const PROD_BACKEND_URL = 'https://vialflow-backend-392406857647.europe-central2.run.app';

const fetchWithFallback = async (endpoint: string, options?: RequestInit) => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, options);
      if (res.ok) return res;
    } catch {
      // Local backend unavailable, fallback to Cloud Run
    }
  }
  return fetch(`${PROD_BACKEND_URL}${endpoint}`, options);
};

class SafeChoreoPreviewBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('3D Preview Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0B0B0C] border border-red-800/50 rounded-xl p-4 mb-4 text-center text-gray-400 text-xs font-mono">
          <p className="text-red-400 font-bold mb-1">⚠️ Wystąpił błąd podczas ładowania widżetu 3D</p>
          <p className="text-[10px] text-gray-500">{this.state.errorMsg}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AiVideoCoach() {
  const [viewMode, setViewMode] = useState<'homework' | 'manual'>('homework');
  
  // Ręczna analiza (stare stany)
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [selectedChoreoId, setSelectedChoreoId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // Sequencer 3D stany dla trenera
  const [customSequence, setCustomSequence] = useState<ChoreographySequence>(DEFAULT_CHOREOGRAPHY_SEQUENCE);
  const [audioUrl, setAudioUrl] = useState('/assets/female_hip_hop_104_bpm.mp3');
  const [customAudios, setCustomAudios] = useState<{name: string, url: string}[]>(() => {
    try {
      const saved = localStorage.getItem('vialflow_custom_audios');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [homeworkTitle, setHomeworkTitle] = useState('Trening Choreografii - Tydzień 1');
  const [draggedBlockIdx, setDraggedBlockIdx] = useState<number | null>(null);

  // AI Choreography Generator stany
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAudioUrl, setAiAudioUrl] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');
  const [aiErrorMsg, setAiErrorMsg] = useState('');

  const handleGenerateAiChoreo = async (promptToUse?: string) => {
    const textPrompt = promptToUse || aiPrompt;
    if (!textPrompt || !textPrompt.trim()) {
      setAiErrorMsg('Wpisz opis choreografii lub kliknij jeden z szybkich stylów.');
      return;
    }

    setIsGeneratingAi(true);
    setAiSuccessMsg('');
    setAiErrorMsg('');

    try {
      const res = await fetchWithFallback('/api/coach/generate-edge-dance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textPrompt, audioUrl: aiAudioUrl })
      });
      const data = await res.json();
      if (data.success && data.sequence) {
        setCustomSequence(data.sequence);
        setAiSuccessMsg(`✨ Wygenerowano nowy układ 3D: "${data.sequence.title}"!`);
      } else {
        setAiErrorMsg(data.error || 'Nie udało się wygenerować choreografii.');
      }
    } catch (err: any) {
      console.error('Błąd generowania choreografii przez AI:', err);
      setAiErrorMsg('Błąd połączenia z serwerem generowania AI.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Zadania Domowe (nowe stany)
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
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
  const [coachNote, setCoachNote] = useState('');
  const [isLoadingHomework, setIsLoadingHomework] = useState(false);

  const fetchTasksAndResults = async () => {
    setIsLoadingHomework(true);
    try {
      const tasksRes = await fetchWithFallback('/api/coach/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (Array.isArray(tasksData)) {
          setActiveTasks(tasksData);
          if (tasksData.length > 0 && !selectedActiveTaskId) {
            setSelectedActiveTaskId(tasksData[0].id);
          }
        }
      }

      const resultsRes = await fetchWithFallback('/api/coach/homework/results');
      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        if (Array.isArray(resultsData)) {
          setHomeworkResults(resultsData);
        }
      }
    } catch (err) {
      console.error('Błąd pobierania zadań i wyników:', err);
    } finally {
      setIsLoadingHomework(false);
    }
  };

  useEffect(() => {
    fetchWithFallback('/api/coach/choreographies')
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

    fetchWithFallback('/api/groups')
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(e => {
        console.error('Error fetching groups:', e);
        setGroups([]);
      });

    fetchWithFallback('/api/users')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const seen = new Set<string>();
          const allKids: Student[] = [];
          data.forEach(p => {
            if (p.children && Array.isArray(p.children)) {
              p.children.forEach((c: any) => {
                const name = `${c.firstName} ${c.lastName}`.trim();
                const key = c.id || name.toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  allKids.push({
                    id: c.id,
                    name,
                    groupName: c.groupName || c.group || ''
                  });
                }
              });
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
  }, []);

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
      const res = await fetchWithFallback('/api/coach/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      alert('Błąd podczas analizy');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTask = async () => {
    const targetsToUse = selectedTargets.length > 0 ? selectedTargets : (targetGroup ? [targetGroup] : []);
    if (!homeworkTitle.trim() || targetsToUse.length === 0 || isSubmittingTask) return;


    setIsSubmittingTask(true);

    try {
      const token = localStorage.getItem('jwtToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const tasksPayload = targetsToUse.map(tgt => {
        const isAll = tgt === 'all' || tgt === 'Wszystkie Grupy';
        const isGrp = isAll ? false : Array.isArray(groups) && groups.some(g => g.name === tgt);
        
        return {
          title: homeworkTitle,
          choreoId: 'custom-ai-gen',
          targetType: isAll ? 'all' : (isGrp ? 'group' : 'student'),
          targetValue: isAll ? 'Wszystkie Grupy' : tgt,
          videoUrl: refLink,
          deadline: deadlineDate,
          coachNote: coachNote,
          instructor: 'Instruktor (Kreator AI)',
          audioUrl: audioUrl,
          sequenceJson: JSON.stringify(customSequence),
          targetBPM: customSequence.targetBPM
        };
      });

      const res = await fetchWithFallback('/api/coach/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tasks: tasksPayload })
      });
      const data = await res.json();

      if (data.success) {
        alert(`Zadanie domowe zostało pomyślnie zlecone dla (${targetsToUse.length}) adresatów!`);
        setShowHomeworkModal(false);
        setRefLink('');
        setDeadlineDate('');
        setTargetGroup('');
        setSelectedTargets([]);
        fetchTasksAndResults();
      } else {
        alert('Błąd zlecania zadania: ' + (data.error || 'nieznany błąd'));
        fetchTasksAndResults();
      }
    } catch (err: any) {
      console.error(err);
      alert('Błąd połączenia z serwerem: ' + err.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const dummyHomeworkResults = [
    { id: '1', name: 'Zosia Kowalska', group: 'Balet', score: 92, status: 'green' },
    { id: '2', name: 'Jan Nowak', group: 'Balet', score: 85, status: 'green' },
    { id: '3', name: 'Maja Wójcik', group: 'Balet', score: 65, status: 'yellow' },
    { id: '4', name: 'Kuba Wiśniewski', group: 'Balet', score: 35, status: 'red' },
    { id: '5', name: 'Anna Dąbrowska', group: 'Balet', score: null, status: 'pending' },
  ];

  try {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light flex items-center gap-3">
              <FlaskConical className="text-primary" size={36} /> Wirtualny AI Coach
            </h1>
            <p className="text-gray-400 font-sans mt-2">Analiza techniki ruchu w chmurze i przydzielanie zadań domowych</p>
          </div>
          
          <div className="flex bg-[#18181B] p-1 rounded-xl border border-gray-800 w-full md:w-auto shrink-0 z-20">
            <button 
              onClick={() => setViewMode('homework')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-lg font-bold font-sans transition-all text-center ${viewMode === 'homework' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Panel Zadań Domowych
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
                      targetStudents = students.filter(s => s && s.groupName && String(s.groupName).toLowerCase() === String(currentTask.targetValue).toLowerCase());
                    } else {
                      targetStudents = students.filter(s => s && s.name && String(s.name).toLowerCase() === String(currentTask.targetValue).toLowerCase());
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
                                  if (!student || !student.name) return false;
                                  if (tableFilter === 'all') return true;
                                  if (tableFilter === 'individual') return true;
                                  if (tableFilter === currentTask.targetValue) return true;
                                  return student.name.toLowerCase().includes(tableFilter.toLowerCase());
                                })
                                .map(student => {
                                  const result = homeworkResults.find(r => r.taskId === currentTask.id && r.studentName && student.name && String(r.studentName).toLowerCase() === String(student.name).toLowerCase());
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
                                      <td className="py-4 text-gray-400 text-sm">{result ? (result.submissionDate || result.timestamp || result.date || '-') : '-'}</td>
                                      <td className="py-4 text-gray-300 italic max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">{result ? (result.notes || 'Brak notatki') : '-'}</td>
                                    </tr>
                                  );
                                })}
                              {targetStudents.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-gray-500">Brak zarejestrowanych uczniów w tej grupie.</td>
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
                  isDragActive ? 'border-primary bg-primary/5' : 'border-gray-800 hover:border-gray-700'
                } cursor-pointer`}
              >
                <input {...getInputProps()} />
                <UploadCloud size={48} className={`${isDragActive ? 'text-primary' : 'text-gray-600'} mb-4`} />
                {file ? (
                  <div className="text-center">
                    <p className="text-white font-sans font-bold">{file.name}</p>
                    <p className="text-xs text-gray-500 font-sans mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center font-sans text-sm">
                    <p className="text-gray-400">Przeciągnij i upuść plik wideo lub kliknij, aby wybrać</p>
                    <p className="text-gray-600 text-xs mt-1">Obsługiwane formaty: MP4, MOV, WebM</p>
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
            <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
                <h2 className="text-2xl font-bold font-heading text-white">Nowe Zadanie Domowe z AI</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowHomeworkModal(false);
                    setRefLink('');
                    setDeadlineDate('');
                    setTargetGroup('');
                    setSelectedTargets([]);
                  }}
                  className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors bg-gray-800/50 hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lewa kolumna: Generator AI & Podgląd Awatara 3D */}
                <div className="space-y-4">
                  {/* Sekcja Generatora AI dla Choreografa */}
                  <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={16} /> Asystent AI Choreografa
                      </span>
                      <div className="flex gap-2 items-center">
                        <label htmlFor="aiAudioUpload" className="bg-[#18181B] hover:bg-gray-800 text-primary border border-primary/30 p-1 rounded-md cursor-pointer transition-colors" title="Wgraj podkład muzyczny dla AI">
                          <Plus size={14} />
                        </label>
                        <input 
                          id="aiAudioUpload" 
                          type="file" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const uploadedFile = e.target.files?.[0];
                            if (!uploadedFile) return;
                            try {
                              setAiSuccessMsg(`🎵 Wgrywanie dla AI: "${uploadedFile.name}"...`);
                              const formData = new FormData();
                              formData.append('audio', uploadedFile);
                              const uploadRes = await fetchWithFallback('/api/coach/upload-audio', { method: 'POST', body: formData });
                              const uploadData = await uploadRes.json();
                              if (uploadData.success) {
                                setAiAudioUrl(uploadData.url);
                                setAiSuccessMsg(`✅ Wgrano podkład do analizy: "${uploadedFile.name}"`);
                              } else {
                                setAiErrorMsg('Błąd wgrywania pliku dla AI');
                                setAiSuccessMsg('');
                              }
                            } catch (err: any) {
                              setAiErrorMsg('Błąd połączenia: ' + err.message);
                              setAiSuccessMsg('');
                            }
                          }}
                        />
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">EDGE AI</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-2">
                      <textarea
                        rows={4}
                        placeholder="Wpisz szczegółowy opis układu (np. Krok w bok i klasyczny Running Man)..."
                        value={aiPrompt}
                        onChange={(e) => {
                          setAiPrompt(e.target.value);
                          if (aiErrorMsg) setAiErrorMsg('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleGenerateAiChoreo();
                          }
                        }}
                        className="w-full bg-[#27272A] text-white p-3 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-primary resize-y min-h-[120px] leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateAiChoreo()}
                        disabled={isGeneratingAi}
                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 w-full"
                      >
                        {isGeneratingAi ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        <span>{isGeneratingAi ? 'Generowanie...' : 'Generuj 3D'}</span>
                      </button>
                    </div>

                    {/* Powiadomienia statusu AI */}
                    {aiSuccessMsg && (
                      <div className="mb-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0 text-green-400" />
                        <span>{aiSuccessMsg}</span>
                      </div>
                    )}
                    {aiErrorMsg && (
                      <div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0 text-red-400" />
                        <span>{aiErrorMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Interaktywny Sekwencer 3D & Podgląd Awatara */}
                  <SafeChoreoPreviewBoundary>
                    <AdminChoreoPreview sequence={customSequence} audioUrl={audioUrl} />
                  </SafeChoreoPreviewBoundary>

                  <div className="bg-[#0B0B0C] border border-gray-800 p-4 rounded-xl">
                    {/* Metronom i tempo */}
                    <div className="mb-3 bg-[#18181B] p-2 rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5"><Activity size={14} className="text-primary" /> Tempo / Podkład MP3</span>
                        <label htmlFor="customAudioUpload" className="text-primary hover:underline cursor-pointer flex items-center gap-1 text-[11px] font-semibold lowercase">
                          <UploadCloud size={12} /> + wgraj własny MP3
                        </label>
                        <input 
                          id="customAudioUpload"
                          type="file" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const uploadedFile = e.target.files?.[0];
                            if (!uploadedFile) return;
                            // Upload to server so students can access the file
                            try {
                              const formData = new FormData();
                              formData.append('audio', uploadedFile);
                              const uploadRes = await fetchWithFallback('/api/coach/upload-audio', {
                                method: 'POST',
                                body: formData
                              });
                              const uploadData = await uploadRes.json();
                              if (uploadData.success) {
                                setAudioUrl(uploadData.url);
                                setCustomAudios(prev => {
                                  const updated = [{ name: uploadedFile.name, url: uploadData.url }, ...prev.filter(a => a.url !== uploadData.url)].slice(0, 10);
                                  localStorage.setItem('vialflow_custom_audios', JSON.stringify(updated));
                                  return updated;
                                });
                              } else {
                                alert('Błąd wgrywania pliku audio: ' + (uploadData.error || 'nieznany błąd'));
                              }
                            } catch (err: any) {
                              alert('Błąd połączenia z serwerem: ' + err.message);
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <select
                          value={audioUrl}
                          onChange={(e) => {
                             const val = e.target.value;
                             setAudioUrl(val);
                             if (val.includes('85_bpm')) setCustomSequence({ ...customSequence, targetBPM: 85 });
                             else if (val.includes('104_bpm')) setCustomSequence({ ...customSequence, targetBPM: 104 });
                             else if (val.includes('128_bpm')) setCustomSequence({ ...customSequence, targetBPM: 128 });
                          }}
                          className="w-full bg-[#27272A] text-white text-xs font-bold p-1 rounded border border-gray-700 focus:outline-none focus:border-primary cursor-pointer mb-2"
                        >
                          <optgroup label="Domyślne podkłady">
                            <option value="/assets/female_hip_hop_85_bpm.mp3">85 BPM (Powolne wejście)</option>
                            <option value="/assets/female_hip_hop_104_bpm.mp3">104 BPM (Urban Beat)</option>
                            <option value="/assets/female_hip_hop_128_bpm.mp3">128 BPM (Dynamiczny K-Pop)</option>
                          </optgroup>
                          {customAudios.length > 0 && (
                            <optgroup label="Ostatnio wgrane">
                              {customAudios.map(a => (
                                <option key={a.url} value={a.url}>Własny: {a.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {/* Fallback dla wgranego przed chwilą którego brak w historii */}
                          {!customAudios.find(a => a.url === audioUrl) && !audioUrl.includes('_bpm.mp3') && (
                            <optgroup label="Aktualny plik">
                              <option value={audioUrl}>Własny (Nieznana nazwa)</option>
                            </optgroup>
                          )}
                        </select>
                        <div className="flex flex-col mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Prędkość animacji (BPM)</span>
                            <span className="text-xs font-bold text-primary">{customSequence.targetBPM || 104} BPM</span>
                          </div>
                          <input 
                            type="range"
                            min="80"
                            max="220"
                            step="1"
                            value={customSequence.targetBPM || 104}
                            onChange={(e) => setCustomSequence({...customSequence, targetBPM: Number(e.target.value)})}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lista ułożonych bloków z Drag & Drop */}
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-2">
                      {customSequence.blocks.map((block: any, bIdx) => (
                        <div 
                          key={block.instanceId || bIdx} 
                          draggable
                          onDragStart={(e) => { 
                            setDraggedBlockIdx(bIdx); 
                            e.dataTransfer.setData('text/plain', bIdx.toString());
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnter={(e) => e.preventDefault()}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDrop={(e) => {
                             e.preventDefault();
                             const draggedStr = e.dataTransfer.getData('text/plain');
                             if (draggedStr !== '') {
                               const dIdx = parseInt(draggedStr, 10);
                               if (!isNaN(dIdx) && dIdx !== bIdx) {
                                 const newBlocks = [...customSequence.blocks];
                                 const item = newBlocks.splice(dIdx, 1)[0];
                                 newBlocks.splice(bIdx, 0, item);
                                 setCustomSequence({...customSequence, blocks: newBlocks});
                               }
                             }
                             setDraggedBlockIdx(null);
                          }}
                          className={`bg-[#18181B] border border-gray-800 p-2 rounded-lg flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-all ${draggedBlockIdx === bIdx ? 'opacity-30 scale-95 border-primary' : 'opacity-100 hover:border-gray-600'}`}
                        >
                          <div className="flex items-center gap-2 pointer-events-none select-none">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                              {bIdx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">{block.name}</p>
                              <p className="text-[10px] text-gray-400">{block.style} • {block.durationBeats} liczeń</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <div className="flex flex-col border-r border-gray-800 pr-2 mr-2">
                              <button 
                                type="button" 
                                disabled={bIdx === 0}
                                onClick={() => {
                                  const newBlocks = [...customSequence.blocks];
                                  const item = newBlocks.splice(bIdx, 1)[0];
                                  newBlocks.splice(bIdx - 1, 0, item);
                                  setCustomSequence({...customSequence, blocks: newBlocks});
                                }} 
                                className="text-gray-500 hover:text-white p-0.5 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button 
                                type="button"
                                disabled={bIdx === customSequence.blocks.length - 1} 
                                onClick={() => {
                                  const newBlocks = [...customSequence.blocks];
                                  const item = newBlocks.splice(bIdx, 1)[0];
                                  newBlocks.splice(bIdx + 1, 0, item);
                                  setCustomSequence({...customSequence, blocks: newBlocks});
                                }} 
                                className="text-gray-500 hover:text-white p-0.5 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nb = [...customSequence.blocks];
                                nb.splice(bIdx, 1);
                                setCustomSequence({ ...customSequence, blocks: nb });
                              }}
                              className="text-gray-500 hover:text-red-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {customSequence.blocks.length === 0 && (
                        <p className="text-xs text-gray-500 italic text-center py-2">Brak dodanych bloków 8-liczeń.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-[#27272A] text-white p-2 rounded-lg text-xs border border-gray-700 focus:outline-none focus:border-primary"
                        defaultValue=""
                        onChange={(e) => {
                          const found = DANCE_MOVE_LIBRARY.find(m => m.id === e.target.value);
                          if (found) {
                            const newBlock = { ...found, instanceId: Date.now().toString() + Math.random().toString() };
                            setCustomSequence({ ...customSequence, blocks: [...customSequence.blocks, newBlock] });
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>+ Dodaj blok z biblioteki...</option>
                        {DANCE_MOVE_LIBRARY.map(move => (
                          <option key={move.id} value={move.id}>[{move.style}] {move.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Prawa kolumna: Formularz Zlecenia Zadania Domowego */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nazwij Zadanie Domowe</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full bg-[#27272A] text-white p-3 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent"
                          value={homeworkTitle}
                          onChange={(e) => setHomeworkTitle(e.target.value)}
                          placeholder="Np. Podstawy Hip Hop - Trening"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Adresaci Zadania Domowego</label>
                      <div className="relative mb-2">
                        <select 
                          className="w-full bg-[#27272A] text-white p-3 pr-12 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent appearance-none cursor-pointer"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'individual') {
                              setShowStudentSearchModal(true);
                            } else if (val && !selectedTargets.includes(val)) {
                              setSelectedTargets([...selectedTargets, val]);
                            }
                          }}
                        >
                          <option value="" disabled>-- Dodaj grupę lub ucznia --</option>
                          <option value="Wszystkie Grupy">★ Wszystkie Grupy (Cała Szkoła)</option>
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

                      {/* Tag badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTargets.map((tgt, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/40 text-xs font-bold px-2.5 py-1 rounded-md"
                          >
                            {tgt}
                            <button 
                              type="button" 
                              onClick={() => setSelectedTargets(selectedTargets.filter(t => t !== tgt))}
                              className="hover:text-white ml-1 font-extrabold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {selectedTargets.length === 0 && (
                          <span className="text-xs text-gray-500 italic">Nie wybrano jeszcze żadnego adresata.</span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do referencji (YouTube/Drive)</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#27272A] text-white p-3 rounded-lg focus:outline-none focus:border-primary border border-transparent text-sm" 
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
                        className="w-full bg-[#27272A] text-white p-3 rounded-lg focus:outline-none focus:border-primary border border-transparent text-sm" 
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Komentarz / Wskazówki do wykonania (opcjonalnie)</label>
                      <textarea 
                        className="w-full bg-[#27272A] text-white p-3 rounded-lg focus:outline-none focus:border-primary border border-transparent text-sm resize-none h-20" 
                        placeholder="np. Zwróćcie uwagę na układ Body Wave..." 
                        value={coachNote}
                        onChange={(e) => setCoachNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-gray-800">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowHomeworkModal(false);
                        setRefLink('');
                        setDeadlineDate('');
                        setCoachNote('');
                        setTargetGroup('');
                        setSelectedTargets([]);
                      }} 
                      disabled={isSubmittingTask}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Anuluj
                    </button>
                    <button 
                      type="button"
                      onClick={handleCreateTask} 
                      disabled={selectedTargets.length === 0 || !homeworkTitle.trim() || isSubmittingTask}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmittingTask ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Zlecanie...</span>
                        </>
                      ) : (
                        <span>Zleć Zadanie ({selectedTargets.length})</span>
                      )}
                    </button>
                  </div>
                </div>
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
                {Array.isArray(students) && students
                  .filter(s => s && s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(s => (
                    <button 
                      key={s.id}
                      onClick={() => {
                        if (!selectedTargets.includes(s.name)) {
                          setSelectedTargets([...selectedTargets, s.name]);
                        }
                        setShowStudentSearchModal(false);
                      }}
                      className="w-full text-left p-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      {s.name} ({s.groupName || 'Brak grupy'})
                    </button>
                ))}
                {searchQuery && !students.some(s => s && s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                  <div className="p-3 text-gray-500 text-sm text-center">Brak wyników</div>
                )}
              </div>

              <button 
                onClick={() => {
                  setShowStudentSearchModal(false);
                }} 
                className="w-full py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Gotowe
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
                {Array.isArray(students) && students
                  .filter(s => s && s.name && s.name.toLowerCase().includes(tableSearchQuery.toLowerCase()))
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
                {tableSearchQuery && !students.some(s => s && s.name && s.name.toLowerCase().includes(tableSearchQuery.toLowerCase())) && (
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
  } catch (err: any) {
    return (
      <div className="p-8 text-red-500 bg-black min-h-screen font-mono z-50 relative">
        <h1 className="text-2xl font-bold mb-4">Runtime Render Error inside AiVideoCoach</h1>
        <p className="text-lg mb-2">{err.toString()}</p>
        <pre className="bg-gray-900 p-4 rounded border border-red-900/50 overflow-auto max-w-full text-xs">
          {err.stack}
        </pre>
      </div>
    );
  }
}
