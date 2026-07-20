const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const regex = /  \];\r?\n  \r?\n  if \(\!req\.path\.startsWith\('\/api\/'\) \|\| publicRoutes\.includes\([^\}]+\}\r?\n  \];\r?\n  \r?\n  if \(\!req\.path\.startsWith\('\/api\/'\) \|\| publicRoutes\.includes\([^\}]+\}/;

const correctBlock = `  ];
  
  if (!req.path.startsWith('/api/') || publicRoutes.includes(req.path) || req.path.startsWith('/api/drive/webhook') || req.path.startsWith('/api/debug/cron')) {
    return next();
  }`;

code = code.replace(regex, correctBlock);
fs.writeFileSync('src/index.ts', code);
console.log("Cleaned up duplicated block!");
