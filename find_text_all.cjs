
const fs = require("fs");
const path = require("path");

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === "node_modules" || f === ".expo" || f === "dist" || f === "assets") continue;
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDir(fullPath);
        } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts") || fullPath.endsWith(".js")) {
            const content = fs.readFileSync(fullPath, "utf8");
            if (content.includes("biletem") || content.includes("Zrezygnowali") || content.includes("Hej!")) {
                console.log("Found in: " + fullPath);
            }
        }
    }
}
searchDir("C:/Antidotum-VialFlow/mobile-app");

