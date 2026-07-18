
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
console.log(content.includes("const mockHandleScan"));

