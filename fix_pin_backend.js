const fs = require('fs');

let indexTs = fs.readFileSync('backend/src/index.ts', 'utf8');

const recoverPinEndpoint = `
// Odzyskiwanie PINu
app.post('/api/users/recover-pin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Brak adresu e-mail' });
    
    // Wysłanie powiadomienia do adminów
    const adminTokens = Array.from(adminSubscriptions.values());
    if (adminTokens.length > 0) {
      await sendPushNotification(adminTokens, 'Prośba o reset PIN', \`Użytkownik \${email} zapomniał PINu i prosi o pomoc.\`);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Błąd recover-pin:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});
`;

// Insert it before app.listen or at the end before startServer()
indexTs = indexTs.replace('const startServer = async () => {', recoverPinEndpoint + '\nconst startServer = async () => {');

fs.writeFileSync('backend/src/index.ts', indexTs, 'utf8');
console.log('index.ts updated with /recover-pin');
