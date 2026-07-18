const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');
const prefix = fs.readFileSync('snippet.txt', 'utf8');
const startIdx = code.indexOf('  useSpeechRecognitionEvent(\'end\'');
const endIdx = code.indexOf('  const startListening');
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + prefix + '\n\n' + code.substring(endIdx);
  fs.writeFileSync('mobile-app/App.tsx', code, 'utf8');
  console.log('Fixed STT block!');
} else {
  console.log('Could not find indices!', startIdx, endIdx);
}
