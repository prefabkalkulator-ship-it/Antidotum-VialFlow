const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

// 1. InstallPrompt
content = content.replace(
  "<SafeAreaView style={styles.container}>\n      <TouchableOpacity style={{position: 'absolute'",
  "<SafeAreaView style={styles.container}>\n      {Platform.OS === 'web' && <InstallPrompt />}\n      <TouchableOpacity style={{position: 'absolute'"
);

// 2. TTS msgId (Push Draft)
content = content.replace(
  "setMessages(prev => [...prev, {\n          id: Date.now().toString(),\n          sender: 'ai',",
  "const msgId = Date.now().toString();\n        setMessages(prev => [...prev, {\n          id: msgId,\n          sender: 'ai',"
);
content = content.replace(
  "pushDraftStatus: 'draft'\n        } as any]);\n        if (currentInputMethod === 'voice') speakText(aiText);",
  "pushDraftStatus: 'draft'\n        } as any]);\n        if (currentInputMethod === 'voice') speakText(aiText, msgId);"
);

// 3. TTS msgId (Regular AI Chat)
content = content.replace(
  "setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: aiText } as any]);\n      if (currentInputMethod === 'voice') speakText(aiText);",
  "const msgId = Date.now().toString();\n      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: aiText } as any]);\n      if (currentInputMethod === 'voice') speakText(aiText, msgId);"
);

fs.writeFileSync('App.tsx', content);
console.log('Fixes applied.');
