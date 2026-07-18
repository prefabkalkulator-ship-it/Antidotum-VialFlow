
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/index.ts");
let content = fs.readFileSync(file, "utf8");

const uploadCode = "const multer = require(\x27multer\x27);\nconst upload = multer({ dest: \x27uploads/\x27 });\n\n// --- FAZA 6: AI DANCE COACH (Trener Wideo) ---";
content = content.replace("// --- FAZA 6: AI DANCE COACH (Trener Wideo) ---", uploadCode);

fs.writeFileSync(file, content);
console.log("Upload restored");

