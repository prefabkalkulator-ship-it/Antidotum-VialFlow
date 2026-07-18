const fs = require('fs');

let content = fs.readFileSync('C:/Users/Dymitr Mitrafanau/.gemini/antigravity/brain/f89e0706-7f75-431d-9660-ed5e3cb16a54/artifacts/App_copy.tsx', 'utf8');

// 1. Fix BackHandler
content = content.replace(
  "const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);",
  "const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);\n      if (Platform.OS === 'web') {\n        window.history.pushState({ tab: activeTab }, '');\n        const handlePopState = () => {\n          if (activeTab !== 'wallet') { setActiveTab('wallet'); window.history.pushState({ tab: 'wallet' }, ''); }\n        };\n        window.addEventListener('popstate', handlePopState);\n        return () => {\n          backHandler.remove();\n          window.removeEventListener('popstate', handlePopState);\n        };\n      }"
);

// 2. Fix Chat Scroll & Keyboard
content = content.replace(
  "const recognitionRef = useRef<any>(null);",
  "const recognitionRef = useRef<any>(null);\n  const chatScrollRef = useRef<any>(null);"
);
content = content.replace(
  "<ScrollView style={{ flex: 1, marginBottom: 20 }}>",
  "<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} ref={chatScrollRef} style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps=\"handled\" onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({animated: true})}>"
);
content = content.replace(
  "<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10 }}>",
  "<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100} style={{ width: '100%' }}>\n            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10 }}>"
);
content = content.replace(
  "  </TouchableOpacity>\n            </View>\n          </>",
  "  </TouchableOpacity>\n            </View>\n          </KeyboardAvoidingView>\n          </>"
);

// 3. Add KeyboardAvoidingView import
content = content.replace(
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler } from 'react-native';",
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView } from 'react-native';\nimport InstallPrompt from './components/InstallPrompt';"
);

// 4. Add InstallPrompt
content = content.replace(
  "    <SafeAreaView style={styles.safeArea}>",
  "    <SafeAreaView style={styles.safeArea}>\n      <InstallPrompt />"
);

// 5. Add Scanner feature inside WalletScreen
// First find where WalletScreen is defined
content = content.replace(
  "const [showScheduleModal, setShowScheduleModal] = useState(false);",
  "const [showScheduleModal, setShowScheduleModal] = useState(false);\n  const [showScanner, setShowScanner] = useState(false);\n  const [activeChildIdForScan, setActiveChildIdForScan] = useState<string | null>(null);"
);

content = content.replace(
  "const handleScan = async (childId: string) => {\n    setScanningMap(prev => ({...prev, [childId]: true}));",
  "const handleScanClick = (childId: string) => {\n    setActiveChildIdForScan(childId);\n    setShowScanner(true);\n  };\n\n  const handleQRScanResult = async (decodedText: string) => {\n    const childId = activeChildIdForScan;\n    if (!childId) return;\n    setShowScanner(false);\n    setScanningMap(prev => ({...prev, [childId]: true}));\n    try {\n      let tabletData;\n      try {\n        tabletData = JSON.parse(decodedText);\n        if (!tabletData.terminalId) throw new Error(\"Invalid QR\");\n      } catch (e) {\n        throw new Error(\"Nieprawidłowy kod QR\");\n      }\n      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/checkin', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ qrData: JSON.stringify({ terminalId: tabletData.terminalId, childId, timestamp: Date.now() }) })\n      });\n      const data = await res.json();\n      if (data.success) {\n        setCheckedInMap(prev => ({...prev, [childId]: true}));\n      } else {\n        Alert.alert('Błąd', data.error || 'Błąd skanowania');\n      }\n    } catch (err: any) {\n      Alert.alert('Błąd', err.message || 'Błąd połączenia');\n    }\n    setScanningMap(prev => ({...prev, [childId]: false}));\n  };\n\n  const mockHandleScan = async (childId: string) => {\n    setScanningMap(prev => ({...prev, [childId]: true}));"
);

content = content.replace("onPress={() => handleScan(c.id)}", "onPress={() => handleScanClick(c.id)}");

let scannerUI = `
      <Modal visible={showScanner} transparent={true} animationType="fade" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 300, height: 400, backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Skanuj Kod QR</Text>
            {Platform.OS === 'web' ? (
              <div id="reader" style={{ width: 250, height: 250 }}></div>
            ) : (
              <Text style={{ color: COLORS.textMuted }}>Kamera niedostępna w symulatorze</Text>
            )}
            <TouchableOpacity onPress={() => setShowScanner(false)} style={{ marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
`;

let scannerEffect = `
  useEffect(() => {
    if (Platform.OS === 'web' && showScanner) {
      // @ts-ignore
      if (window.Html5QrcodeScanner) {
        // @ts-ignore
        const scanner = new window.Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 200, height: 200 } }, false);
        scanner.render((decodedText: string) => {
          scanner.clear();
          handleQRScanResult(decodedText);
        }, () => {});
        return () => { try { scanner.clear(); } catch(e){} };
      }
    }
  }, [showScanner]);
`;

// Inject Scanner UI at the end of WalletScreen
content = content.replace(
  "      </Modal>\n    </ScrollView>\n  );\n}\n\n// --- EKRAN WYDARZEŃ",
  "      </Modal>\n" + scannerUI + "\n    </ScrollView>\n  );\n}\n\n// --- EKRAN WYDARZEŃ"
);

// Inject effect inside WalletScreen
content = content.replace(
  "const nextClass = getNextClass();",
  scannerEffect + "\n  const nextClass = getNextClass();"
);

// 6. Fix user onboarding text
content = content.replace(
  "👋 Hej! Zrezygnowaliśmy z plastikowych kart. Teraz Twoim biletem na zajęcia jest ten przycisk. Zeskanuj nim kod w recepcji za każdym razem, gdy do nas przyjdziesz.",
  "👋 Hej! Teraz Twoim biletem na zajęcia jest ten przycisk. Zeskanuj nim kod QR w recepcji za każdym razem, gdy przychodzisz na zajęcia. Działa z telefonu ucznia lub opiekuna."
);

// 7. Fix 'Nie pamiętasz PIN'
content = content.replace(
  "window.alert('Skontaktuj się z organizatorem aby zresetować PIN.') : Alert.alert('PIN', 'Skontaktuj się z organizatorem aby zresetować PIN.')",
  "Alert.alert('Nie pamiętasz PIN?', 'Skontaktuj się z recepcją w celu zresetowania PIN-u do profilu.')"
);
content = content.replace(
  "window.alert('Skontaktuj sit z organizatorem aby zresetowa PIN.') : Alert.alert('PIN', 'Skontaktuj sit z organizatorem aby zresetowa PIN.')",
  "Alert.alert('Nie pamiętasz PIN?', 'Skontaktuj się z recepcją w celu zresetowania PIN-u do profilu.')"
);

fs.writeFileSync('C:/Antidotum-VialFlow/mobile-app/App.tsx', content, 'utf8');
console.log("App.tsx restored and properly patched without corruption.");
