import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Sparkles, Mic, MicOff, RefreshCw, Send, X, AlertCircle } from 'lucide-react';

interface QuestionItem {
  sheetRow: number;
  questionId: string;
  docId: string;
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
            Zarządzaj otwartymi pytaniami od uczniów oraz wprowadzaj wytyczne dla AI do aktualizacji opisów w Google Docs.
          </p>
        </div>
        <button 
          onClick={fetchQuestions}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.map((q) => (
            <div key={q.sheetRow} className="bg-surface border border-gray-800 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-700 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Oczekujące
                  </span>
                  <span className="text-xs text-gray-500">{new Date(q.date).toLocaleString('pl-PL')}</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Autor: {q.author}</h4>
                <p className="text-xs text-gray-500 mb-4 font-mono">Doc ID: {q.docId}</p>
                <div className="bg-black/50 border border-gray-800 rounded-xl p-4 mb-6">
                  <p className="text-gray-200 text-sm leading-relaxed">"{q.text}"</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  onClick={() => handleMarkAsRead(q.sheetRow)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-sm font-semibold"
                >
                  <CheckCircle size={16} /> Przeczytane
                </button>
                <button
                  onClick={() => {
                    setActiveQuestion(q);
                    setDirective('');
                    setPreviewDraft('');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white transition-all hover:shadow-[0_0_15px_rgba(244,114,182,0.4)] text-sm font-bold"
                >
                  <Sparkles size={16} /> Reakcja (AI)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Reakcji (AI Rewrite) */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Reakcja & Korekta przez AI</h3>
                  <p className="text-xs text-gray-400">Pytanie od: {activeQuestion.author}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveQuestion(null)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-black/50 border border-gray-800 p-4 rounded-xl">
                <span className="text-xs font-bold text-gray-400 block mb-1">Treść pytania:</span>
                <p className="text-white text-sm">"{activeQuestion.text}"</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center justify-between">
                  <span>Wytyczne dla AI (Dyktuj lub Wpisz):</span>
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
                </label>
                <textarea
                  value={directive}
                  onChange={e => setDirective(e.target.value)}
                  placeholder="Napisz lub podyktuj instrukcję (np. Dopisz, że na konkurs wymagane są tylko różowe stroje)..."
                  className="w-full bg-background border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:border-primary focus:outline-none min-h-[90px] text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} className="text-primary" />}
                  {isGenerating ? 'Generowanie...' : 'Generuj zmianę (AI)'}
                </button>
              </div>

              {previewDraft && (
                <div className="space-y-3 pt-4 border-t border-gray-800">
                  <label className="block text-sm font-bold text-primary flex items-center gap-2">
                    <Sparkles size={16} /> Propozycja nowej treści dokumentu GDocs:
                  </label>
                  <textarea
                    value={previewDraft}
                    onChange={e => setPreviewDraft(e.target.value)}
                    rows={10}
                    className="w-full bg-black border border-gray-700 rounded-xl p-4 text-gray-200 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-surface">
              <button
                onClick={() => setActiveQuestion(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleApproveRewrite}
                disabled={!previewDraft || isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {isSubmitting ? 'Zapisywanie...' : 'Zatwierdź i Nadpisz GDocs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
