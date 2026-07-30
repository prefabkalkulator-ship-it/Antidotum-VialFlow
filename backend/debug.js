const { google } = require('googleapis');
const path = require('path');
const USERS_SPREADSHEET_ID = '1c7U08yHq8W_UXYX0n-iZ91B1F9K15qM77dG7W3a78m0';

(async () => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'service-account.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
        });
        const client = await auth.getClient();
        const api = google.sheets({ version: 'v4', auth: client });

        const sheetData = await api.spreadsheets.get({ spreadsheetId: USERS_SPREADSHEET_ID });
        const tabs = sheetData.data.sheets.map(s => s.properties.title);
        console.log("Zakładki w arkuszu:", tabs);
    } catch(e) { console.error(e); }
})();
