const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const pushMarkerStart = "app.post('/api/push/send', async (req, res) => {";
const pushMarkerEnd = "res.status(500).json({ error: 'B' d serwera' });\n    }\n  });"; // Wait, encoding might be messed up!

// Safest way is to find start of /api/push/send and end before the next app.post.
const startIndex = code.indexOf(pushMarkerStart);
const nextPostIndex = code.indexOf("app.post('/api/users/add'", startIndex);

if (startIndex === -1 || nextPostIndex === -1) {
    console.error("Could not find markers!");
    process.exit(1);
}

const replacement = `app.post('/api/push/send', async (req, res) => {
    const { targetGroups, targetGroup, title, body } = req.body;
    const groups = targetGroups || (targetGroup ? [targetGroup] : []);
    if (groups.length === 0 || !title || !body) return res.status(400).json({ error: 'Brak danych' });

    try {
      const parents = await getUsersAndParents();
      let expoTokens: string[] = [];
      let fcmTokens: string[] = [];
  
      for (const parent of parents) {
        for (const child of parent.children) {
          if (child.expoPushToken && !child.expoPushToken.startsWith('MOCK-TOKEN-')) {
            if (groups.includes('wszyscy') || groups.includes('wszyscy_uczniowie') || groups.includes(child.groupId) || groups.includes(child.id) || groups.includes(child.email) || groups.includes(parent.email)) {
              if (Expo.isExpoPushToken(child.expoPushToken)) {
                expoTokens.push(child.expoPushToken);
              } else {
                fcmTokens.push(child.expoPushToken);
              }
            }
          }
        }
      }
  
      expoTokens = [...new Set(expoTokens)];
      fcmTokens = [...new Set(fcmTokens)];
  
      if (expoTokens.length === 0 && fcmTokens.length === 0) {
        return res.json({ success: true, message: 'Brak urządzeń do wysłania', sentCount: 0 });
      }
  
      let sentCount = 0;

      if (expoTokens.length > 0) {
        const messages = expoTokens.map(token => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: { withSome: 'data' },
        }));
    
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
            sentCount += chunk.length;
          } catch (error) {
            console.error('Błąd wysyłania chunka push (Expo):', error);
          }
        }
      }

      if (fcmTokens.length > 0) {
        const payload = {
          notification: { title, body },
          tokens: fcmTokens,
        };
        try {
          const response = await admin.messaging().sendEachForMulticast(payload);
          sentCount += response.successCount;
        } catch (error) {
          console.error('Błąd wysyłania FCM:', error);
        }
      }
  
      res.json({ success: true, sentCount });
    } catch (err) {
      console.error('Błąd API push:', err);
      res.status(500).json({ error: 'Błąd serwera' });
    }
  });

  `;

code = code.substring(0, startIndex) + replacement + code.substring(nextPostIndex);
fs.writeFileSync('src/index.ts', code);
console.log("Patched successfully!");
