
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
let index = lines.findIndex(l => l.includes("</SafeAreaView>"));
console.log("SafeAreaView close found at line: " + index);

