const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

code = code.replace(
  "fetch(`${BACKEND_URL}/api/notifications",
  "apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications"
);

fs.writeFileSync('mobile-app/App.tsx', code);
console.log("Patched BACKEND_URL!");
