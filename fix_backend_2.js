const fs = require('fs');
let lines = fs.readFileSync('backend/src/index.ts', 'utf8').split('\n');
// lines 50 to 87 in the file (0-indexed: index 49 to 86 = 38 lines)
lines.splice(49, 38);

// insert catchall at the end before PORT=
const catchAll = `
// Catch-all for PWA navigation
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(require('path').join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});
`;

lines.splice(lines.length - 8, 0, catchAll);
fs.writeFileSync('backend/src/index.ts', lines.join('\n'), 'utf8');
console.log('Fixed index.ts successfully');
