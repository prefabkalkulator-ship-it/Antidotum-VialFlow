
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Wrap the chat input container in a ScrollView that just handles taps
// Or just KeyboardAvoidingView
// Wait, KeyboardAvoidingView doesn't have keyboardShouldPersistTaps.
// The whole modal content or the view for AI Chat.
// Currently it is:
// {viewMode === 'assistant' ? (
//  <>
//    <ScrollView ...
//    <View style={{ flexDirection: 'row' ...
//  </>
// )}
// Let's wrap it in a React.Fragment? No, it's already in <>
// Let's wrap the chat part in a KeyboardAvoidingView behavior="padding" and put keyboardShouldPersistTaps="handled" on a wrapping ScrollView if necessary.

content = content.replace(
  "{viewMode === 'timeline' ? (",
  "{viewMode === 'timeline' ? ("
);

content = content.replace(
  "<ScrollView ref={chatScrollRef} style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps=\"handled\" onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({animated: true})}>",
  "<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} ref={chatScrollRef} style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps=\"handled\" onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({animated: true})}>"
);

// We need to wrap the whole chat view in KeyboardAvoidingView on iOS/Android
// Actually, react-native KeyboardAvoidingView on Web does nothing, but on native it helps.
content = content.replace(
  "<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10 }}>",
  "<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100} style={{ width: '100%' }}>\n<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10 }}>"
);

content = content.replace(
  "          </KeyboardAvoidingView>\n          </>\n        )}",
  "" // wait, we just need to close KeyboardAvoidingView
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Applied flexGrow");

