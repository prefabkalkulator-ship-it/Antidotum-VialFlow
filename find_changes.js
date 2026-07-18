const fs = require('fs');
const transcriptPath = 'C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let changes = [];
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const entry = JSON.parse(line);
    if (entry.tool_calls) {
      for (const call of entry.tool_calls) {
        if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          if (call.args && call.args.TargetFile && call.args.TargetFile.includes('App.tsx')) {
            changes.push({ time: entry.created_at, name: call.name });
          }
        }
      }
    }
  } catch(e) {}
}
console.log('Found ' + changes.length + ' modifications to App.tsx');
for(const c of changes) {
  console.log(c.time + ' : ' + c.name);
}
