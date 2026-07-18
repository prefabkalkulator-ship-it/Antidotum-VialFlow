
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
for (let i = 85; i <= 105; i++) {
  console.log(i + ": " + lines[i]);
}

