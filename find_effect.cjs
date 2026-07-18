
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
let index = lines.findIndex(l => l.includes("window.Html5QrcodeScanner"));
console.log("Effect found at line: " + index);
for (let i = index - 10; i <= index + 10; i++) {
  if(lines[i]) console.log(i + ": " + lines[i]);
}

