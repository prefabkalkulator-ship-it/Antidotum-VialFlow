
const fs = require("fs");
const file = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = file.split("\n");
lines.forEach((l, i) => {
  if (l.includes("Zrozumi")) console.log((i+1) + ": " + l.trim());
});

