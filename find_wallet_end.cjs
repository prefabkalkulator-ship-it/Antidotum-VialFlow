
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
let idx = lines.findIndex(l => l.includes("// --- EKRAN WYDARZEN"));
console.log("Events screen at line: " + idx);
for(let i=idx-20; i<=idx; i++) {
  if (lines[i]) console.log(i + ": " + lines[i]);
}

