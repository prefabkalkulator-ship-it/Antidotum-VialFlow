
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/backend/src/sheetsApi.ts", "utf8");

content = content.replace(
  "export const addAttendance = async (childId: string) => {",
  "export const addAttendance = async (childId: string): Promise<string> => {"
);

content = content.replace(
  "      await api.spreadsheets.values.append({\n        spreadsheetId: SCHEDULE_SPREADSHEET_ID,\n        range: 'Lista_Obecnosci!A:E',\n        valueInputOption: 'USER_ENTERED',\n        insertDataOption: 'INSERT_ROWS',\n        requestBody: { values: [[childId, childName, groupId, timestamp, 'Obecny']] }\n      });\n    } catch (err) {",
  "      await api.spreadsheets.values.append({\n        spreadsheetId: SCHEDULE_SPREADSHEET_ID,\n        range: 'Lista_Obecnosci!A:E',\n        valueInputOption: 'USER_ENTERED',\n        insertDataOption: 'INSERT_ROWS',\n        requestBody: { values: [[childId, childName, groupId, timestamp, 'Obecny']] }\n      });\n      return childName;\n    } catch (err) {"
);

fs.writeFileSync("C:/Antidotum-VialFlow/backend/src/sheetsApi.ts", content, "utf8");
console.log("Patched addAttendance in sheetsApi.ts");

