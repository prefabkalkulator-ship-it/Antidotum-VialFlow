
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

content = content.replace(
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler } from 'react-native';",
  "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView } from 'react-native';"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Imports fixed.");

