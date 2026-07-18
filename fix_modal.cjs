
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// The modal we injected is exactly:
let scannerUI = `
      <Modal visible={showScanner} transparent={true} animationType="fade" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 300, height: 400, backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>Skanuj Kod QR</Text>
            {Platform.OS === 'web' ? (
              <div id="reader" style={{ width: 250, height: 250 }}></div>
            ) : (
              <Text style={{ color: COLORS.textMuted }}>Kamera niedostêpna w symulatorze</Text>
            )}
            <TouchableOpacity onPress={() => setShowScanner(false)} style={{ marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
`;

// Remove it from where it is now
content = content.replace(scannerUI + "\n    </SafeAreaView>", "</SafeAreaView>");

// Inject it before the end of WalletScreen
// WalletScreen ends like:
/*
325:       </Modal>
326:     </ScrollView>
327:   );
328: }
*/

content = content.replace(
  "      </Modal>\n    </ScrollView>\n  );\n}\n\n// --- EKRAN WYDARZEÑ",
  "      </Modal>\n" + scannerUI + "\n    </ScrollView>\n  );\n}\n\n// --- EKRAN WYDARZEÑ"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Modal moved.");

