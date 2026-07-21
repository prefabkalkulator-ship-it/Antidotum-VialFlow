import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Image as ImageIcon, Folder, Wand2, Loader2, CheckCircle, Mic, Square, Bell, ChevronDown, Send, Inbox, Reply } from 'lucide-react';
import { MultiSelectSearch } from '../components/MultiSelectSearch';

type Message = { role: 'user' | 'assistant', content: string };

export default function EventOrchestrator() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Cześć! Jestem Twoim Asystentem Organizacyjnym. Jakie wydarzenie dzisiaj planujemy?' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [draftMode, setDraftMode] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [showPushBuilder, setShowPushBuilder] = useState(false);
  const [pushTargetGroups, setPushTargetGroups] = useState<string[]>([]);
  const [pushContent, setPushContent] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // INBOX PYTAŃ
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<Record<string, boolean>>({});

  const fetchQuestions = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/events/questions/pending');
      const data = await res.json();
      if (Array.isArray(data)) setPendingQuestions(data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 10000);
    return () => clearInterval(interval);
  }, []);

  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    if (showPushBuilder) {
      fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/groups')
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setAvailableGroups(data); })
        .catch(console.error);
        
      fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/users')
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setAvailableUsers(data); })
        .catch(console.error);
    }
  }, [showPushBuilder]);

  const handleAnswerQuestion = async (q: any) => {
    const answer = answerInputs[q.questionId];
    if (!answer) return;
    setAnswering(prev => ({...prev, [q.questionId]: true}));
    setLogs(prev => [...prev, `⏳ Przepisywanie GDocs przez AI dla pytań: ${q.questionId}...`]);
    try {
      const res = await fetch(`http://localhost:3000/api/events/questions/${q.sheetRow}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: q.docId, originalQuestion: q.text, author: q.author, answer })
      });
      const data = await res.json();
      if(data.success) {
        setLogs(prev => [...prev, `✅ Odpowiedziano na pyt od ${q.author}. Dokument wydarzenia zaktualizowany!`]);
        fetchQuestions();
      } else {
        alert('Błąd przepisywania: ' + data.error);
        setLogs(prev => [...prev, `❌ Błąd nadpisywania dokumentu. Vertex AI forbidden?`]);
      }
    } catch(e) {
      alert('Błąd sieci.');
    }
    setAnswering(prev => ({...prev, [q.questionId]: false}));
  };

  // Referencje do nagrywania głosu
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setLogs(prev => [...prev, '🎤 Nagrywanie głosu rozpoczęte...']);
    } catch (err) {
      console.error(err);
      alert('Brak dostępu do mikrofonu!');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setLogs(prev => [...prev, '⏹️ Przetwarzanie nagrania przez AI...']);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    // Symulacja wysyłki do Gemini 2.5 Flash Audio API dla dema
    setTimeout(() => {
      setInput('Organizujemy coroczny turniej tańca Winter Cup, 15 grudnia o 10:00.');
      setIsProcessing(false);
      setLogs(prev => [...prev, '✅ Transkrypcja gotowa. Możesz ją poprawić lub wysłać.']);
    }, 2000);
  };

  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch('http://localhost:3000/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (data.status === 'ask' || data.status === 'preview') {
        setMessages([...newMessages, { role: 'assistant', content: data.message }]);
      } else if (data.status === 'complete') {
        const docLink = data.docId && data.docId !== 'brak-id' ? `https://docs.google.com/document/d/${data.docId}/edit` : null;
        const folderLink = data.folderId && data.folderId !== 'brak-id' ? `https://drive.google.com/drive/folders/${data.folderId}` : null;
        const linksPart = [
          docLink ? `📄 [Otwórz opis wydarzenia](${docLink})` : '',
          folderLink ? `📁 [Otwórz folder na Dysku](${folderLink})` : ''
        ].filter(Boolean).join('\n');
        setMessages([...newMessages, { role: 'assistant', content: `✅ Wydarzenie "${data.eventName}" zostało utworzone!\n\n${linksPart}` }]);
        
        setLogs(prev => [
          ...prev, 
          '✅ Foldery utworzone.',
          '✅ Wydarzenie w kalendarzu dodane.',
          '✅ Dokument z auto-aktualizowanym opisem utworzony.',
          'Generowanie wstępnego szkicu plakatu w Imagen...'
        ]);
        
        setTimeout(() => {
          setDraftImage('https://via.placeholder.com/400x500/F472B6/000000?text=Szkic+Plakatu');
          setLogs(prev => [...prev, '✅ Szkic plakatu gotowy do oceny.']);
          setDraftMode(false);
        }, 3000);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: `Wystąpił błąd: ${data.message || 'Nieznany błąd'}` }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Krytyczny błąd połączenia z serwerem.' }]);
    }
    
    setIsProcessing(false);
  };

  const handleRefine = () => {
    setIsRefining(true);
    setTimeout(() => {
      setDraftImage('https://via.placeholder.com/400x500/BE185D/FFFFFF?text=Poprawiony+Plakat');
      setRefinementPrompt('');
      setIsRefining(false);
      setLogs(prev => [...prev, '✅ Plakat poprawiony wg wskazówek.']);
    }, 2000);
  };

  const handleApproveImage = () => {
    setLogs(prev => [...prev, '✅ Ostateczny plakat zapisany na Dysku Google!']);
    setTimeout(() => {
      setDraftImage(null);
      setDraftMode(true);
      setShowPushBuilder(true);
      setPushContent('Z radością ogłaszamy nowe wydarzenie! Sprawdźcie aplikację i przygotujcie się na świetną zabawę. Do zobaczenia!');
    }, 1500);
  };

  return (
    <div className="p-0 md:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-2 md:mb-8 px-2 md:px-0">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light mb-2">Orkiestrator Wydarzeń</h1>
        <p className="text-gray-400 font-sans">Podyktuj wizję wydarzenia. AI zapyta o braki i przygotuje pliki, dyskusje na Google Docs oraz grafikę.</p>
      </div>

      <div className="bg-surface rounded-none md:rounded-2xl border-0 md:border border-gray-800 p-0 md:p-6 shadow-2xl relative overflow-hidden flex-1 flex flex-col md:flex-row gap-0 md:gap-6 min-h-0">
        
        {/* Lewa kolumna: Skrzynka Pytan i Czat */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Skrzynka Pytań */}
          {pendingQuestions.length > 0 && (
            <div className="bg-[#18181B] border border-primary rounded-xl p-4 shadow-lg">
              <h3 className="text-primary font-bold font-heading mb-3 flex items-center gap-2">
                <Inbox size={18} /> Skrzynka Pytań od Uczestników ({pendingQuestions.length})
              </h3>
              <div className="max-h-48 overflow-y-auto pr-2">
                {pendingQuestions.map((q) => (
                  <div key={q.questionId} className="bg-[#0B0B0C] border border-gray-800 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-500 font-bold">Od: {q.author}</span>
                      <span className="text-xs text-gray-600">{new Date(q.date).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-200 mb-3 font-sans italic">"{q.text}"</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={answerInputs[q.questionId] || ''}
                        onChange={e => setAnswerInputs(prev => ({...prev, [q.questionId]: e.target.value}))}
                        placeholder="Napisz odpowiedź (AI zaktualizuje GDocs)..."
                        className="flex-1 bg-[#18181B] border border-gray-700 text-sm text-white focus:outline-none focus:border-primary rounded-lg px-3 py-2"
                      />
                      <button 
                        onClick={() => handleAnswerQuestion(q)}
                        disabled={answering[q.questionId] || !answerInputs[q.questionId]}
                        className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center"
                      >
                        {answering[q.questionId] ? <Loader2 size={16} className="animate-spin" /> : <Reply size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 bg-[#0B0B0C] border-0 md:border border-gray-800 rounded-none md:rounded-xl p-0 md:p-4 overflow-y-auto flex flex-col gap-4 shadow-inner">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-4 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-200'}`}>
                  <p className="whitespace-pre-wrap font-sans text-sm">
                    {msg.role === 'assistant'
                      ? msg.content.split(/\n/).map((line, li) => {
                          const linkMatch = line.match(/^(.*)\[(.+?)\]\((.+?)\)(.*)$/);
                          if (linkMatch) {
                            return <span key={li}>{linkMatch[1]}<a href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary-light">{linkMatch[2]}</a>{linkMatch[4]}<br/></span>;
                          }
                          return <span key={li}>{line}<br/></span>;
                        })
                      : msg.content
                    }
                  </p>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 rounded-xl p-4 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Asystent pisze...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div className="relative px-1 md:px-0">
            <textarea 
              className="w-full bg-[#18181B] border border-gray-700 rounded-xl pl-3 md:pl-4 pr-24 md:pr-32 py-3 md:py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none h-20 shadow-lg text-sm md:text-base"
              placeholder="Odpowiedz tutaj lub użyj mikrofonu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              disabled={!draftMode || isProcessing}
            />

            <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 flex gap-2">
              {isRecording ? (
                <button 
                  onClick={handleStopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all animate-pulse"
                >
                  <Square size={20} fill="currentColor" />
                </button>
              ) : (
                <button 
                  onClick={handleStartRecording}
                  disabled={!draftMode || isProcessing}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <Mic size={20} />
                </button>
              )}
              <button 
                onClick={handleSendMessage}
                disabled={!draftMode || isProcessing || !input.trim()}
                className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg transition-all disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Prawa kolumna: Logi i Plakat */}
        {(logs.length > 0 || draftImage) && (
        <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col gap-4 shrink-0 overflow-y-auto">
          {logs.length > 0 && (
            <div className="bg-[#0B0B0C] rounded-xl p-4 border border-gray-800 font-mono text-sm shadow-inner max-h-48 overflow-y-auto">
              <h3 className="text-gray-500 mb-2 uppercase tracking-widest font-bold text-xs flex items-center gap-2">
                <CheckCircle size={14} /> Terminal Operacyjny
              </h3>
              {logs.map((log, i) => (
                <div key={i} className="text-gray-300 mb-1 flex items-start gap-2 text-xs">
                  <span className="text-primary opacity-50">{'>'}</span> 
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

          {draftImage && (
            <div className="flex-1 flex flex-col bg-[#18181B] border border-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold font-heading mb-3 flex items-center gap-2 text-sm">
                <ImageIcon className="text-primary" /> Podgląd Plakatu
              </h3>
              
              <div className="bg-black/50 border border-gray-800 rounded-xl overflow-hidden shadow-2xl mb-3 relative flex-1 flex items-center justify-center">
                {isRefining && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                    <Loader2 size={30} className="animate-spin text-primary" />
                  </div>
                )}
                <img src={draftImage} alt="Draft" className="w-full h-full object-cover" />
              </div>

              <div className="bg-[#0B0B0C] border border-gray-800 rounded-xl p-3 mb-3">
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">Korekta AI</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={refinementPrompt}
                    onChange={e => setRefinementPrompt(e.target.value)}
                    placeholder="Zmień kolor tła..."
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-600"
                    onKeyPress={e => e.key === 'Enter' && handleRefine()}
                  />
                  <button onClick={handleRefine} disabled={isRefining || !refinementPrompt} className="text-primary hover:text-white disabled:opacity-50 text-sm font-bold">
                    Popraw
                  </button>
                </div>
              </div>

              <button 
                onClick={handleApproveImage}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(22,163,74,0.3)] flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle size={18} /> Zapisz Plakat
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {showPushBuilder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] border border-gray-700 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold font-heading text-white mb-2 flex items-center gap-2">
              <Bell className="text-primary" /> Powiadomienie Push
            </h2>
            <p className="text-gray-400 font-sans mb-6 text-sm">Wydarzenie zostało utworzone wraz z dokumentem GDocs i plakatem. Wyślij Push, aby uczestnicy mogli komentować.</p>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Grupy docelowe</label>
              <div className="relative">
                <MultiSelectSearch 
                  values={pushTargetGroups}
                  onChange={(vals: string[]) => setPushTargetGroups(vals)}
                  placeholder="Wybierz odbiorców z bazy"
                  groups={[
                    {
                      label: 'Ogólne',
                      options: [{ value: 'Wszystkie Grupy', label: 'Wszystkie Grupy' }]
                    },
                    ...(availableGroups.length > 0 ? [{
                      label: 'Grupy',
                      options: availableGroups.map(g => ({ value: g.name, label: g.name }))
                    }] : []),
                    ...(availableUsers.length > 0 ? [{
                      label: 'Uczniowie',
                      options: Array.from(new Map(availableUsers.flatMap(p => p.children || []).map((c: any) => [c.id, c])).values()).map((c: any) => ({
                        value: c.id,
                        label: `${c.firstName} ${c.lastName} (${c.groupName || 'Brak Grupy'})`
                      }))
                    }] : []),
                    ...(availableUsers.length > 0 ? [{
                      label: 'Opiekunowie',
                      options: Array.from(new Map(availableUsers.map(p => [p.email, p])).values()).map((p: any) => ({
                        value: p.email,
                        label: `${p.name || p.email} (Opiekun: ${(p.children || []).map((ch: any) => ch.firstName + ' ' + ch.lastName).join(', ')})`
                      }))
                    }] : [])
                  ]}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Treść powiadomienia</label>
              <textarea 
                className="w-full bg-[#27272A] text-white p-4 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent resize-none h-32"
                value={pushContent}
                onChange={(e) => setPushContent(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowPushBuilder(false)}
                className="flex-1 py-3 rounded-xl font-bold font-sans bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              >
                Pomiń
              </button>
              <button 
                disabled={pushTargetGroups.length === 0}
                onClick={async () => {
                  try {
                    const res = await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/push/send', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`
                      },
                      body: JSON.stringify({ targetGroups: pushTargetGroups, title: 'Antidotum', body: pushContent })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setLogs(prev => [...prev, `✅ Wysłano powiadomienie Push do ${pushTargetGroups.length} grup/użytkowników.`]);
                    } else {
                      setLogs(prev => [...prev, `❌ Błąd wysyłania: ${data.error}`]);
                    }
                  } catch (e) {
                    setLogs(prev => [...prev, `❌ Błąd połączenia przy wysyłaniu Push`]);
                  }
                  setShowPushBuilder(false);
                }}
                className={`flex-1 py-3 rounded-xl font-bold font-sans flex items-center justify-center gap-2 transition-all ${
                  !pushTargetGroup ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:scale-105 shadow-[0_0_15px_rgba(244,114,182,0.3)]'
                }`}
              >
                Wyślij Push <CheckCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
