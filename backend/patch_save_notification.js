const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

// 4. Update saveNotification in push/send
if (!code.includes("await saveNotification(title, body,")) {
  code = code.replace(
    "res.json({ success: true, sentCount });",
    "await saveNotification(title, body, groups, 'System');\n        res.json({ success: true, sentCount });"
  );
}

fs.writeFileSync('src/index.ts', code);
console.log("Patched index.ts successfully!");
