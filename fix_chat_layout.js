const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Add isKeyboardVisible state to App
const appInitOld = `export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [role, setRole] = useState<'Administrator' | 'Instruktor' | 'Rodzic' | 'Uczen_Dorosly' | 'Uczen_Nieletni' | 'guest' | null>(null);`;

const appInitNew = `export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [role, setRole] = useState<'Administrator' | 'Instruktor' | 'Rodzic' | 'Uczen_Dorosly' | 'Uczen_Nieletni' | 'guest' | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);`;

appTsx = appTsx.replace(appInitOld, appInitNew);

// 2. Hide TabBar when keyboard is visible
const tabBarOld = `<View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}`;

const tabBarNew = `{!isKeyboardVisible && (
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}`;

appTsx = appTsx.replace(tabBarOld, tabBarNew);

const tabBarEndOld = `            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profil</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );`;

const tabBarEndNew = `            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profil</Text>
          </TouchableOpacity>
        )}
      </View>
      )}
    </View>
  );`;

appTsx = appTsx.replace(tabBarEndOld, tabBarEndNew);

// 3. Update ChatScreen definition to accept isKeyboardVisible and fix layout
const chatScreenOld = `function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);`;

const chatScreenNew = `function ChatScreen({ isKeyboardVisible }: { isKeyboardVisible?: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);`;

appTsx = appTsx.replace(chatScreenOld, chatScreenNew);

// 4. Pass isKeyboardVisible to ChatScreen
const chatRenderOld = `{activeTab === 'chat' && <ChatScreen />}`;
const chatRenderNew = `{activeTab === 'chat' && <ChatScreen isKeyboardVisible={isKeyboardVisible} />}`;
appTsx = appTsx.replace(chatRenderOld, chatRenderNew);

// 5. Update ChatScreen KeyboardAvoidingView and padding
const chatLayoutOld = `  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 110 }}>`;

const chatLayoutNew = `  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: isKeyboardVisible ? 20 : 130 }}>`;

appTsx = appTsx.replace(chatLayoutOld, chatLayoutNew);

const chatLayoutEndOld = `      )}
      </View>
    </KeyboardAvoidingView>
  );
}`;

const chatLayoutEndNew = `      )}
      </View>
    </View>
  );
}`;

appTsx = appTsx.replace(chatLayoutEndOld, chatLayoutEndNew);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for ChatScreen keyboard fixes');
