const fs = require('fs');

const iconPath = 'mobile-app/assets/icon.png';
const iconNewPath = 'mobile-app/assets/icon.jpg';

const androidIconPath = 'mobile-app/assets/android-icon-foreground.png';
const androidIconNewPath = 'mobile-app/assets/android-icon-foreground.jpg';

// Rename files
if (fs.existsSync(iconPath)) fs.renameSync(iconPath, iconNewPath);
if (fs.existsSync(androidIconPath)) fs.renameSync(androidIconPath, androidIconNewPath);

// Update app.json
const appJsonPath = 'mobile-app/app.json';
let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

if (appJson.expo.icon === './assets/icon.png') {
  appJson.expo.icon = './assets/icon.jpg';
}
if (appJson.expo.android && appJson.expo.android.adaptiveIcon && appJson.expo.android.adaptiveIcon.foregroundImage === './assets/android-icon-foreground.png') {
  appJson.expo.android.adaptiveIcon.foregroundImage = './assets/android-icon-foreground.jpg';
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log('Icons renamed and app.json updated');
