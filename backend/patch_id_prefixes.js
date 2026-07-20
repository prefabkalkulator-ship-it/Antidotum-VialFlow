const fs = require('fs');

let code = fs.readFileSync('src/sheetsApi.ts', 'utf8');

code = code.replace("id: `p1-${p1Email}`", "id: p1Email");
code = code.replace("id: `adult-${child.email}`", "id: child.email");
code = code.replace("id: `p2-${p2Email}`", "id: p2Email");

fs.writeFileSync('src/sheetsApi.ts', code);
console.log("Patched IDs in sheetsApi.ts");
