import { google } from 'googleapis';
import path from 'path';

const PAYMENTS_SPREADSHEET_ID = '1kYX0aeqkdo8aCGpabZQo3WzIVeFQJ7bxfDLd6MPGRds';

async function initAuth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client as any });
}

async function test() {
  const api = await initAuth();
  try {
    const meta = await api.spreadsheets.get({ spreadsheetId: PAYMENTS_SPREADSHEET_ID });
    const sheet = meta.data.sheets.find((s: any) => s.properties.title === 'Rejestr_Wplat');
    const sheetId = sheet.properties.sheetId;

    console.log("Found sheetId:", sheetId);

    console.log("Running batchUpdate insertDimension...");
    await api.spreadsheets.batchUpdate({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: 1,
                endIndex: 2
              },
              inheritFromBefore: false
            }
          }
        ]
      }
    });

    console.log("Running values.update...");
    const newRow = ['TEST-ID', 'TEST-UID', 'Test Uczeń', '2026-07-11', 150, 'Zaliczką', 'Raty', 'Gotówka', 'Zakończona', 'admin@antidotum.pl'];
    
    await api.spreadsheets.values.update({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Rejestr_Wplat!A2:J2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    console.log("Success!");
  } catch (err) {
    console.error(err.message);
  }
}

test();
