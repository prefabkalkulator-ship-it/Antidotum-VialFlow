const fs = require('fs');
let transcript = fs.readFileSync('C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\ff0cbb91-ccdc-4767-8b43-826fb71e13d1\\.system_generated\\logs\\transcript.jsonl', 'utf8');
const lines = transcript.split('\n');
for (let i = 0; i < lines.length; i++) {
  try {
    let obj = JSON.parse(lines[i]);
    if (obj.name === 'view_file' || (obj.tool_calls && obj.tool_calls.some(t => t.name === 'view_file'))) {
       // Check next few lines for the result
       if (obj.content && obj.content.includes('import React')) {
          fs.writeFileSync('App_recovered_subagent.txt', obj.content);
          console.log('Saved from subagent!');
       }
    }
    if (obj.type === 'TOOL_CALL_RESULT' && obj.content && obj.content.includes('import React')) {
       fs.writeFileSync('App_recovered_result.txt', obj.content);
       console.log('Saved from subagent result!');
    }
  } catch(e) {}
}
