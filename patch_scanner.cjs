
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

content = content.replace(
  "scanner.render((decodedText: string) => {\n          scanner.clear();\n          handleQRScanResult(decodedText);\n        }",
  "scanner.render((decodedText: string) => {\n          handleQRScanResult(decodedText);\n        }"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Patched scanner.clear()");

