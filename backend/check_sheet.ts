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
    const res = await api.spreadsheets.values.get({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Rejestr_Wplat!A1:J10',
    });
    console.log(JSON.stringify(res.data.values, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}

test();
