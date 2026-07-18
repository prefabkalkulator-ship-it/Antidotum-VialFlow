
const fs = require("fs");
const content = fs.readFileSync("C:/Users/Dymitr Mitrafanau/.gemini/antigravity/brain/f89e0706-7f75-431d-9660-ed5e3cb16a54/artifacts/App_copy.tsx", "utf8");
const lines = content.split("\n");
const idx = lines.findIndex(l => l.includes("plastikow"));
console.log("Found at line: " + idx);
if (idx !== -1) {
    for (let i = idx - 2; i <= idx + 2; i++) {
        console.log(i + ": " + lines[i]);
    }
}

