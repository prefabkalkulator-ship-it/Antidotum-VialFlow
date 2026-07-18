const fs = require('fs');
let content = fs.readFileSync('C:/Antidotum-VialFlow/mobile-app/App.tsx', 'utf8');

// Add showScanner state
content = content.replace(
  "const [showScheduleModal, setShowScheduleModal] = useState(false);",
  "const [showScheduleModal, setShowScheduleModal] = useState(false);\n  const [showScanner, setShowScanner] = useState(false);\n  const [activeChildIdForScan, setActiveChildIdForScan] = useState<string | null>(null);"
);

// Replace handleScan with handleScanClick
content = content.replace(
  "const handleScan = async (childId: string) => {\n    setScanningMap(prev => ({...prev, [childId]: true}));",
  "const handleScanClick = (childId: string) => {\n    setActiveChildIdForScan(childId);\n    setShowScanner(true);\n  };\n\n  const handleQRScanResult = async (decodedText: string) => {\n    const childId = activeChildIdForScan;\n    if (!childId) return;\n    setShowScanner(false);\n    setScanningMap(prev => ({...prev, [childId]: true}));\n    try {\n      let tabletData;\n      try {\n        tabletData = JSON.parse(decodedText);\n        if (!tabletData.terminalId) throw new Error(\"Invalid QR\");\n      } catch (e) {\n        throw new Error(\"Nieprawid\u0142owy kod QR\");\n      }\n      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/checkin', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ qrData: JSON.stringify({ terminalId: tabletData.terminalId, childId, timestamp: Date.now() }) })\n      });\n      const data = await res.json();\n      if (data.success) {\n        setCheckedInMap(prev => ({...prev, [childId]: true}));\n      } else {\n        Alert.alert('B\u0142\u0105d', data.error || 'B\u0142\u0105d skanowania');\n      }\n    } catch (err: any) {\n      Alert.alert('B\u0142\u0105d', err.message || 'B\u0142\u0105d po\u0142\u0105czenia');\n    }\n    setScanningMap(prev => ({...prev, [childId]: false}));\n  };\n\n  const mockHandleScan ="
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

content = content.replace("</SafeAreaView>", scannerUI + "\n    </SafeAreaView>");

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

content = content.replace("return (", scannerEffect + "\n  return (");

fs.writeFileSync('C:/Antidotum-VialFlow/mobile-app/App.tsx', content, 'utf8');
console.log('Scanner added properly');
