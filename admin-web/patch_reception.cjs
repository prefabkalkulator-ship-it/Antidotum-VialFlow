
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/pages/ReceptionTablet.tsx");
let content = fs.readFileSync(file, "utf8");

if (!content.includes("InstallPrompt")) {
  content = content.replace("import QRCode from \x27react-qrcode-logo\x27;", "import QRCode from \x27react-qrcode-logo\x27;\nimport InstallPrompt from \x27../components/InstallPrompt\x27;");
  content = content.replace("<div className=\"flex h-screen bg-[#0B0B0C] overflow-hidden\" onClick={simulateIncomingScan}>", "<div className=\"flex h-screen bg-[#0B0B0C] overflow-hidden\" onClick={simulateIncomingScan}>\n      <InstallPrompt />");
  fs.writeFileSync(file, content);
}

