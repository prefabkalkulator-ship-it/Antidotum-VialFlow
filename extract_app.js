const fs = require('fs');
let transcript = fs.readFileSync('C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
for (let i = 0; i < lines.length; i++) {
  try {
    let obj = JSON.parse(lines[i]);
    if (obj.tool_calls && obj.tool_calls[0] && obj.tool_calls[0].name === 'replace_file_content') {
      let args = obj.tool_calls[0].args;
      if (args && args.TargetFile && args.TargetFile.includes('App.tsx')) {
         if (obj.created_at.includes('2026-07-17T17')) {
            console.log('Found replace_file_content at: ' + obj.created_at);
            fs.writeFileSync('App_target.txt', args.TargetContent);
            fs.writeFileSync('App_replacement.txt', args.ReplacementContent);
            break;
         }
      }
    }
  } catch(e) {}
}
