
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/index.ts");
let content = fs.readFileSync(file, "utf8");

content = content.replace("    const checkins = global.recentCheckins[terminalId];\n    global.recentCheckins[terminalId] = [];\n    res.json(checkins);\n  });\n\n    { id: \x273\x27, title: \x27High Heels Walk\x27, instructor: \x27Sara\x27, duration: \x270:30\x27, level: \x27Pocz¹tkuj¹cy\x27 }", `    const checkins = global.recentCheckins[terminalId];
    global.recentCheckins[terminalId] = [];
    res.json(checkins);
  });

// --- FAZA 6: AI DANCE COACH (Trener Wideo) ---
app.get(\x27/api/coach/choreographies\x27, (req, res) => {
  res.json([
    { id: \x271\x27, title: \x27Hip-Hop Basic Groove\x27, instructor: \x27Kamil\x27, duration: \x270:45\x27, level: \x27Pocz¹tkuj¹cy\x27 },
    { id: \x272\x27, title: \x27Jazz Pirouette Combo\x27, instructor: \x27Marta\x27, duration: \x271:20\x27, level: \x27Œredniozaawansowany\x27 },
    { id: \x273\x27, title: \x27High Heels Walk\x27, instructor: \x27Sara\x27, duration: \x270:30\x27, level: \x27Pocz¹tkuj¹cy\x27 }`);

// Also fix the corrupted polish characters introduced by the tool: "Zwr i wyczy kolejk dla tego terminala" -> "Zwróæ i wyczyœæ kolejkê dla tego terminala"
content = content.replace("// Zwr i wyczy kolejk dla tego terminala", "// Zwróæ i wyczyœæ kolejkê dla tego terminala");

fs.writeFileSync(file, content);
console.log("Restored!");

