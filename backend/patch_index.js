const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

// 1. Update imports
if (!code.includes('saveNotification,')) {
  code = code.replace(
    "} from './sheetsApi';",
    ", saveNotification, getNotificationsForUser } from './sheetsApi';"
  );
}

// 2. Add /api/notifications to publicRoutes
if (!code.includes("'/api/notifications'")) {
  code = code.replace(
    "'/api/groups',",
    "'/api/groups',\n    '/api/notifications',"
  );
}

// 3. Add get endpoint
if (!code.includes("app.get('/api/notifications'")) {
  const notificationsEndpoint = `
app.get('/api/notifications', async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: 'Brak groupId' });
    const notifications = await getNotificationsForUser(groupId);
    res.json(notifications);
  } catch (err) {
    console.error('Błąd pobierania powiadomień:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});
`;
  code = code.replace(
    "app.get('/api/groups', async (req, res) => {",
    notificationsEndpoint + "\napp.get('/api/groups', async (req, res) => {"
  );
}

// 4. Update saveNotification in push/send
if (!code.includes("await saveNotification(")) {
  code = code.replace(
    "res.json({ success: true",
    "await saveNotification(title, body, targetGroups || ['wszyscy'], 'System');\n    res.json({ success: true"
  );
}

fs.writeFileSync('src/index.ts', code);
console.log("Patched index.ts successfully!");
