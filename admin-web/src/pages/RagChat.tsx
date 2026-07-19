import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, FileText, Loader2, Check, Bell, Mic, X, ChevronDown, Volume2, Square } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect'; // Zmienione poniżej
import { MultiSelectSearch } from '../components/MultiSelectSearch';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isPushDraft?: boolean;
  pushDraftContent?: string;
  pushDraftStatus?: 'draft' | 'approved' | 'sent' | 'dismissed';
  pushTargetGroups?: string[];
}

export default function RagChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Cześć! Jestem asystentem Antidotum. Masz pytanie o regulaminy, a może chcesz wysłać powiadomienie Push do uczniów?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text');
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (chatEndRef.current && chatEndRef.current.parentElement) {
        const container = chatEndRef.current.parentElement;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    };
    scrollToBottom();
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);
  }, [messages, isTyping]);

  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/groups')
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setAvailableGroups(data); })
      .catch(console.error);
      
    fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/users')
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setAvailableUsers(data); })
      .catch(console.error);
  }, []);


  const mergeTranscripts = (existing: string, incoming: string) => {
    if (!existing) return incoming.trim();
    if (!incoming) return existing.trim();
    
    const normalize = (str: string) => str.toLowerCase().replace(/[.,?!]/g, '').trim().replace(/\s+/g, ' ');
    const exNorm = normalize(existing);
    const inNorm = normalize(incoming);
    
    const exWords = exNorm.split(' ');
    const inWords = inNorm.split(' ');
    
    let maxOverlap = 0;
    for (let i = 1; i <= Math.min(exWords.length, inWords.length); i++) {
      const suffix = exWords.slice(-i).join(' ');
      const prefix = inWords.slice(0, i).join(' ');
      if (suffix === prefix) {
        maxOverlap = i;
      }
    }
    
    if (maxOverlap > 0) {
      const existingOriginalWords = existing.trim().split(/\s+/);
      const incomingOriginalWords = incoming.trim().split(/\s+/);
      return existingOriginalWords.join(' ') + ' ' + incomingOriginalWords.slice(maxOverlap).join(' ');
    }
    return existing.trim() + ' ' + incoming.trim();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pl-PL';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput(prev => mergeTranscripts(prev, finalTranscript).trim());
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          document.getElementById('hiddenSendBtn')?.click();
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          stopListening();
        };
        recognitionRef.current = recognition;
      }
    }
    return () => stopSpeaking();
  }, []);

  const startListening = () => {
    setIsListening(true);
    setInputMethod('voice');
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch(e) {}
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const speakText = (text: string, msgId?: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utteranceId = Math.random().toString();
    (window as any).activeUtteranceId = utteranceId;

    setIsSpeaking(true);
    if (msgId) setSpeakingMsgId(msgId);
    
    const cleanText = text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .replace(/[*#~_]/g, '')
      .trim();
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pl-PL';
    
    utterance.onstart = () => {
      if ((window as any).activeUtteranceId === utteranceId) {
        setIsSpeaking(true);
        if (msgId) setSpeakingMsgId(msgId);
      }
    };
    utterance.onend = () => {
      if ((window as any).activeUtteranceId === utteranceId) {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      }
    };
    utterance.onerror = () => {
      if ((window as any).activeUtteranceId === utteranceId) {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (isListening) stopListening(); // Jeśli użytkownik zacznie pisać, przerywamy nasłuch
    setInputMethod('text');
    
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 140) + 'px'; // Max ~5 lines
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedFile) return;
    stopListening();
    
    const currentInputMethod = inputMethod;
    const userText = attachedFile ? `[Załącznik: ${attachedFile.name}] ${input}` : input;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    
    const originalInput = input;
    setInput('');
    if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
    setAttachedFile(null);
    setIsTyping(true);

    if (originalInput.toLowerCase().includes('powiadomienie')) {
      setIsTyping(true);
      try {
        const aiMsgId = (Date.now() + 1).toString();
        const aiText = 'Przygotowałem szkic powiadomienia Push. Sprawdź, czy wszystko się zgadza:';
        
        let draftText = originalInput.replace(/Wyślij powiadomienie (do [a-zA-Ząćęłńóśźż]+:\s*)?/i, '').trim();
        if (!draftText) draftText = "Wpisz treść powiadomienia...";

        const res = await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/rag/push-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: originalInput })
        });
        const data = await res.json();
        
        let targetGroups: string[] = [];
        if (data.suggestedTarget) {
          const query = data.suggestedTarget.toLowerCase();
          
          // Lepszy algorytm dopasowania odwrotnego (szukamy czy części nazw występują w zapytaniu)
          if (query.includes('wszys')) {
            targetGroups.push('wszyscy');
          } else {
            // Szukamy w dostępnych grupach
            availableGroups.forEach(g => {
              if (query.includes(g.name.toLowerCase())) targetGroups.push(g.name);
            });
            // Szukamy w uczniach
            availableUsers.flatMap(p => p.children || []).forEach(c => {
              if (query.includes(c.firstName.toLowerCase()) || query.includes(c.lastName.toLowerCase())) {
                targetGroups.push(c.id);
              }
            });
            // Szukamy w rodzicach
            availableUsers.forEach(p => {
              if (p.name && (query.includes(p.name.toLowerCase().split(' ')[0]) || query.includes(p.name.toLowerCase().split(' ')[1] || ''))) {
                targetGroups.push(p.email);
              }
            });
          }
        }
        
        // Unikalne adresaty
        targetGroups = [...new Set(targetGroups)];
        
        if (data.draft) draftText = data.draft;

        setMessages(prev => [...prev, {
          id: aiMsgId,
          sender: 'ai',
          text: aiText,
          isPushDraft: true,
          pushDraftContent: draftText,
          pushTargetGroups: targetGroups,
          pushDraftStatus: 'draft'
        }]);
        if (currentInputMethod === 'voice') speakText(aiText, aiMsgId);
      } catch(e) {
        console.error(e);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    try {
      const res = await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: originalInput }),
      });
      const data = await res.json();
      const aiText = data.answer || 'Błąd generowania odpowiedzi.';
      
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: Message = { id: aiMsgId, sender: 'ai', text: aiText };
      setMessages(prev => [...prev, aiMsg]);
      
      if (currentInputMethod === 'voice') speakText(aiText, aiMsgId);
    } catch (err) {
      setMessages(prev => [...prev, { id: 'err', sender: 'ai', text: 'Błąd połączenia z serwerem.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const approvePush = async (msgId: string) => {
    const draftMsg = messages.find(m => m.id === msgId);
    if (!draftMsg || !draftMsg.pushDraftContent || !draftMsg.pushTargetGroups || draftMsg.pushTargetGroups.length === 0) return;

    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, pushDraftStatus: 'sending' };
      }
      return m;
    }));

    try {
      const res = await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`
        },
        body: JSON.stringify({ 
          targetGroups: draftMsg.pushTargetGroups, 
          title: 'Antidotum', 
          body: draftMsg.pushDraftContent 
        })
      });
      const data = await res.json();
      
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          if (data.success) {
            return { 
              ...m, 
              pushDraftStatus: 'sent', 
              text: `✅ Powiadomienie: "${m.pushDraftContent}" zostało pomyślnie wysłane do ${m.pushTargetGroups?.length} grup/użytkowników (${data.sentCount} urz.)` 
            };
          } else {
            return { ...m, pushDraftStatus: 'sent', text: `❌ Błąd wysyłania: ${data.error}` };
          }
        }
        return m;
      }));
    } catch(e) {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return { ...m, pushDraftStatus: 'sent', text: `❌ Błąd połączenia przy wysyłaniu Push` };
        }
        return m;
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const [isRecordingPush, setIsRecordingPush] = useState(false);

  const handleVoiceRefinePush = (msgId: string) => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Twoja przeglądarka nie wspiera rozpoznawania mowy.");
      return;
    }
    
    setIsRecordingPush(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'pl-PL';
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      const msg = messages.find(m => m.id === msgId);
      if (msg) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pushDraftContent: m.pushDraftContent + ' (Redaguję...)' } : m));
        try {
          const res = await fetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/rag/push-refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentDraft: msg.pushDraftContent, modification: transcript })
          });
          const data = await res.json();
          if (data.draft) {
             setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pushDraftContent: data.draft } : m));
          } else {
             setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pushDraftContent: msg.pushDraftContent } : m));
          }
        } catch(e) {
           setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pushDraftContent: msg.pushDraftContent } : m));
        }
      }
    };
    
    recognition.onerror = () => setIsRecordingPush(false);
    recognition.onend = () => setIsRecordingPush(false);
    
    recognition.start();
  };

  return (
    <div className="p-0 md:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex justify-between items-end px-3 md:px-0 mt-3 md:mt-0">
        <div>
          <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light mb-2">Asystent AI & Push</h1>
          <p className="text-gray-400 font-sans">Zapytaj o dokumenty, nagraj wiadomość głosową lub wyślij powiadomienia</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-surface rounded-none md:rounded-2xl border-0 md:border border-gray-800 shadow-2xl overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-2 md:p-6 space-y-4 md:space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-primary' : 'bg-primary/20'}`}>
                {msg.sender === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-primary" />}
              </div>
              
              <div className={`flex flex-col gap-2 max-w-[90%] md:max-w-[70%]`}>
                <div className={`p-4 rounded-2xl font-sans text-[15px] leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-[#27272A] border border-gray-800 text-gray-200 rounded-tl-none relative'}`}>
                  {msg.text}
                  {msg.sender === 'ai' && (
                    <div className="mt-3 text-right">
                      {isSpeaking && speakingMsgId === msg.id ? (
                        <button 
                          onClick={stopSpeaking}
                          className="text-red-500 hover:text-red-400 transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          title="Zatrzymaj"
                        >
                          <Square size={14} fill="currentColor" /> Stop
                        </button>
                      ) : (
                        <button 
                          onClick={() => speakText(msg.text, msg.id)}
                          className="text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          title="Odtwórz odpowiedź na głos"
                        >
                          <Volume2 size={14} /> Czytaj na głos
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Widżet roboczy dla Powiadomień Push */}
                {msg.isPushDraft && msg.pushDraftStatus === 'draft' && (
                  <div className="mt-2 bg-[#18181B] border border-gray-700 rounded-xl p-5 shadow-lg w-full md:w-[400px] relative">
                    <button 
                      onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pushDraftStatus: 'dismissed', text: 'Szkic powiadomienia został odrzucony.' } : m))}
                      className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                    
                    <div className="flex items-center gap-2 mb-3 text-primary font-bold font-sans">
                      <Bell size={18} /> Szkic Powiadomienia
                    </div>
                    
                    <textarea 
                      className="w-full bg-[#27272A] text-white p-4 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent resize-none h-24 mb-3"
                      value={msg.pushDraftContent}
                      onChange={(e) => {
                         setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pushDraftContent: e.target.value } : m));
                      }}
                    />

                    <div className="mb-4 relative z-50">
                      <MultiSelectSearch 
                        values={msg.pushTargetGroups || []}
                        onChange={(vals) => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pushTargetGroups: vals } : m))}
                        placeholder="Wybierz grupy docelowe..."
                        groups={[
                          {
                            label: 'Ogólne',
                            options: [{ value: 'wszyscy', label: 'Wszyscy użytkownicy' }]
                          },
                          ...(availableGroups.length > 0 ? [{
                            label: 'Grupy',
                            options: availableGroups.map(g => ({ value: g.name, label: g.name }))
                          }] : []),
                          ...(availableUsers.length > 0 ? [{
                            label: 'Uczniowie',
                            // Deduplikacja uczniów
                            options: Array.from(new Map(availableUsers.flatMap(p => p.children || []).map(c => [c.id, c])).values()).map((c: any) => ({
                              value: c.id,
                              label: `${c.firstName} ${c.lastName} (${c.groupName || 'Brak Grupy'})`
                            }))
                          }] : []),
                          ...(availableUsers.length > 0 ? [{
                            label: 'Opiekunowie',
                            // Deduplikacja rodziców
                            options: Array.from(new Map(availableUsers.map(p => [p.email, p])).values()).map((p: any) => ({
                              value: p.email,
                              label: `${p.name || p.email} (Opiekun: ${(p.children || []).map((ch: any) => ch.firstName + ' ' + ch.lastName).join(', ')})`
                            }))
                          }] : [])
                        ]}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVoiceRefinePush(msg.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold font-sans transition-colors border border-[#4a4a50] ${isRecordingPush ? 'bg-red-500 text-white animate-pulse' : 'bg-[#2a2a30] hover:bg-[#3a3a40] text-white'}`}
                      >
                        <Mic size={18} /> {isRecordingPush ? 'Słucham...' : 'Popraw'}
                      </button>
                      <button 
                        onClick={() => approvePush(msg.id)}
                        disabled={!msg.pushTargetGroups || msg.pushTargetGroups.length === 0}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold font-sans transition-colors ${(!msg.pushTargetGroups || msg.pushTargetGroups.length === 0) ? 'bg-primary/50 text-white/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-white shadow-lg'}`}
                      >
                        <Send size={18} /> Wyślij
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-primary" />
              </div>
              <div className="p-4 rounded-2xl bg-[#27272A] text-gray-400 rounded-tl-none flex items-center gap-3 shadow-sm border border-gray-800">
                <Loader2 size={18} className="animate-spin text-primary" /> Asystent myśli...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Sekcja wprowadzania wiadomości */}
        <div className="p-2 md:p-4 pb-8 md:pb-4 border-t border-gray-800 bg-[#18181B] relative">
          
          <div className="absolute -top-12 left-4 flex gap-2">
            <button 
              onClick={() => {
                setInput('Wyślij powiadomienie do uczniów: ');
                setInputMethod('text');
                setTimeout(() => textAreaRef.current?.focus(), 50);
              }}
              className="bg-[#27272A] hover:bg-primary/20 hover:text-primary text-gray-300 border border-gray-700 px-4 py-2 rounded-full text-sm font-sans flex items-center gap-2 transition-colors shadow-lg"
            >
              🚀 Wyślij powiadomienie
            </button>
          </div>
          
          {attachedFile && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 w-max px-4 py-2 rounded-lg mb-3">
              <FileText size={16} className="text-primary" />
              <span className="text-sm font-sans text-primary">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="ml-2 text-gray-400 hover:text-white">&times;</button>
            </div>
          )}

          <div className="flex items-end gap-2 relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept="*/*"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 transition-colors mb-1"
              title="Załącz plik z wiedzą"
            >
              <Paperclip size={20} className="md:w-6 md:h-6" />
            </button>
            
            <div className="flex-1 relative">
              <textarea 
                ref={textAreaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Zapytaj o dokument, załącz plik, lub nagraj wiadomość..."
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-3 md:px-5 py-3 md:py-4 pr-10 md:pr-12 text-white focus:outline-none focus:border-primary font-sans text-sm md:text-[15px] resize-none overflow-y-auto"
                style={{ minHeight: '50px', maxHeight: '140px' }}
              />
              {!input && !isListening && (
                <button 
                  onClick={startListening}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  title="Rozpocznij nasłuchiwanie"
                >
                  <Mic size={20} />
                </button>
              )}
              {isListening && (
                <button 
                  onClick={stopListening}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-400 transition-colors"
                  title="Zatrzymaj nasłuchiwanie"
                >
                   <Mic size={20} className="animate-pulse" />
                </button>
              )}
            </div>
            
            <button 
              id="hiddenSendBtn"
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isTyping}
              className="bg-primary text-white p-3 md:p-4 rounded-xl disabled:opacity-50 hover:bg-primary-dark transition-colors shadow-[0_0_15px_rgba(244,114,182,0.3)] mb-1 shrink-0"
            >
              <Send size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
