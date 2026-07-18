
const fs = require("fs");
const file = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");
console.log(file.includes("Pe³en grafik"));
console.log(file.includes("Najbli¿sze zajêcia"));
console.log(file.includes("Rejestracja obecnoœci"));

