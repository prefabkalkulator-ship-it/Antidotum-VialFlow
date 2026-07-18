const fs = require('fs');
const transcriptPath = 'C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
let truncatedCount = 0;
for (const line of lines) {
  if (line.includes('<truncated')) {
    truncatedCount++;
  }
}
console.log('Lines with <truncated>: ' + truncatedCount);
