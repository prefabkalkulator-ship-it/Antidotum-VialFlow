const fs = require('fs');
let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

const oldIntro = `<Text style={{ color: COLORS.primary, fontSize: 40, fontWeight: '900', marginBottom: 20, letterSpacing: 2 }}>ANTIDOTUM</Text>\r
        <ActivityIndicator size="large" color={COLORS.primary} />`;

const oldIntroUnix = `<Text style={{ color: COLORS.primary, fontSize: 40, fontWeight: '900', marginBottom: 20, letterSpacing: 2 }}>ANTIDOTUM</Text>\n        <ActivityIndicator size="large" color={COLORS.primary} />`;

const newIntro = `<Image source={require('./assets/antidotum-intro.gif')} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />`;

if (appTsx.includes(oldIntro)) {
  appTsx = appTsx.replace(oldIntro, newIntro);
} else {
  appTsx = appTsx.replace(oldIntroUnix, newIntro);
}

// Make sure Image is imported if not already
if (!appTsx.includes('import {') || !appTsx.match(/import \{[^}]*Image[^}]*\} from 'react-native'/)) {
  if (appTsx.includes("import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, Dimensions, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';")) {
     appTsx = appTsx.replace(
       "import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, Dimensions, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';",
       "import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, Dimensions, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, StyleSheet, Keyboard, Image } from 'react-native';"
     );
  }
}

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('GIF Intro applied');
