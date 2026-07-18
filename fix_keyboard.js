const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Add keyboardHeight state
if (!appTsx.includes('const [keyboardHeight, setKeyboardHeight] = useState(0);')) {
  appTsx = appTsx.replace(
    "const [isKeyboardVisible, setKeyboardVisible] = useState(false);",
    "const [isKeyboardVisible, setKeyboardVisible] = useState(false);\n  const [keyboardHeight, setKeyboardHeight] = useState(0);"
  );
}

// 2. Update listeners
if (!appTsx.includes('setKeyboardHeight(e.endCoordinates.height)')) {
  appTsx = appTsx.replace(
    "const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));",
    "const showSub = Keyboard.addListener('keyboardDidShow', (e) => { setKeyboardVisible(true); setKeyboardHeight(e.endCoordinates.height); });"
  );
  appTsx = appTsx.replace(
    "const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));",
    "const hideSub = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); setKeyboardHeight(0); });"
  );
}

// 3. Update ChatScreen props passing
appTsx = appTsx.replace(
  "<ChatScreen isKeyboardVisible={isKeyboardVisible} />",
  "<ChatScreen isKeyboardVisible={isKeyboardVisible} keyboardHeight={keyboardHeight} />"
);

// 4. Update ChatScreen component signature
appTsx = appTsx.replace(
  "function ChatScreen({ isKeyboardVisible }: { isKeyboardVisible?: boolean }) {",
  "function ChatScreen({ isKeyboardVisible, keyboardHeight }: { isKeyboardVisible?: boolean, keyboardHeight?: number }) {"
);

// 5. Update ChatScreen paddingBottom
appTsx = appTsx.replace(
  "paddingBottom: isKeyboardVisible ? 20 : 130",
  "paddingBottom: isKeyboardVisible ? (keyboardHeight || 0) + 20 : 130"
);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for exact keyboard height mapping');
