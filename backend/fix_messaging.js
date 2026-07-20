const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

// Add the import
if (!code.includes("from 'firebase-admin/messaging'")) {
  code = code.replace(
    "import * as admin from 'firebase-admin';",
    "import * as admin from 'firebase-admin';\nimport { getMessaging } from 'firebase-admin/messaging';"
  );
}

// Replace the call
code = code.replace(
  "const response = await admin.messaging().sendEachForMulticast(payload);",
  "const response = await getMessaging().sendEachForMulticast(payload);"
);

fs.writeFileSync('src/index.ts', code);
console.log("Firebase messaging updated to modular SDK!");
