
const fs = require("fs");
const content = fs.readFileSync("C:/Antidotum-VialFlow/backend/src/index.ts", "utf8");
const lines = content.split("\n");
const idx = lines.findIndex(l => l.includes("app.post('/api/checkin'"));
if (idx !== -1) {
    for(let i=idx; i<idx+60; i++) {
        console.log(i + ": " + lines[i]);
    }
}

