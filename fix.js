const fs = require('fs');
let code = fs.readFileSync('backend/src/sheetsApi.ts', 'utf8');
const index = code.indexOf('export const getPrices =');
if (index !== -1) {
  code = code.substring(0, index);
}
const newFunction = "export const getPrices = async (): Promise<string> => {\n" +
"  try {\n" +
"    const api = await initAuth();\n" +
"    if (!api) return '';\n" +
"    const res = await api.spreadsheets.values.get({\n" +
"      spreadsheetId: USERS_SPREADSHEET_ID,\n" +
"      range: 'Baza_Grup!A:C',\n" +
"    });\n" +
"    const rows = res.data.values || [];\n" +
"    if (rows.length <= 1) return 'Brak cennikow.';\n" +
"    let text = '=== CENNIK ZAJEC ===\\n';\n" +
"    rows.slice(1).forEach((row) => {\n" +
"      const groupName = row[0] || 'Nieznana';\n" +
"      const price = row[2] || 'Brak danych';\n" +
"      text += '- Grupa: ' + groupName + ', Cena: ' + price + '\\n';\n" +
"    });\n" +
"    return text;\n" +
"  } catch (err) {\n" +
"    console.error('Blad getPrices:', err);\n" +
"    return 'Brak cennikow (Blad).';\n" +
"  }\n" +
"};\n";
code += newFunction;
fs.writeFileSync('backend/src/sheetsApi.ts', code, 'utf8');
console.log('Fixed getPrices completely');
