const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

code = code.replace(/}\);\s*}\);\s*\/\//g, '});\n\n//');

fs.writeFileSync('src/index.ts', code);
console.log("Fixed extra braces");
