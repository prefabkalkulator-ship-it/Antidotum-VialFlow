const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Bust cache in fetchAnnouncements
code = code.replace(
  "apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications?groupId=${userData.groupId || userData.id || ''}`);",
  "apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications?groupId=${userData.groupId || userData.id || ''}&groupName=${userData.groupName || ''}&t=${Date.now()}`);"
);

// 2. Add empty state text to debug
code = code.replace(
  "{announcements.map(a => (",
  "{announcements.length === 0 && <Text style={{color: COLORS.textMuted, textAlign: 'center', marginTop: 20}}>Brak powiadomień dla ID: {userData?.id || 'brak'}</Text>}\n            {announcements.map(a => ("
);

fs.writeFileSync('mobile-app/App.tsx', code);
console.log("Patched App.tsx with debug and cache-busting!");
