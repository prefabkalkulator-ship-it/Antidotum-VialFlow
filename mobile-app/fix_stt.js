const fs = require('fs');
let c = fs.readFileSync('App.tsx', 'utf8');

// The STT logic replacement
const oldSTT = `    useEffect(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
              setInput(prev => (prev + ' ' + finalTranscript).trim());
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                stopListening();
                if (triggerSendRef.current) triggerSendRef.current();
              }, 5000);
            }
          };
  
          recognition.onerror = (e: any) => {
             console.log(e); stopListening();
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
        if (triggerSendRef.current) triggerSendRef.current();
      }, 5000);
    };

    const stopListening = () => {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };`;

const newSTT = `    useSpeechRecognitionEvent('result', (event) => {
      const finalTranscript = event.results[0]?.transcript || '';
      if (finalTranscript) {
        setInput(prev => (prev + ' ' + finalTranscript).trim());
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          if (triggerSendRef.current) triggerSendRef.current();
        }, 5000);
      }
    });

    const startListening = async () => {
      setIsListening(true);
      setInputMethod('voice');
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        alert('Brak uprawnień do mikrofonu');
        setIsListening(false);
        return;
      }
      try {
        await ExpoSpeechRecognitionModule.start({ lang: 'pl-PL' });
      } catch(e) { console.log(e); }
      
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
        if (triggerSendRef.current) triggerSendRef.current();
      }, 5000);
    };

    const stopListening = () => {
      setIsListening(false);
      try { ExpoSpeechRecognitionModule.stop(); } catch(e) {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };`;

c = c.replace(oldSTT, newSTT);

fs.writeFileSync('App.tsx', c, 'utf8');
console.log('App.tsx STT logic modified.');
