const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

// 1. Add firebase-admin
code = code.replace(
  "import jwt from 'jsonwebtoken';",
  "import jwt from 'jsonwebtoken';\nimport * as admin from 'firebase-admin';\n\nadmin.initializeApp();"
);

// 2. Replace push/send
const pushRegex = /app\.post\('\/api\/push\/send', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: '.*?' \}\);\n    \}\n  \}\);/g;

const pushReplacement = `app.post('/api/push/send', async (req, res) => {
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
          sound: 'default' as const,
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
  });`;

code = code.replace(pushRegex, pushReplacement);
fs.writeFileSync('src/index.ts', code);
console.log("Patched completely!");
