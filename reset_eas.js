const fs = require('fs');

const appJsonPath = 'mobile-app/app.json';
let appJsonStr = fs.readFileSync(appJsonPath, 'utf8');

// Parse, remove projectId, and write back
let appJson = JSON.parse(appJsonStr);

if (appJson.expo && appJson.expo.extra && appJson.expo.extra.eas) {
  delete appJson.expo.extra.eas.projectId;
  // If eas is now empty, we can delete it too, but it's fine to leave it.
}

// Optionally, remove the "owner" field if it exists, since the owner has changed
if (appJson.expo && appJson.expo.owner) {
  delete appJson.expo.owner;
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log('Successfully removed old projectId from app.json');
