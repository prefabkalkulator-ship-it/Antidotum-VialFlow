
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

content = content.replace(
  "const handleQRScanResult = async (decodedText: string) => {",
  "let isScanningProcessing = false;\n  const handleQRScanResult = async (decodedText: string) => {\n    if (isScanningProcessing) return;\n    isScanningProcessing = true;"
);

// We need to reset it, but since the modal closes, it will be unmounted.
// However, the variable is local to the render scope.
// A better way is to just clear activeChildIdForScan:
content = content.replace(
  "if (!childId) return;\n    setShowScanner(false);",
  "if (!childId) return;\n    setShowScanner(false);\n    setActiveChildIdForScan(null);"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Patched scanner double scan");

