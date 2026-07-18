
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Add import
content = content.replace(
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView } from 'react-native';",
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView } from 'react-native';\nimport InstallPrompt from './components/InstallPrompt';"
);

// Add to JSX
content = content.replace(
  "    <SafeAreaView style={styles.safeArea}>",
  "    <SafeAreaView style={styles.safeArea}>\n      <InstallPrompt />"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("InstallPrompt added.");

