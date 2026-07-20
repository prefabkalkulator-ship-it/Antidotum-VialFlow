const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const replacement = `    try {
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
  
      res.json({ success: true, sentCount });`;

// Find the start and end indices of the block to replace
const startMarker = "try {\n      const parents = await getUsersAndParents();";
const endMarker = "res.json({ success: true, sentCount });";

const startIndex = code.indexOf("try {");
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const before = code.substring(0, startIndex);
    const after = code.substring(endIndex + endMarker.length);
    code = before + replacement + after;
    fs.writeFileSync('src/index.ts', code);
    console.log("Patched successfully");
} else {
    console.log("Could not find markers");
}
