import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Sparkles, Mic, MicOff, RefreshCw, Send, X, AlertCircle, Calendar, User } from 'lucide-react';

interface QuestionItem {
  sheetRow: number;
  questionId: string;
  docId: string;
  eventId?: string;
  eventTitle?: string;
  author: string;
  text: string;
  date: string;
  status: string;
}

export default function EventQuestions({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active question for reaction modal
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);
  const [directive, setDirective] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [previewDraft, setPreviewDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/events/questions/pending');
      if (!res.ok) throw new Error('Błąd sieci');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setQuestions(list);
      if (onCountChange) onCountChange(list.length);
    } catch (err) {
      setError('Nie udało się pobrać oczekujących pytań.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleMarkAsRead = async (sheetRow: number) => {
    try {
      const res = await fetch(`/api/events/questions/${sheetRow}/mark-answered`, {
        method: 'POST'
      });
      if (res.ok) {
        setQuestions(prev => {
          const next = prev.filter(q => q.sheetRow !== sheetRow);
          if (onCountChange) onCountChange(next.length);
          return next;
        });
      }
    } catch (e) {
      alert('Błąd podczas zmiany statusu.');
    }
  };

  // Web Speech API - Voice Dictation
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Twoja przeglądarka nie obsługuje bezpośredniego rozpoznawania mowy. Wpisz tekst ręcznie.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pl-PL';
      recognition.continuous = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDirective(prev => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.start();
    } catch (err) {
      setIsRecording(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!activeQuestion) return;
    setIsGenerating(true);
    setPreviewDraft('');
    try {
      const res = await fetch('/api/events/questions/preview-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: activeQuestion.docId,
          originalQuestion: activeQuestion.text,
          author: activeQuestion.author,
          directive: directive
        })
      });
      const data = await res.json();
      if (data.success && data.draft) {
        setPreviewDraft(data.draft);
      } else {
        alert(data.error || 'Błąd generowania propozycji przez AI.');
      }
    } catch (err) {
      alert('Błąd połączenia z backendem.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveRewrite = async () => {
    if (!activeQuestion || !previewDraft) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/questions/${activeQuestion.sheetRow}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: activeQuestion.docId,
          approvedContent: previewDraft
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(prev => {
          const next = prev.filter(q => q.sheetRow !== activeQuestion.sheetRow);
          if (onCountChange) onCountChange(next.length);
          return next;
        });
        setActiveQuestion(null);
        setDirective('');
        setPreviewDraft('');
      } else {
        alert('Nie udało się zapisać dokumentu w GDocs.');
      }
    } catch (err) {
      alert('Błąd podczas zapisywania zmian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light flex items-center gap-3">
            <MessageSquare className="text-primary" size={32} /> Pytania & Komentarze
          </h1>
          <p className="text-gray-400 mt-1">
            Zarządzaj pytaniami od uczestników i uzupełniaj opisy wydarzeń w Google Docs.
          </p>
        </div>
        <button 
          onClick={fetchQuestions}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition-colors shrink-0"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Odśwież
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-surface border border-gray-800 rounded-2xl p-12 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Brak oczekujących pytań!</h3>
          <p className="text-gray-400">Wszystkie zapytania od uczniów zostały rozwiązane lub przeczytane.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questions.map((q) => (
            <div key={q.sheetRow} className="bg-surface border border-gray-800 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-colors shadow-lg">
              <div>
                {/* Nagłówek wydarzenia */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar size={16} className="text-primary shrink-0" />
                    <span className="text-sm font-bold text-primary truncate">
                      {q.eventTitle || 'Wydarzenie'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    Oczekuje
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1 font-bold text-gray-300">
                    <User size={14} className="text-gray-500" /> {q.author}
                  </span>
                  <span>{new Date(q.date).toLocaleDateString('pl-PL')}</span>
                </div>

                <div className="bg-black/60 border border-gray-800 rounded-xl p-3.5 mb-5">
                  <p className="text-gray-200 text-sm leading-relaxed italic">"{q.text}"</p>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <button
                  onClick={() => handleMarkAsRead(q.sheetRow)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-xs font-semibold"
                >
                  <CheckCircle size={14} /> Przeczytane
                </button>
                <button
                  onClick={() => {
                    setActiveQuestion(q);
                    setDirective('');
                    setPreviewDraft('');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white transition-all hover:shadow-[0_0_15px_rgba(244,114,182,0.4)] text-xs font-bold"
                >
                  <Sparkles size={14} /> Reakcja (AI)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Reakcji AI (Przepływ Dymkowy) */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header Dialogu */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-background font-bold shadow-[0_0_15px_rgba(244,114,182,0.3)]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reakcja Organizatora (AI)</h3>
                  <p className="text-xs text-gray-400">Pytanie uczestnika: <span className="text-primary font-semibold">{activeQuestion.author}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setActiveQuestion(null)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#0B0B0C]">
              
              {/* Dymek 1: Pytanie od Uczestnika */}
              <div className="flex flex-col items-start max-w-[90%]">
                <div className="bg-gray-800/90 border border-gray-700 text-gray-100 rounded-2xl rounded-tl-none p-4 shadow-md w-full">
                  <div className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5">
                    <Calendar size={13} /> {activeQuestion.eventTitle || 'Wydarzenie'}
                  </div>
                  <p className="text-sm font-medium leading-relaxed">"{activeQuestion.text}"</p>
                  <span className="text-[10px] text-gray-400 mt-2 block text-right">Autor: {activeQuestion.author}</span>
                </div>
                
                {/* Dopisek pod dymkiem pytania */}
                <div className="mt-2 text-xs font-bold text-primary flex items-center gap-1.5 pl-2">
                  <span>👉 Co dodać do opisu wydarzenia?</span>
                </div>
              </div>

              {/* Obszar Dyktowania / Wprowadzania wytycznych */}
              <div className="bg-surface border border-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Wpisz lub podyktuj wytyczną:</span>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                    }`}
                  >
                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {isRecording ? 'Nagrywanie...' : 'Dyktuj głosowo'}
                  </button>
                </div>
                <textarea
                  value={directive}
                  onChange={e => setDirective(e.target.value)}
                  placeholder="np. Dopisz, że na półkolonie obowiązują tylko różowe stroje..."
                  className="w-full bg-black/60 border border-gray-700 rounded-xl p-3.5 text-white placeholder-gray-500 focus:border-primary focus:outline-none min-h-[80px] text-sm resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={isGenerating || !directive.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark hover:brightness-110 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 shadow-md"
                  >
                    {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    {isGenerating ? 'Przepisywanie opisu...' : 'Generuj zmianę (AI)'}
                  </button>
                </div>
              </div>

              {/* Dymek 2: Propozycja Nowej Treści AI */}
              {previewDraft && (
                <div className="flex flex-col items-end w-full space-y-2 animate-fadeIn">
                  <div className="bg-primary/10 border border-primary/30 text-gray-100 rounded-2xl rounded-tr-none p-4 shadow-lg w-full">
                    <div className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                      <Sparkles size={14} /> Propozycja zaktualizowanego opisu .gdocx:
                    </div>
                    <textarea
                      value={previewDraft}
                      onChange={e => setPreviewDraft(e.target.value)}
                      rows={8}
                      className="w-full bg-black/80 border border-gray-700 rounded-xl p-3 text-gray-200 text-xs font-mono focus:border-primary focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Dopisek pod odpowiedzią AI */}
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 pr-2">
                    <span>⚠️ Proszę zatwierdzić zmianę</span>
                  </div>
                </div>
              )}

            </div>

            {/* Footer z Przyciskami */}
            <div className="p-5 border-t border-gray-800 flex justify-end gap-3 bg-surface">
              <button
                onClick={() => setActiveQuestion(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleApproveRewrite}
                disabled={!previewDraft || isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(22,163,74,0.3)]"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                {isSubmitting ? 'Zapisywanie w GDocs...' : 'Zatwierdź zmianę'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
