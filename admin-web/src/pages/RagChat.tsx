import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, FileText, Loader2, Check, Bell, Mic, X, ChevronDown, Volume2, Square } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isPushDraft?: boolean;
  pushDraftContent?: string;
  pushDraftStatus?: 'draft' | 'approved' | 'sent' | 'dismissed';
  pushTargetGroup?: string;
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
            
            // Auto submit po 5 sekundach ciszy
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              stopListening();
              document.getElementById('hiddenSendBtn')?.click();
            }, 5000);
          }
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
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
       stopListening();
       document.getElementById('hiddenSendBtn')?.click();
    }, 5000);
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const speakText = (text: string, msgId?: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utteranceId = Math.random().toString();
    (window as any).activeUtteranceId = utteranceId;

    setIsSpeaking(true);
    if (msgId) setSpeakingMsgId(msgId);
    
    const utterance = new SpeechSynthesisUtterance(text);
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
      setTimeout(() => {
        setIsTyping(false);
        const aiMsgId = (Date.now() + 1).toString();
        const aiText = 'Przygotowałem szkic powiadomienia Push. Sprawdź, czy wszystko się zgadza:';
        setMessages(prev => [...prev, {
          id: aiMsgId,
          sender: 'ai',
          text: aiText,
          isPushDraft: true,
          pushDraftContent: "Hej! 👋 Przypominamy o jutrzejszej zbiórce koło szkoły punktualnie o 9:00. Pamiętajcie o zabraniu strojów! Widzimy się! 💃🕺",
          pushDraftStatus: 'draft'
        }]);
        if (currentInputMethod === 'voice') speakText(aiText, aiMsgId);
      }, 1500);
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/rag/chat', {
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

  const approvePush = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { 
          ...m, 
          pushDraftStatus: 'sent', 
          text: `✅ Powiadomienie: "${m.pushDraftContent}" zostało pomyślnie wysłane do grupy: ${m.pushTargetGroup}` 
        };
      }
      return m;
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const [isRecordingPush, setIsRecordingPush] = useState(false);

  const handleVoiceRefinePush = (msgId: string) => {
    setIsRecordingPush(true);
    setTimeout(() => {
      setIsRecordingPush(false);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pushDraftContent: m.pushDraftContent + ' [Korekta dodana głosowo]' } : m));
    }, 2000);
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

                    <div className="relative mb-4">
                      <select 
                        className="w-full bg-[#27272A] text-white p-3 pr-12 rounded-lg font-sans text-sm focus:outline-none focus:border-primary border border-transparent appearance-none cursor-pointer"
                        value={msg.pushTargetGroup || ''}
                        onChange={(e) => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pushTargetGroup: e.target.value } : m))}
                      >
                        <option value="" disabled>-- Wybierz grupę docelową --</option>
                        <option value="Wszystkie Grupy">Wszystkie Grupy</option>
                        <option value="Modern Jazz">Modern Jazz</option>
                        <option value="Hip-Hop">Hip-Hop</option>
                        <option value="Balet">Balet</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVoiceRefinePush(msg.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold font-sans transition-colors ${isRecordingPush ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
                      >
                        <Mic size={16} /> {isRecordingPush ? 'Słucham...' : 'Popraw'}
                      </button>
                      <button 
                        onClick={() => approvePush(msg.id)}
                        disabled={!msg.pushTargetGroup}
                        className={`flex-1 text-white py-2 rounded-lg font-bold font-sans flex items-center justify-center gap-2 transition-all hover:scale-105 ${!msg.pushTargetGroup ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary-dark'}`}
                      >
                        Wyślij <Check size={18} />
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
        <div className="p-2 md:p-4 border-t border-gray-800 bg-[#18181B] relative">
          
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
