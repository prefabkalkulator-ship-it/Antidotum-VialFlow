const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const regex = /app\.post\('\/api\/push\/send'[\s\S]*?res\.json\(\{ success: true, sentCount \}\);\n    \} catch \(err\) \{/g;

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
    } catch (err) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/index.ts', code);
