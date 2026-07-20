const fs = require('fs');

const NOTIFICATIONS_SPREADSHEET_ID = "'1FxQQP2yBESSXfCTLFDZcZ68W1pPlVT-174P0J4g4OK0'";

const codeToAdd = `
const NOTIFICATIONS_SPREADSHEET_ID = ${NOTIFICATIONS_SPREADSHEET_ID};

// --- POWIADOMIENIA (TABLICA OGŁOSZEŃ) ---

export const saveNotification = async (title: string, content: string, targetGroups: string[], sender: string = 'System') => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');
    
    const id = Date.now().toString();
    const date = new Date().toISOString();
    const groupsStr = targetGroups.join(',');

    const rowData = [id, date, title, content, groupsStr, sender];

    // Get sheetId for "Powiadomienia"
    const sheetData = await api.spreadsheets.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
    });
    const sheet = sheetData.data.sheets?.find((s: any) => s.properties?.title === 'Powiadomienia');
    const sheetId = sheet ? sheet.properties.sheetId : 0;

    // Insert row at index 1 (between row 1 and 2)
    await api.spreadsheets.batchUpdate({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: 1,
                endIndex: 2
              }
            }
          }
        ]
      }
    });

    // Update the newly inserted row
    await api.spreadsheets.values.update({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: 'Powiadomienia!A2:F2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData]
      }
    });
    
    return { success: true, id };
  } catch (error) {
    console.error('[Sheets API] Błąd zapisywania powiadomienia:', error);
    return { success: false, error: 'Błąd zapisu' };
  }
};

export const getNotificationsForUser = async (groupId: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');
    
    const response = await api.spreadsheets.values.get({
      spreadsheetId: NOTIFICATIONS_SPREADSHEET_ID,
      range: 'Powiadomienia!A:F',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    const data = rows.slice(1).map((row: any) => ({
      id: row[0] || '',
      date: row[1] || '',
      title: row[2] || '',
      content: row[3] || '',
      targetGroups: (row[4] || '').split(',').map((g: string) => g.trim()),
      sender: row[5] || ''
    })).filter((n: any) => n.id !== ''); // ignore empty

    // Filter by group
    return data.filter((n: any) => {
       const hasAll = n.targetGroups.some((g: string) => g.toLowerCase() === 'wszyscy');
       const hasGroup = n.targetGroups.includes(groupId);
       return hasAll || hasGroup;
    });
  } catch (error) {
    console.error('[Sheets API] Błąd pobierania powiadomień:', error);
    return [];
  }
};
`;

let code = fs.readFileSync('src/sheetsApi.ts', 'utf8');
code = code + codeToAdd;
fs.writeFileSync('src/sheetsApi.ts', code);
console.log("Added saveNotification and getNotificationsForUser to sheetsApi.ts");
