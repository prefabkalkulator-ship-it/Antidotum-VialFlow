const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Add Send icon import
appTsx = appTsx.replace(
  "import { User, Clock, MapPin, ChevronRight, CreditCard, ScanLine, Smartphone, Camera, CheckCircle2, Loader2, Sparkles, ShieldCheck, LogOut, FlaskConical, Calendar, CalendarDays, Mic, Square, Volume2, Edit2 } from 'lucide-react-native';",
  "import { User, Clock, MapPin, ChevronRight, CreditCard, ScanLine, Smartphone, Camera, CheckCircle2, Loader2, Sparkles, ShieldCheck, LogOut, FlaskConical, Calendar, CalendarDays, Mic, Square, Volume2, Edit2, Send } from 'lucide-react-native';"
);

// 2. Replace ChatScreen STT hooks and functions
const oldSTT = `  useEffect(() => {
    triggerSendRef.current = handleSend;
  });

  useEffect(() => {
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

const newSTT = `  useEffect(() => {
    triggerSendRef.current = handleSend;
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results[0]) {
      setInput(event.results[0].transcript);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
        if (triggerSendRef.current) triggerSendRef.current();
      }, 5000);
    }
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    console.log('STT Event Error:', event);
  });

  useEffect(() => {
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

  const startListening = async () => {
    setIsListening(true);
    setInputMethod('voice');
    if (Platform.OS !== 'web') {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          Alert.alert('Błąd', 'Brak uprawnień do mikrofonu.');
          setIsListening(false);
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: "pl-PL",
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: true,
        });
      } catch (e) {
        console.log('STT Error:', e);
        setIsListening(false);
      }
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
      if (triggerSendRef.current) triggerSendRef.current();
    }, 5000);
  };

  const stopListening = () => {
    setIsListening(false);
    if (Platform.OS !== 'web') {
      ExpoSpeechRecognitionModule.stop();
    } else {
      if (recognitionRef.current) recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };`;

appTsx = appTsx.replace(oldSTT, newSTT);

// 3. Add Keyboard.dismiss() to handleSend
appTsx = appTsx.replace(
  "  const handleSend = async () => {\n    if (!input.trim()) return;\n    stopListening();",
  "  const handleSend = async () => {\n    if (!input.trim()) return;\n    Keyboard.dismiss();\n    stopListening();"
);

// 4. Update KeyboardAvoidingView & Layout
// Old: <KeyboardAvoidingView style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 100 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={60}>
// New: <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}><View style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 110 }}>
appTsx = appTsx.replace(
  "<KeyboardAvoidingView style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 100 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={60}>",
  "<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>\n      <View style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 110 }}>"
);
// We need to add closing </View> before </KeyboardAvoidingView>
// Instead of complex regex, let's just replace the exact end part:
const oldChatEnd = `            <TouchableOpacity style={{ backgroundColor: COLORS.primary, padding: 15, borderRadius: 15, justifyContent: 'center', height: 50 }} onPress={handleSend}>
              <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Wyślij</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}`;

const newChatEnd = `            <TouchableOpacity style={{ backgroundColor: COLORS.primary, padding: 10, borderRadius: 15, justifyContent: 'center', alignItems: 'center', height: 50, width: 50 }} onPress={handleSend}>
              <Send color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>
        </>
      )}
      </View>
    </KeyboardAvoidingView>
  );
}`;

appTsx = appTsx.replace(oldChatEnd, newChatEnd);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for Chat UI and STT');
