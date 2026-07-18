
const fs = require("fs");
const file = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
console.log(file.substring(1500, 1600));
const lines = file.split("\n");
lines.forEach((l, i) => {
  if (l.includes("Najbli")) console.log(l.trim());
});

