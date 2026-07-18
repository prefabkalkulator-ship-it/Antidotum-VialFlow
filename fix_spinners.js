const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// Add ActivityIndicator import if not already present
if (!appTsx.includes('ActivityIndicator')) {
  appTsx = appTsx.replace(
    "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView, Keyboard } from 'react-native';",
    "import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView, Keyboard, ActivityIndicator } from 'react-native';"
  );
}

// Remove the payment text
appTsx = appTsx.replace(
  "<Text style={{ color: COLORS.text, marginTop: 10 }}>Pobieranie płatności z księgowości...</Text>",
  ""
);

// Replace Loader2 with ActivityIndicator dynamically based on color and size
appTsx = appTsx.replace(/<Loader2 color=\{([^}]+)\} size=\{([0-9]+)\} \/>/g, (match, color, sizeStr) => {
  const sizeNum = parseInt(sizeStr);
  const aiSize = sizeNum > 30 ? "large" : "small";
  return `<ActivityIndicator size="${aiSize}" color={${color}} />`;
});
appTsx = appTsx.replace(/<Loader2 color="([^"]+)" size=\{([0-9]+)\} \/>/g, (match, color, sizeStr) => {
  const sizeNum = parseInt(sizeStr);
  const aiSize = sizeNum > 30 ? "large" : "small";
  return `<ActivityIndicator size="${aiSize}" color="${color}" />`;
});

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated: Spinners fixed and text removed');
