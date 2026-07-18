
const fs = require("fs");
const content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
const idx = lines.findIndex(l => l.includes("function OnboardingScreen("));
console.log("Found at line: " + idx);
if (idx !== -1) {
    for (let i = idx; i <= idx + 50; i++) {
        console.log(i + ": " + lines[i]);
    }
}

