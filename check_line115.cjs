
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
for (let i = 115; i <= 130; i++) {
  console.log(i + ": " + lines[i]);
}

