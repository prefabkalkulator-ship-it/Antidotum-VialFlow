
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/App.tsx");
let content = fs.readFileSync(file, "utf8");

if (!content.includes("InstallPrompt")) {
  content = content.replace("import FinanceDashboard from \x27./pages/FinanceDashboard\x27;", "import FinanceDashboard from \x27./pages/FinanceDashboard\x27;\nimport InstallPrompt from \x27./components/InstallPrompt\x27;");
  content = content.replace("<BrowserRouter>", "<BrowserRouter>\n      <InstallPrompt />");
  fs.writeFileSync(file, content);
}

