const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

// 1. Add missing imports
if (!content.includes('import InstallPrompt')) {
  content = content.replace(
    "import QRCode from 'react-native-qrcode-svg';",
    "import QRCode from 'react-native-qrcode-svg';\nimport InstallPrompt from './components/InstallPrompt';\nimport QRScannerModal from './components/QRScannerModal';"
  );
}

// 2. Add InstallPrompt component render
if (!content.includes('<InstallPrompt />')) {
  content = content.replace(
    "    <SafeAreaView style={styles.container}>\n      <TouchableOpacity",
    "    <SafeAreaView style={styles.container}>\n      {Platform.OS === 'web' && <InstallPrompt />}\n      <TouchableOpacity"
  );
}

// 3. Fix ChatScreen TTS msgId
content = content.replace(
  "setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: aiText } as any]);\n      if (currentInputMethod === 'voice') speakText(aiText);",
  "const msgId = Date.now().toString();\n      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: aiText } as any]);\n      if (currentInputMethod === 'voice') speakText(aiText, msgId);"
);

// 4. Fix ChatScreen push draft TTS msgId
content = content.replace(
  "const aiText = 'Przygotowa³em szkic powiadomienia Push. SprawdŸ, czy wszystko siê zgadza:';\n        setMessages(prev => [...prev, {\n          id: Date.now().toString(),",
  "const aiText = 'Przygotowa³em szkic powiadomienia Push. SprawdŸ, czy wszystko siê zgadza:';\n        const msgId = Date.now().toString();\n        setMessages(prev => [...prev, {\n          id: msgId,"
);
content = content.replace(
  "pushDraftStatus: 'draft'\n        } as any]);\n        if (currentInputMethod === 'voice') speakText(aiText);",
  "pushDraftStatus: 'draft'\n        } as any]);\n        if (currentInputMethod === 'voice') speakText(aiText, msgId);"
);

// 5. Fix Web container height
content = content.replace(
  "container: { flex: 1, backgroundColor: COLORS.background },",
  "container: { flex: 1, backgroundColor: COLORS.background, height: Platform.OS === 'web' ? '100vh' : '100%' },"
);

fs.writeFileSync('App.tsx', content);
console.log('Final fixes applied!');
