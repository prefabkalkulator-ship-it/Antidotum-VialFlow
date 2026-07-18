
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
let open = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === "{") open++;
  if (content[i] === "}") open--;
}
console.log("Braces diff: " + open);
let tags = content.match(/<\/?\w+/g) || [];
// This is not perfect for jsx but let's check if there's any glaring error

