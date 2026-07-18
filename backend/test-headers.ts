import { google } from 'googleapis';
import path from 'path';

const SCHEDULE_SPREADSHEET_ID = '1qhczWuBlUKjSZBXicDgPh2kbLdzsUCGsmzn11RjoPb8';

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const api = google.sheets({ version: 'v4', auth: client as any });
  
  const res = await api.spreadsheets.values.get({
    spreadsheetId: SCHEDULE_SPREADSHEET_ID,
    range: 'Rozklad_Zajec!A1:H2',
  });
  console.log(res.data.values);
})();
