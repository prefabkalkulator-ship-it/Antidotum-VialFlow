import { initAuth, getTeamRoles } from './src/sheetsApi.ts';

const USERS_SPREADSHEET_ID = '1c7U08yHq8W_UXYX0n-iZ91B1F9K15qM77dG7W3a78m0';

(async () => {
    try {
        console.log("Team Roles:");
        const team = await getTeamRoles();
        console.log(JSON.stringify(team, null, 2));

        const api = await initAuth();
        if (!api) {
            console.log("BRAK API");
            return;
        }
        const sheetData = await api.spreadsheets.get({ spreadsheetId: USERS_SPREADSHEET_ID });
        const tabs = sheetData.data.sheets?.map((s: any) => s.properties?.title) || [];
        console.log("Zakladki w arkuszu (USERS_SPREADSHEET_ID):", tabs);
    } catch(e) { console.error(e); }
})();
