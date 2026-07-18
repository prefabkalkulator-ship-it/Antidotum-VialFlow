const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/<SafeAreaView style=\{styles\.container\}>\s*<TouchableOpacity style=\{\{position/g, "<SafeAreaView style={styles.container}>\n      {Platform.OS === 'web' && <InstallPrompt />}\n      <TouchableOpacity style={{position");

content = content.replace(/setMessages\(prev => \[\.\.\.prev, \{\s*id: Date\.now\(\)\.toString\(\),\s*sender: 'ai',/g, "const msgId = Date.now().toString();\n        setMessages(prev => [...prev, {\n          id: msgId,\n          sender: 'ai',");

content = content.replace(/pushDraftStatus: 'draft'\s*\} as any\]\);\s*if \(currentInputMethod === 'voice'\) speakText\(aiText\);/g, "pushDraftStatus: 'draft'\n        } as any]);\n        if (currentInputMethod === 'voice') speakText(aiText, msgId);");

content = content.replace(/setMessages\(prev => \[\.\.\.prev, \{ id: Date\.now\(\)\.toString\(\), sender: 'ai', text: aiText \} as any\]\);\s*if \(currentInputMethod === 'voice'\) speakText\(aiText\);/g, "const msgId = Date.now().toString();\n      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: aiText } as any]);\n      if (currentInputMethod === 'voice') speakText(aiText, msgId);");

fs.writeFileSync('App.tsx', content);
console.log('Regex fixes applied.');
