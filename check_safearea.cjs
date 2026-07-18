
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
const parts = content.split("</SafeAreaView>");
console.log("Number of </SafeAreaView> tags: " + (parts.length - 1));

