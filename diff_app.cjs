
const fs = require("fs");
let app = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
let copy = fs.readFileSync("C:/Users/Dymitr Mitrafanau/.gemini/antigravity/brain/f89e0706-7f75-431d-9660-ed5e3cb16a54/artifacts/App_copy.tsx", "utf8");
console.log("App.tsx length: " + app.length);
console.log("App_copy.tsx length: " + copy.length);

