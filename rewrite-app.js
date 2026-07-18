const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. ScrollView ref
code = code.replace(
  '<ScrollView style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps="handled">',
  '<ScrollView style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps="handled" ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>'
);

if(!code.includes('const scrollViewRef = useRef<any>(null);')) {
  code = code.replace(
    'const inputRef = useRef<TextInput>(null);',
    'const inputRef = useRef<TextInput>(null);\n  const scrollViewRef = useRef<any>(null);'
  );
}

// 2. Padding for Web
code = code.replace(
  'paddingBottom: isKeyboardVisible ? (keyboardHeight || 0) + 20 : 130',
  'paddingBottom: isKeyboardVisible ? (keyboardHeight || 0) + 20 : (Platform.OS === "web" ? 80 : 95)'
);

// 3. Web STT
const webSttOld =         recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput(prev => (prev + ' ' + finalTranscript).trim());;

const webSttNew =         recognition.continuous = false;
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
             currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setInput(currentTranscript.trim());;
code = code.replace(webSttOld, webSttNew);

// 4. Native STT
code = code.replace(
  'addsPunctuation: true,',
  'addsPunctuation: false,'
);

// 5. msgId in handleSend
const handleSendMsgOld =       const aiText = data.answer || 'B³¹d.';
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: aiText } as any]);
      if (currentInputMethod === 'voice') speakText(aiText);;

const handleSendMsgNew =       const aiText = data.answer || 'B³¹d.';
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: aiText } as any]);
      if (currentInputMethod === 'voice') speakText(aiText, msgId);;
code = code.replace(handleSendMsgOld, handleSendMsgNew);

const powiadomienieOld =         const aiText = 'Przygotowa³em szkic powiadomienia Push. SprawdŸ, czy wszystko siê zgadza:';
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ai',
          text: aiText,
          isPushDraft: true,
          pushDraftContent: "Hej! ?? Z powodu problemów technicznych dzisiejsze zajêcia odbêd¹ siê w sali nr 2. Przepraszamy za utrudnienia!",
          pushDraftStatus: 'draft'
        } as any]);
        if (currentInputMethod === 'voice') speakText(aiText);;

const powiadomienieNew =         const aiText = 'Przygotowa³em szkic powiadomienia Push. SprawdŸ, czy wszystko siê zgadza:';
        const msgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: msgId,
          sender: 'ai',
          text: aiText,
          isPushDraft: true,
          pushDraftContent: "Hej! ?? Z powodu problemów technicznych dzisiejsze zajêcia odbêd¹ siê w sali nr 2. Przepraszamy za utrudnienia!",
          pushDraftStatus: 'draft'
        } as any]);
        if (currentInputMethod === 'voice') speakText(aiText, msgId);;
code = code.replace(powiadomienieOld, powiadomienieNew);

// 6. Fix Web Height for container
code = code.replace(
  'container: { flex: 1, backgroundColor: COLORS.background },',
  'container: { flex: 1, backgroundColor: COLORS.background, height: Platform.OS === "web" ? "100vh" : "100%" },'
);

fs.writeFileSync('mobile-app/App.tsx', code, 'utf8');
console.log('Done rewriting App.tsx');
