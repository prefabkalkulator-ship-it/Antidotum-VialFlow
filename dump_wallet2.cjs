
const fs = require("fs");
const content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
let start = lines.findIndex(l => l.includes("function WalletScreen"));
let end = lines.findIndex(l => l.includes("// --- EKRAN WYDARZE"));
let out = [];
for(let i=start; i<=end; i++) out.push(lines[i]);
fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/WalletScreen_dump2.txt", out.join("\n"));

