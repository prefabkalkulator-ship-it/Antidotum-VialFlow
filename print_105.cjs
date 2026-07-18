
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const lines = content.split("\n");
console.log(lines[104]); // index 104 is line 105
console.log("Characters in line 105: ", [...lines[104]].map(c => c.charCodeAt(0)));

