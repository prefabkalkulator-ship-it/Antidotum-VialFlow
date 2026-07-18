const fs = require('fs');
const transcriptPath = 'C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function ChatScreen') && lines[i].length > 50000) {
    console.log('Found massive line at index ' + i + ' with length ' + lines[i].length);
  }
}
