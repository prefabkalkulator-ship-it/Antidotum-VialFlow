
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/index.ts");
let content = fs.readFileSync(file, "utf8");

// Remove both old checkin endpoints
content = content.replace(/app\.post\(\x27\/api\/checkin\x27, async \(req, res\) => \{[\s\S]*?\/\/ --- FAZA 5: REVERSE QR CHECK-IN ---/, "// --- FAZA 5: REVERSE QR CHECK-IN ---");
content = content.replace(/app\.post\(\x27\/api\/checkin\x27, async \(req, res\) => \{[\s\S]*?\}\);/m, `app.post(\x27/api/checkin\x27, async (req, res) => {
    try {
      let childId, terminalId;
      
      // Handle both format variations for safety
      if (req.body.qrData) {
         const parsed = JSON.parse(req.body.qrData);
         childId = parsed.childId;
         terminalId = parsed.terminalId;
      } else {
         childId = req.body.childId;
         terminalId = req.body.terminalId;
      }

      if (!terminalId) terminalId = "REC-MAIN-1"; // Fallback for old apps
      
      console.log(\`[Check-in] Otrzymano sygna³ z telefonu ucznia (\${childId}) ze skanera o ID: \${terminalId}\`);
      
      // Zapisz w pamiêci podrêcznej tabletu
      if (!global.recentCheckins) global.recentCheckins = {};
      if (!global.recentCheckins[terminalId]) global.recentCheckins[terminalId] = [];
      
      // Fetch user name (mock for now, or just use childId)
      global.recentCheckins[terminalId].push({ childId, childName: "Uczeñ: " + childId, timestamp: Date.now() });

      res.json({ success: true });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: \x27B³¹d serwera\x27 });
    }
  });

  // Nowy endpoint dla short-pollingu tabletu
  app.get(\x27/api/tablet/recent-checkins\x27, (req, res) => {
    const { terminalId } = req.query;
    if (!terminalId || !global.recentCheckins || !global.recentCheckins[terminalId]) {
      return res.json([]);
    }
    
    // Zwróæ i wyczyœæ kolejkê dla tego terminala
    const checkins = global.recentCheckins[terminalId];
    global.recentCheckins[terminalId] = [];
    res.json(checkins);
  });
`);

fs.writeFileSync(file, content);
console.log("Backend patched!");

