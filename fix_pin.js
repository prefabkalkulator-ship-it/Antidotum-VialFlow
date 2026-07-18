const fs = require('fs');

// --- 1. Modify App.tsx ---
let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// Change placeholder
appTsx = appTsx.replace(/placeholder="Email ucznia \/ ID"/g, 'placeholder="Adres e-mail"');

// Add handleRecoverPin
const recoverPinLogic = `const handleRecoverPin = async () => {
    if (!loginInput) {
      Alert.alert('Błąd', 'Wpisz swój adres e-mail, abyśmy wiedzieli kogo dotyczy problem.');
      return;
    }
    Alert.alert(
      'Odzyskiwanie PINu',
      'Zaraz wyślemy powiadomienie do administratora z prośbą o reset. Otrzymasz nowy PIN SMSem lub na adres e-mail.',
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Wyślij', onPress: async () => {
            try {
              await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/users/recover-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginInput })
              });
              Alert.alert('Sukces', 'Twoje zgłoszenie zostało wysłane. Administrator wkrótce się z Tobą skontaktuje.');
            } catch(e) {
              Alert.alert('Błąd', 'Błąd podczas wysyłania zgłoszenia.');
            }
          }
        }
      ]
    );
  };

  const handleLogin = async () => {`;

appTsx = appTsx.replace('const handleLogin = async () => {', recoverPinLogic);

// Change button onPress
appTsx = appTsx.replace(
  "onPress={() => alert('Skontaktuj się z organizatorem aby zresetować PIN.')}",
  "onPress={handleRecoverPin}"
);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated.');

// --- 2. Modify backend/src/sheetsApi.ts ---
let sheetsApi = fs.readFileSync('backend/src/sheetsApi.ts', 'utf8');

const scheduleLogicOld = `const schedule = rows.slice(1).map((row: any[]) => ({
      id: row[0] || '',
      groupId: row[1] || '',
      title: \`\${row[1] || 'Zajęcia'}\`, // Tytuł to nazwa grupy, ponieważ pominięto tę kolumnę
      dayOfWeek: parseInt(row[2] || '1', 10),
      startTime: row[3] || '',
      endTime: row[4] || '',
      room: row[5] || '',
      instructor: row[6] || ''
    }));`;

const scheduleLogicNew = `const schedule: any[] = [];
    rows.slice(1).forEach((row: any[]) => {
      const daysStr = row[2] || '1';
      const days = daysStr.toString().split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
      
      days.forEach((day: number) => {
        schedule.push({
          id: row[0] || '',
          groupId: row[1] || '',
          title: \`\${row[1] || 'Zajęcia'}\`, 
          dayOfWeek: day,
          startTime: row[3] || '',
          endTime: row[4] || '',
          room: row[5] || '',
          instructor: row[6] || ''
        });
      });
    });`;

sheetsApi = sheetsApi.replace(scheduleLogicOld, scheduleLogicNew);
fs.writeFileSync('backend/src/sheetsApi.ts', sheetsApi, 'utf8');
console.log('sheetsApi.ts updated.');

