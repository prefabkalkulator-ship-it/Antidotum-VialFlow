const fs = require('fs');
let transcript = fs.readFileSync('C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('\"AbsolutePath\":\"C:\\\\Antidotum-VialFlow\\\\mobile-app\\\\App.tsx\"') && lines[i].includes('view_file')) {
    let obj = JSON.parse(lines[i]);
    console.log('Found view_file on App.tsx at: ' + obj.created_at);
  }
}
