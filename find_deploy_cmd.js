const fs = require('fs');
let transcript = fs.readFileSync('C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('gcloud run deploy')) {
    console.log(lines[i].substring(0, 500));
  }
}
