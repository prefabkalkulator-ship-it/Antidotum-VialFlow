
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
console.log("KAV tags: " + (content.match(/<KeyboardAvoidingView/g) || []).length);
console.log("KAV close tags: " + (content.match(/<\/KeyboardAvoidingView/g) || []).length);

