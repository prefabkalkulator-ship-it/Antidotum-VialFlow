const fs = require('fs');
const transcriptPath = 'C:\\Users\\Dymitr Mitrafanau\\.gemini\\antigravity\\brain\\f89e0706-7f75-431d-9660-ed5e3cb16a54\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const entry = JSON.parse(line);
    if (entry.created_at && entry.created_at.startsWith('2026-07-17T16:41:')) {
      if (entry.tool_calls) {
        for (const call of entry.tool_calls) {
          if (call.name === 'multi_replace_file_content') {
            const chunks = JSON.parse(call.args.ReplacementChunks);
            for (let i = 0; i < chunks.length; i++) {
              fs.writeFileSync('extracted_target_' + i + '.txt', chunks[i].TargetContent, 'utf8');
              fs.writeFileSync('extracted_replacement_' + i + '.txt', chunks[i].ReplacementContent, 'utf8');
              console.log('Extracted chunk ' + i + ' with TargetContent length ' + chunks[i].TargetContent.length);
            }
          }
        }
      }
    }
  } catch(e) {}
}
