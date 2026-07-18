
const fs = require("fs");
const content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
for (let i = 180; i <= 240; i++) {
    console.log(i + ": " + lines[i]);
}

