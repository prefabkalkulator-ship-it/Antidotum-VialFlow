const fs = require('fs');
let c = fs.readFileSync('App.tsx', 'utf8');

// Fix 1: apiFetch Bearer token
c = c.replace(
  "init.headers = { ...init.headers, 'Authorization': 'Bearer ' };",
  "init.headers = { ...init.headers, 'Authorization': 'Bearer ' + (token ? token : '') };"
);

// Fix 2: Połącz urządzenie ucznia (Parowanie) wyrównane po środku
c = c.replace(
  "<Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Połącz urządzenie ucznia (Parowanie)</Text>",
  "<Text style={{ color: COLORS.primary, fontWeight: 'bold', textAlign: 'center' }}>Połącz urządzenie ucznia (Parowanie)</Text>"
);

// Fix 3 & 4: Asystent paddingBottom and KeyboardAvoidingView
// Find the view that wraps AssistantScreen content
c = c.replace(
  "<View style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 100 }}>",
  "<KeyboardAvoidingView style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 150 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>"
);
// replace closing tag for AssistantScreen
c = c.replace(
  "        </View>\n        {/* DOLNY PASEK NAWIGACJI */}",
  "        </KeyboardAvoidingView>\n        {/* DOLNY PASEK NAWIGACJI */}"
);

// We need to also wrap the input area inside AssistantScreen with extra padding
// We find: "<View style={{ flexDirection: 'row', alignItems: 'center' }}>" which is the chat input container
c = c.replace(
  "<View style={{ flexDirection: 'row', alignItems: 'center' }}>\n            {currentInputMethod === 'text' ? (",
  "<View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 20 }}>\n            {currentInputMethod === 'text' ? ("
);

// Fix 5: Szkic powiadomienia (Instruktor, Administrator width)
c = c.replace(
  /<TouchableOpacity\s+key=\{role\}\s+style=\{\[\s*styles\.roleButton,\s*selectedTargetRoles\.includes\(role\)\s*\?\s*styles\.roleButtonActive\s*:\s*null,\s*\{\s*width:\s*100/g,
  "<TouchableOpacity key={role} style={[styles.roleButton, selectedTargetRoles.includes(role) ? styles.roleButtonActive : null, { paddingHorizontal: 15"
);

// Fix 6: Speech-to-Text and Text-to-Speech
// Replace import
c = c.replace(
  "import { User, Clock, MapPin, ChevronRight, CreditCard, ScanLine, Smartphone, Camera, CheckCircle2, Loader2, Sparkles, ShieldCheck, LogOut, FlaskConical, Calendar, CalendarDays, Mic, Square, Volume2, Edit2 } from 'lucide-react-native';",
  "import { User, Clock, MapPin, ChevronRight, CreditCard, ScanLine, Smartphone, Camera, CheckCircle2, Loader2, Sparkles, ShieldCheck, LogOut, FlaskConical, Calendar, CalendarDays, Mic, Square, Volume2, Edit2 } from 'lucide-react-native';\nimport * as Speech from 'expo-speech';\nimport ExpoSpeechRecognitionModule, { useSpeechRecognitionEvent } from 'expo-speech-recognition';"
);

// Replace speakText
c = c.replace(
  /const speakText = \(text: string, msgId\?: string\) => \{[\s\S]*?^\s*};\s*$/m,
  `const speakText = (text: string, msgId?: string) => {
    setIsSpeaking(true);
    if (msgId) setSpeakingMsgId(msgId);
    Speech.speak(text, {
      language: 'pl-PL',
      onDone: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
      onStopped: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
      onError: () => { setIsSpeaking(false); setSpeakingMsgId(null); }
    });
  };`
);

// Replace stopSpeaking
c = c.replace(
  /const stopSpeaking = \(\) => \{[\s\S]*?^\s*};\s*$/m,
  `const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  };`
);

fs.writeFileSync('App.tsx', c, 'utf8');
console.log('App.tsx modified.');
