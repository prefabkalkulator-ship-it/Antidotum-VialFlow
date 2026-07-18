const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "import ExpoSpeechRecognitionModule, { useSpeechRecognitionEvent } from 'expo-speech-recognition';",
  "import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';"
);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for STT import');
