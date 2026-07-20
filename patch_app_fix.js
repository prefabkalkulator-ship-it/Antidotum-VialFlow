const fs = require('fs');

let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Fix ChatScreen usage
code = code.replace(
  "{activeTab === 'chat' && <ChatScreen isKeyboardVisible={isKeyboardVisible} keyboardHeight={keyboardHeight} />}",
  "{activeTab === 'chat' && <ChatScreen userData={userData} isKeyboardVisible={isKeyboardVisible} keyboardHeight={keyboardHeight} />}"
);

// 2. Fix ChatScreen definition
code = code.replace(
  "function ChatScreen({ isKeyboardVisible, keyboardHeight }: { isKeyboardVisible?: boolean, keyboardHeight?: number }) {",
  "function ChatScreen({ userData, isKeyboardVisible, keyboardHeight }: { userData?: any, isKeyboardVisible?: boolean, keyboardHeight?: number }) {"
);

// 3. Fix user -> userData in ChatScreen body
// Note: we replace specific occurrences of 'user' inside ChatScreen related to notifications
code = code.replace(
  "if (!user) return;",
  "if (!userData) return;"
);
code = code.replace(
  "groupId=${user.groupId || ''}",
  "groupId=${userData.groupId || userData.id || ''}"
);
code = code.replace(
  "}, [viewMode, user]);",
  "}, [viewMode, userData]);"
);

fs.writeFileSync('mobile-app/App.tsx', code);
console.log("Patched App.tsx to fix user reference!");
