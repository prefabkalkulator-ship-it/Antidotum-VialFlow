const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

if (!code.includes('firebase-admin')) {
  code = code.replace(
    "import { logConsentToWORM, deleteEphemeralVideo } from './audit';",
    "import { logConsentToWORM, deleteEphemeralVideo } from './audit';\nimport * as admin from 'firebase-admin';\n\nadmin.initializeApp();"
  );
  fs.writeFileSync('src/index.ts', code);
  console.log("firebase-admin import added!");
} else {
  console.log("Already imported");
}
