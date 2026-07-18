
const fs = require("fs");
const content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const start = content.indexOf("function WalletScreen");
const end = content.indexOf("// --- EKRAN WYDARZEÑ");
fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/WalletScreen_dump.txt", content.substring(start, end));

