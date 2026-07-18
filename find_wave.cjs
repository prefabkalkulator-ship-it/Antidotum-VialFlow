
const fs = require("fs");
const content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
lines.forEach((l, idx) => {
    if (l.includes("??")) console.log(idx + ": " + l);
});

