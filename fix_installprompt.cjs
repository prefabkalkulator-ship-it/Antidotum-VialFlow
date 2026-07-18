
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/components/InstallPrompt.tsx", "utf8");

content = content.split("\uFFFDr").join("r");
content = content.split("\uFFFDR").join("R");
content = content.split("?r").join("r");
content = content.split("?R").join("R");
content = content.split("\uFFFD").join(" ");

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/components/InstallPrompt.tsx", content, "utf8");
console.log("InstallPrompt fixed.");

