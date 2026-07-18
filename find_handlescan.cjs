
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
let index = lines.findIndex(l => l.includes("const handleScanClick ="));
console.log("handleScanClick found at line: " + index);

