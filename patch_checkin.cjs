
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/backend/src/index.ts", "utf8");

let oldCheckin = `      // Fetch user name (mock for now, or just use childId)
      global.recentCheckins[terminalId].push({ childId, childName: "Ucze: " + childId, timestamp: Date.now() });`;

let newCheckin = `      // Add to Google Sheets and get real name
      let childName = childId;
      try {
        childName = await addAttendance(childId);
      } catch (e) {
        console.error("Failed to add attendance to sheets:", e);
      }
      
      global.recentCheckins[terminalId].push({ childId, childName: childName, timestamp: Date.now() });`;

content = content.replace(oldCheckin, newCheckin);
fs.writeFileSync("C:/Antidotum-VialFlow/backend/src/index.ts", content, "utf8");
console.log("Patched /api/checkin");

