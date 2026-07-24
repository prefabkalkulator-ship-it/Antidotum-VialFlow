const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = 'C:/Antidotum-VialFlow/backend/service-account.json';
const USERS_SPREADSHEET_ID = '1U6ouQFxEydO3I3_CxQvVmMAGuA0_tRz_a8VCE_cozUA';

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: USERS_SPREADSHEET_ID,
    range: 'Baza_Uczniow!A1:E15',
  });

  console.log('Baza_Uczniow rows:');
  console.log(res.data.values);
}

main().catch(console.error);
