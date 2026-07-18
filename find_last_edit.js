const fs = require('fs');
let transcript = fs.readFileSync('C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('TargetFile') && lines[i].includes('App.tsx') && lines[i].includes('replace_file_content')) {
    console.log('Found edit at step ' + i);
    fs.writeFileSync('last_app_edit.json', lines[i]);
    break;
  }
}
