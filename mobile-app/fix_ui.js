const fs = require('fs');
let c = fs.readFileSync('App.tsx.bak', 'utf8');

// 1. Rejestracja
c = c.replace(
  "const [submitted, setSubmitted] = useState(false);",
  "const [submitted, setSubmitted] = useState(false);\n  const [isRegistering, setIsRegistering] = useState(false);"
);

c = c.replace(
  "const handleRegister = async () => {\n    try {",
  "const handleRegister = async () => {\n    setIsRegistering(true);\n    try {"
);

c = c.replace(
  "      setSubmitted(true);\n    } catch (err) {\n      console.log(err);\n    }\n  };",
  "      setSubmitted(true);\n    } catch (err) {\n      console.log(err);\n    } finally {\n      setIsRegistering(false);\n    }\n  };"
);

c = c.replace(
  /<TouchableOpacity style=\{\[styles\.payButton, \{ flex: 1 \}\]\}\s*onPress=\{handleRegister\}\s*>/,
  '<TouchableOpacity style={[styles.payButton, { flex: 1, opacity: isRegistering ? 0.7 : 1 }]} onPress={handleRegister} disabled={isRegistering}>'
);

c = c.replace(
  "<Text style={styles.payButtonText}>Zarejestruj</Text>",
  "{isRegistering ? <Loader2 color={COLORS.background} size={24} /> : <Text style={styles.payButtonText}>Zarejestruj</Text>}"
);

c = c.replace(/placeholder="Imię i nazwisko"/g, 'placeholder="Imię i nazwisko"\n                autoCapitalize="words"');
c = c.replace(/placeholder="Imię i nazwisko rodzica"/g, 'placeholder="Imię i nazwisko rodzica"\n                autoCapitalize="words"');
c = c.replace(/placeholder="Imię i nazwisko opiekuna \(Opcjonalnie\)"/g, 'placeholder="Imię i nazwisko opiekuna (Opcjonalnie)"\n                autoCapitalize="words"');
c = c.replace(/placeholder="Email ucznia \(opcjonalnie\)"/g, 'placeholder="Email ucznia (opcjonalnie)"\n                autoCapitalize="none"');
c = c.replace(/placeholder="Email kontaktowy rodzica"/g, 'placeholder="Email kontaktowy rodzica"\n                autoCapitalize="none"');
c = c.replace(/placeholder="Email opiekuna \(Opcjonalnie\)"/g, 'placeholder="Email opiekuna (Opcjonalnie)"\n                autoCapitalize="none"');

c = c.replace('<ScrollView contentContainerStyle={{ padding: 20 }}>', '<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>');


// 2. Karta - remove ChevronRight
c = c.replace(
  "<View style={styles.classMetaRow}>\n                <MapPin color={COLORS.textMuted} size={14} />\n                <Text style={styles.classMetaText}>{nextClass.room} • {nextClass.instructor}</Text>\n              </View>\n            </View>\n            <ChevronRight color={COLORS.textMuted} size={24} />\n          </TouchableOpacity>",
  "<View style={styles.classMetaRow}>\n                <MapPin color={COLORS.textMuted} size={14} />\n                <Text style={styles.classMetaText}>{nextClass.room} • {nextClass.instructor}</Text>\n              </View>\n            </View>\n          </TouchableOpacity>"
);

// 3. Płatności
c = c.replace(
  "<View style={styles.paymentHeader}>\n            <Text style={styles.paymentTitle}>{p.title}</Text>\n            <Text style={styles.paymentAmount}>{p.amount} zł</Text>\n          </View>",
  "<View style={[styles.paymentHeader, { alignItems: 'flex-start' }]}>\n            <View style={{ flex: 1, paddingRight: 10 }}>\n              <Text style={[styles.paymentTitle, { flexWrap: 'wrap' }]}>{p.title}</Text>\n            </View>\n            <Text style={styles.paymentAmount}>{p.amount} zł</Text>\n          </View>"
);
c = c.replace(
  '<Text style={{ color: COLORS.text, fontSize: 18, fontWeight: \'bold\', marginBottom: 15, textAlign: \'center\' }}>\n                  Płatność BLIK\n                </Text>',
  '<View style={{ flexDirection: \'row\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: 15 }}>\n                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: \'bold\' }}>Płatność BLIK</Text>\n                  <TouchableOpacity onPress={() => setShowBlikModal(false)}><Text style={{ color: COLORS.textMuted, fontSize: 18, fontWeight: \'bold\' }}>✕</Text></TouchableOpacity>\n                </View>'
);

// 4. Asystent STT / TTS / Dismiss
c = c.replace(
  "const finalTranscript = event.results[0]?.transcript || '';",
  "const finalTranscript = event.results[0]?.[0]?.transcript || event.results[0]?.transcript || '';"
);
c = c.replace(
  "text: 'Cześć! Jestem asystentem AI szkoły tańca. W czym mogę pomóc?'",
  "text: 'Cześć! Znam regulaminy szkoły i wszystko o eventach. W czym mogę pomóc?'"
);
c = c.replace(
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView } from 'react-native';",
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView, Keyboard } from 'react-native';"
);
c = c.replace(
  "      const currentInputMethod = inputMethod;\n      const currentInput = input;",
  "      const currentInputMethod = inputMethod;\n      const currentInput = input;\n      Keyboard.dismiss();"
);

// KeyboardAvoidingView Chat offset
c = c.replace(
  "<KeyboardAvoidingView style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 150 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>",
  "<KeyboardAvoidingView style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: 100 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={60}>"
);

// 5. Logowanie
c = c.replace(
  "      <View style={{ flex: 1, padding: 30, justifyContent: 'center' }}>\n        <View style={{ alignItems: 'center', marginBottom: 50 }}>",
  "      <KeyboardAvoidingView style={{ flex: 1, padding: 30, justifyContent: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>\n        <View style={{ alignItems: 'center', marginBottom: 50 }}>"
);
c = c.replace(
  "          </Modal>\n        </SafeAreaView>\n      </View>\n    );\n  }",
  "          </Modal>\n        </SafeAreaView>\n      </KeyboardAvoidingView>\n    );\n  }"
);

fs.writeFileSync('App.tsx', c, 'utf8');
console.log('App.tsx updated from App.tsx.bak');
