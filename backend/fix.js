const fs = require('fs');
let c = fs.readFileSync('src/sheetsApi.ts', 'utf8');
c = c.replace(/data\.parentPin \|\| '',\s*data\.op2Pin \|\| '',\s*data\.studentPin \|\| '',\s*''\s*data\.parentPin \|\| '',/, "data.parentPin || '',");
fs.writeFileSync('src/sheetsApi.ts', c, 'utf8');
console.log('Fixed!');
