
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Add hasSeenOnboarding state
content = content.replace(
  "const [activeChildIdForScan, setActiveChildIdForScan] = useState<string | null>(null);",
  "const [activeChildIdForScan, setActiveChildIdForScan] = useState<string | null>(null);\n  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);\n\n  useEffect(() => {\n    AsyncStorage.getItem('hasSeenQrOnboarding').then(val => { if(val) setHasSeenOnboarding(true); });\n  }, []);\n\n  const dismissOnboarding = () => {\n    setHasSeenOnboarding(true);\n    AsyncStorage.setItem('hasSeenQrOnboarding', 'true');\n  };"
);

// Modify cardHeader and name
content = content.replace(
  "                <Text style={styles.cardTitle}>Karta Wstêpu</Text>\n                <Text style={styles.cardChildName}>{c.firstName} {c.lastName}</Text>\n              </View>\n              <View style={styles.cardLogo}>\n                <Text style={styles.logoText}>A.</Text>\n              </View>",
  "                <Text style={styles.cardTitle}>Karta Wstêpu</Text>\n                <Text style={styles.cardChildName}>Uczestnik:</Text>\n                <Text style={styles.cardChildName} numberOfLines={2} adjustsFontSizeToFit>{c.firstName} {c.lastName}</Text>\n              </View>"
);

// Add Onboarding and Differentiate QR Section
let qrSectionOld = `<View style={styles.qrSection}>
                 <View style={{ marginBottom: 16 }}>
                   <Camera color={COLORS.text} size={48} />
                 </View>
                 <TouchableOpacity 
                   style={styles.scanButton}
                   onPress={() => handleScanClick(c.id)}
                   disabled={scanningMap[c.id]}
                 >
                   {scanningMap[c.id] ? <Loader2 color={COLORS.background} size={24} /> : <Text style={styles.scanButtonText}>SKANUJ KOD W RECEPCJI</Text>}
                 </TouchableOpacity>
                 <Text style={styles.qrHint}>Skieruj aparat na tablet przy wejœciu</Text>
               </View>`;

let qrSectionNew = `<View style={styles.qrSection}>
                 {!hasSeenOnboarding && (
                   <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: 15, borderRadius: 12, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#3B82F6' }}>
                     <Text style={{ color: '#0B0B0C', fontSize: 14, lineHeight: 20, marginBottom: 15, textAlign: 'center' }}>
                       ?? Hej! Teraz Twoim biletem na zajêcia jest ten przycisk. Zeskanuj nim kod QR w recepcji za ka¿dym razem, gdy przychodzisz na zajêcia. Rejestracjê obecnoœci mo¿na wykonaæ z telefonu opiekuna lub ucznia.
                     </Text>
                     <TouchableOpacity onPress={dismissOnboarding} style={{ backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                       <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Zrozumia³em</Text>
                     </TouchableOpacity>
                   </View>
                 )}
                 <View style={{ marginBottom: 16 }}>
                   <Camera color={COLORS.background} size={48} />
                 </View>
                 <TouchableOpacity 
                   style={styles.scanButton}
                   onPress={() => handleScanClick(c.id)}
                   disabled={scanningMap[c.id]}
                 >
                   {scanningMap[c.id] ? <Loader2 color={COLORS.background} size={24} /> : <Text style={styles.scanButtonText}>SKANUJ KOD W RECEPCJI</Text>}
                 </TouchableOpacity>
                 {nextClass && nextClass.dayOfWeek === (new Date().getDay() === 0 ? 7 : new Date().getDay()) ? (
                   <Text style={[styles.qrHint, { color: '#3B82F6', fontWeight: 'bold' }]}>Zajêcia dzisiaj o {nextClass.startTime}</Text>
                 ) : (
                   <Text style={[styles.qrHint, { color: '#EF4444' }]}>Brak zajêæ na dzisiaj</Text>
                 )}
               </View>`;

// We have multiple instances if there are multiple children mapped, but it is inside a map, so we replace the literal string.
// However, since it is a literal block, replaceAll is better.
content = content.split(qrSectionOld).join(qrSectionNew);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Patched WalletScreen with UI fixes");

