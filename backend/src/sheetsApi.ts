import { google } from 'googleapis';
import path from 'path';

const PAYMENTS_SPREADSHEET_ID = process.env.PAYMENTS_SPREADSHEET_ID || '1kYX0aeqkdo8aCGpabZQo3WzIVeFQJ7bxfDLd6MPGRds';
const USERS_SPREADSHEET_ID = '1U6ouQFxEydO3I3_CxQvVmMAGuA0_tRz_a8VCE_cozUA';
const SCHEDULE_SPREADSHEET_ID = process.env.SCHEDULE_SPREADSHEET_ID || '1qhczWuBlUKjSZBXicDgPh2kbLdzsUCGsmzn11RjoPb8';

let sheetsApi: any = null;

// Inicjalizacja autoryzacji
const initAuth = async () => {
  if (sheetsApi) return sheetsApi;
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
    });
    const client = await auth.getClient();
    sheetsApi = google.sheets({ version: 'v4', auth: client as any });
    console.log('[Sheets API] Poprawnie zainicjowano klienta Google Sheets');
    return sheetsApi;
  } catch (error: any) {
    console.error('[Sheets API] Błąd inicjalizacji klienta:', error.message);
    return null;
  }
};

// --- BAZA UCZNIÓW I GRUP (Antidotum_Users_DB) ---

export const getGroups = async () => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');
    const response = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Grup!A:C',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Pomijamy nagłówek
    const data = rows.slice(1).map(row => ({
      name: row[0] || '',
      instructor: row[1] || '',
      passPrice: parseInt(row[2]) || 150, // Domyślnie 150 PLN, jeśli kolumna pusta
      id: (row[0] || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    })).filter(g => g.name !== '');

    return data;
  } catch (err) {
    console.error('Błąd getGroups z Google Sheets:', err);
    throw err;
  }
};

export const getUsersAndParents = async () => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');
    const response = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:T',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const parentsMap = new Map<string, any>();

    rows.slice(1).forEach((row, index) => {
      const child = {
        id: row[0] || `child-row-${index}`,
        firstName: row[1] || '',
        lastName: row[2] || '',
        birthDate: row[3] || '',
        groupName: row[4] || '',
        groupId: (row[4] || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        email: row[5] || '',
        rodo: row[12] || '',
        notes: row[13] || '',
        status: row[14] || 'Aktywny',
        pin: row[17] || '', // PIN Ucznia (kolumna R)
        deviceToken: row[18] || '', // Device Token (kolumna S)
        op2Pin: row[16] || '', // PIN Opiekuna 2 (kolumna Q)
        op1Name: row[6] || '',
        op1Email: row[7] || '',
        op1Phone: row[8] || '',
        op2Name: row[9] || '',
        op2Email: row[10] || '',
        op2Phone: row[11] || '',
        expoPushToken: row[19] || '' // Expo Push Token (kolumna T)
      };

      const p1EmailRaw = row[7] || '';
      const p1Email = p1EmailRaw.trim().toLowerCase();
      const p1Pin = row[15] || ''; // PIN Opiekuna 1 (kolumna P)
      
      if (p1Email) {
        if (!parentsMap.has(p1Email)) {
          parentsMap.set(p1Email, {
            id: p1Email,
            name: row[6] || '',
            email: p1EmailRaw,
            phone: row[8] || '',
            pin: p1Pin,
            children: []
          });
        }
        parentsMap.get(p1Email).children.push(child);
      } else if (child.email) {
        // Pełnoletni uczeń (nie ma op1Email, ma studentEmail)
        if (!parentsMap.has(child.email)) {
          parentsMap.set(child.email, {
            id: child.email,
            name: `${child.firstName} ${child.lastName}`,
            email: child.email,
            phone: row[8] || '', // używany jako telefon kontaktowy dla dorosłych
            pin: row[15] || child.pin,
            children: []
          });
        }
        parentsMap.get(child.email).children.push(child);
      }

      const p2EmailRaw = row[10] || '';
      const p2Email = p2EmailRaw.trim().toLowerCase();
      const p2Pin = row[16] || ''; // PIN Opiekuna 2 (kolumna Q)
      if (p2Email && p2Email !== p1Email) {
        if (!parentsMap.has(p2Email)) {
          parentsMap.set(p2Email, {
            id: p2Email,
            name: row[9] || '',
            email: p2EmailRaw,
            phone: row[11] || '',
            pin: p2Pin,
            children: []
          });
        }
        parentsMap.get(p2Email).children.push(child);
      }
    });

    return Array.from(parentsMap.values());
  } catch (err) {
    console.error('Błąd getUsersAndParents z Google Sheets:', err);
    throw err;
  }
};

export const addStudent = async (data: any) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');

    const newRow = [
      data.childId || `U-${Math.floor(100000 + Math.random() * 900000)}`,
      data.firstName || '',
      data.lastName || '',
      data.birthDate || '',
      data.group || '',
      data.studentEmail || '',
      data.op1Name || '',
      data.op1Email || '',
      data.op1Phone || '',
      data.op2Name || '',
      data.op2Email || '',
      data.op2Phone || '',
      data.rodo || 'TAK',
      data.notes || '',
      data.status || 'Aktywny',
      data.parentPin || '',              // PIN Opiekuna 1 (P)
      data.op2Pin || '',                 // PIN Opiekuna 2 (Q)
      data.studentPin || '',             // PIN Ucznia (R)
      '',                                // Device Token (S)
      ''                                 // Expo Push Token (T)
    ];

    const meta = await api.spreadsheets.get({ spreadsheetId: USERS_SPREADSHEET_ID });
    const sheet = meta.data.sheets.find((s: any) => s.properties.title === 'Baza_Uczniow');
    if (!sheet) throw new Error('Nie znaleziono zakładki "Baza_Uczniow"');
    const sheetId = sheet.properties.sheetId;

    await api.spreadsheets.batchUpdate({
      spreadsheetId: USERS_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          insertDimension: {
            range: { sheetId: sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
            inheritFromBefore: false
          }
        }]
      }
    });

    await api.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A2:T2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] }
    });

    return { success: true, childId: newRow[0] };
  } catch (err) {
    console.error('Błąd addStudent:', err);
    throw err;
  }
};

export const updateStudentFullData = async (childId: string, data: any) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');

    const response = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:A',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error('Arkusz jest pusty');

    const rowIndex = rows.findIndex((row: any[]) => row[0] === childId);
    if (rowIndex === -1) throw new Error('Nie znaleziono ucznia z podanym ID');

    const updateRow = [
      data.firstName || '',
      data.lastName || '',
      data.birthDate || '',
      data.group || '',
      data.studentEmail || '',
      data.op1Name || '',
      data.op1Email || '',
      data.op1Phone || '',
      data.op2Name || '',
      data.op2Email || '',
      data.op2Phone || '',
      data.rodo || 'TAK',
      data.notes || '',
      data.status || 'Aktywny'
    ];

    await api.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `Baza_Uczniow!B${rowIndex + 1}:O${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updateRow] },
    });

    return true;
  } catch (err) {
    console.error('Błąd updateStudentFullData:', err);
    throw err;
  }
};

export const deleteStudent = async (childId: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');

    const meta = await api.spreadsheets.get({ spreadsheetId: USERS_SPREADSHEET_ID });
    const sheet = meta.data.sheets.find((s: any) => s.properties.title === 'Baza_Uczniow');
    if (!sheet) throw new Error('Nie znaleziono zakładki "Baza_Uczniow"');
    const sheetId = sheet.properties.sheetId;

    const response = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:A',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error('Arkusz jest pusty');

    const rowIndex = rows.findIndex((row: any[]) => row[0] === childId);
    if (rowIndex === -1) throw new Error('Nie znaleziono ucznia z podanym ID');

    await api.spreadsheets.batchUpdate({
      spreadsheetId: USERS_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId: sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
          }
        }]
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Błąd deleteStudent:', err);
    throw err;
  }
};

export const approveStudent = async (childId: string, groupId: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');

    const response = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:A',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error('Arkusz jest pusty');

    const rowIndex = rows.findIndex((row: any[]) => row[0] === childId);
    if (rowIndex === -1) throw new Error('Nie znaleziono ucznia z podanym ID');

    const actualRowNumber = rowIndex + 1; // Bo Google Sheets indeksuje od 1

    await api.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `Baza_Uczniow!E${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[groupId]] }
    });

    await api.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `Baza_Uczniow!O${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Aktywny']] }
    });

    return { success: true };
  } catch (err) {
    console.error('Błąd approveStudent:', err);
    throw err;
  }
};

export const getTeamRoles = async () => {
  try {
    const api = await initAuth();
    if (!api) throw new Error('Brak połączenia z Google Sheets');
    const response = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Zespolu!A:F',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const data = rows.slice(1).map(row => ({
      firstName: row[0] || '',
      lastName: row[1] || '',
      email: (row[2] || '').trim().toLowerCase(),
      phone: row[3] || '',
      role: row[4] || '',
      pin: row[5] || ''
    })).filter(u => u.email !== '');

    return data;
  } catch (err) {
    console.error('Błąd getTeamRoles z Google Sheets:', err);
    throw err;
  }
};

export const getPaymentHistory = async (childId: string = 'all') => {
  const api = await initAuth();
  if (!api) return getMockPaymentHistory(childId);

  try {
    const response = await api.spreadsheets.values.get({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Rejestr_Wplat!A2:J',
    });

    const rows = response.data.values || [];
    const history = rows
      .filter((row: any[]) => childId === 'all' || row[1] === childId)
      .map((row: any[]) => ({
        id: row[0],
        childId: row[1],
        childName: row[2],
        date: row[3],
        amount: parseFloat(row[4] || '0'),
        title: row[5],
        type: row[6],
        method: row[7],
        status: row[8],
        handledByEmail: row[9] || ''
      }))
      .reverse();

    return history;
  } catch (error: any) {
    console.error('[Sheets API] Błąd pobierania historii:', error.message);
    return getMockPaymentHistory(childId);
  }
};

export const addPaymentTransaction = async (data: {
  childId: string;
  childName: string;
  amount: number;
  title: string;
  type: string;
  method: string;
  status: string;
  handledByEmail?: string;
}) => {
  const api = await initAuth();
  if (!api) return { success: false, error: 'Brak połączenia z Google Sheets' };

  try {
    const transactionId = `TXN-${Date.now()}`;
    const dateStr = new Date().toLocaleString('pl-PL');
    
    const newRow = [
      transactionId,
      data.childId,
      data.childName,
      dateStr,
      data.amount,
      data.title,
      data.type,
      data.method,
      data.status,
      data.handledByEmail || ''
    ];

    const meta = await api.spreadsheets.get({ spreadsheetId: PAYMENTS_SPREADSHEET_ID });
    const sheet = meta.data.sheets.find((s: any) => s.properties.title === 'Rejestr_Wplat');
    
    if (!sheet) throw new Error('Nie znaleziono zakładki "Rejestr_Wplat"');
    const sheetId = sheet.properties.sheetId;

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

    await api.spreadsheets.values.update({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Rejestr_Wplat!A2:J2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    console.log(`[Sheets API] Zapisano nową transakcję: ${transactionId}`);
    return { success: true, transactionId };
  } catch (error: any) {
    console.error('[Sheets API] Błąd dodawania transakcji:', error.message);
    return { success: false, error: error.message };
  }
};

export const getStudentPasses = async (childId: string) => {
  const api = await initAuth();
  if (!api) return getMockPasses(childId);

  try {
    const response = await api.spreadsheets.values.get({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Karnety_Status!A2:H',
    });

    const rows = response.data.values || [];
    const passes = rows
      .filter((row: any[]) => row[0] === childId)
      .map((row: any[], i: number) => ({
        sheetRow: i + 2,
        childId: row[0],
        childName: row[1],
        group: row[2],
        variant: row[3],
        validUntil: row[4],
        status: row[5],
        autoReminder: row[6] === 'TRUE' || row[6] === 'Prawda',
        price: row[7] || '150'
      }));

    return passes;
  } catch (error: any) {
    console.error('[Sheets API] Błąd pobierania karnetów:', error.message);
    return [];
  }
};

export const getAllPasses = async () => {
  const api = await initAuth();
  if (!api) return [];

  try {
    const response = await api.spreadsheets.values.get({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Karnety_Status!A2:H',
    });

    const rows = response.data.values || [];
    const passes = rows.map((row: any[], i: number) => ({
      sheetRow: i + 2,
      childId: row[0],
      childName: row[1],
      group: row[2],
      variant: row[3],
      validUntil: row[4],
      status: row[5],
      autoReminder: row[6] === 'TRUE' || row[6] === 'Prawda',
      price: row[7] || '150'
    }));

    return passes;
  } catch (error: any) {
    console.error('[Sheets API] Błąd pobierania wszystkich karnetów:', error.message);
    return [];
  }
};

export const generateStudentPass = async (childId: string, childName: string, group: string, variant: string, validUntil: string, price: string) => {
  const api = await initAuth();
  if (!api) return false;

  try {
    const newRow = [
      childId,
      childName,
      group,
      variant,
      validUntil,
      'Do Zapłaty',
      'TRUE',
      price
    ];

    const spreadSheetInfo = await api.spreadsheets.get({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID
    });
    const sheet = spreadSheetInfo.data.sheets?.find((s: any) => s.properties?.title === 'Karnety_Status');
    if (!sheet) return false;
    const sheetId = sheet.properties.sheetId;

    await api.spreadsheets.batchUpdate({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: { sheetId: sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
              inheritFromBefore: false
            }
          },
          {
            updateCells: {
              start: { sheetId: sheetId, rowIndex: 1, columnIndex: 0 },
              rows: [{
                values: newRow.map(v => ({ userEnteredValue: { stringValue: v } }))
              }],
              fields: 'userEnteredValue'
            }
          }
        ]
      }
    });

    return true;
  } catch (err) {
    console.error('Błąd generowania karnetu:', err);
    return false;
  }
};

export const payStudentPass = async (childId: string, providedRow?: number) => {
  const api = await initAuth();
  if (!api) return false;

  try {
    const res = await api.spreadsheets.values.get({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: 'Karnety_Status!A:H',
    });
    const rows = res.data.values;
    if (!rows) return false;

    let targetRowIndex = -1;
    
    // Szukamy najstarszego nieopłaconego karnetu dla tego dziecka
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === childId && rows[i][5] === 'Do Zapłaty') {
        targetRowIndex = i + 1; // +1 ponieważ i zaczyna się od 1 (pomija nagłówek) a arkusze są od 1
        break;
      }
    }

    // Jeśli podano wiersz i mimo wszystko nie znaleźliśmy lepszego dopasowania
    if (targetRowIndex === -1 && providedRow) {
      targetRowIndex = providedRow;
    }

    if (targetRowIndex === -1) {
      console.error(`Nie znaleziono nieopłaconego karnetu dla ${childId}`);
      return false;
    }

    await api.spreadsheets.values.update({
      spreadsheetId: PAYMENTS_SPREADSHEET_ID,
      range: `Karnety_Status!F${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Opłacony']] }
    });
    return true;
  } catch (err) {
    console.error('Błąd opłacania karnetu:', err);
    return false;
  }
};

// --- MOCK DATA FALLBACK ---
const getMockPaymentHistory = (childId: string) => {
  return [];
};

const getMockPasses = (childId: string) => {
  return [];
};

// --- HARMONOGRAM I FREKWENCJA (Antidotum_Schedule_DB) ---

export const getSchedule = async (groupId?: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error("Brak autoryzacji");

    const res = await api.spreadsheets.values.get({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID,
      range: 'Rozklad_Zajec!A:H',
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) return [];

    const schedule: any[] = [];
    rows.slice(1).forEach((row: any[]) => {
      const daysStr = String(row[2] || '1');
      const days = daysStr.split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
      
      days.forEach((day: number) => {
        schedule.push({
          id: row[0] || '',
          groupId: row[1] || '',
          title: `${row[1] || 'Zajęcia'}`,
          dayOfWeek: day,
          startTime: row[3] || '',
          endTime: row[4] || '',
          room: row[5] || '',
          instructor: row[6] || ''
        });
      });
    });

    if (groupId && groupId !== 'Brak') {
      const normalizedQuery = groupId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return schedule.filter((s: any) => {
         const sGroup = s.groupId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
         return sGroup === normalizedQuery;
      });
    }
    return schedule;
  } catch (error) {
    console.error('Błąd pobierania harmonogramu:', error);
    return [];
  }
};

export const addAttendance = async (childId: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error("Brak autoryzacji");

    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:S',
    });
    const rows = usersRes.data.values || [];
    const row = rows.find((r: any[]) => r[0] === childId);
    
    const now = new Date();
    const timestamp = now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
    const childName = row ? `${row[1]} ${row[2]}` : 'Nieznany';
    const groupId = row ? row[4] : 'Brak_Grupy';

    // 1. Znajdź sheetId dla 'Lista_Obecnosci'
    const spreadSheetInfo = await api.spreadsheets.get({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID
    });
    const sheet = spreadSheetInfo.data.sheets?.find((s: any) => s.properties?.title === 'Lista_Obecnosci');
    if (!sheet) {
      throw new Error("Zakładka 'Lista_Obecnosci' nie istnieje w tym arkuszu!");
    }
    const sheetId = sheet.properties.sheetId;

    // 2. Dodaj wiersz na pozycji 1 (czyli tuż pod nagłówkami - wiersz 2) i wstaw dane
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID,
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
          },
          {
            updateCells: {
              start: { sheetId: sheetId, rowIndex: 1, columnIndex: 0 },
              rows: [{
                values: [
                  { userEnteredValue: { stringValue: timestamp } },
                  { userEnteredValue: { stringValue: childId } },
                  { userEnteredValue: { stringValue: childName } },
                  { userEnteredValue: { stringValue: groupId } },
                  { userEnteredValue: { stringValue: 'Obecny' } }
                ]
              }],
              fields: 'userEnteredValue'
            }
          }
        ]
      }
    });
    
    return true;
  } catch (error) {
    console.error('Błąd dodawania obecności do Arkusza. Upewnij się, że zakładka "Lista_Obecnosci" istnieje:', error);
    return false;
  }
};

// --- WYDARZENIA I PROFIL (Faza 2) ---

const EVENTS_SPREADSHEET_ID = process.env.EVENTS_SPREADSHEET_ID || '14Pmn2r0X6AmmUC3-9ZCkOfpcPNH4SscvnTceRKiz3vQ';

export const getEvents = async () => {
  try {
    const api = await initAuth();
    if (!api) throw new Error("Brak autoryzacji");

    const res = await api.spreadsheets.values.get({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      range: 'Lista_Wydarzen!A:G',
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row: any[]) => ({
      id: row[0] || '',
      type: row[1] || '',
      title: row[2] || '',
      startDate: row[3] || '',
      endDate: row[4] || '',
      cost: row[5] || '',
      description: row[6] || ''
    }));
  } catch (error) {
    console.error('Błąd pobierania wydarzeń:', error);
    return [];
  }
};

export const bookEvent = async (childId: string, eventId: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error("Brak autoryzacji");

    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:S',
    });
    const userRows = usersRes.data.values || [];
    const userRow = userRows.find((r: any[]) => r[0] === childId);
    const childName = userRow ? `${userRow[1]} ${userRow[2]}` : 'Nieznany';

    const spreadSheetInfo = await api.spreadsheets.get({
      spreadsheetId: EVENTS_SPREADSHEET_ID
    });
    const sheet = spreadSheetInfo.data.sheets?.find((s: any) => s.properties?.title === 'Zapisy');
    if (!sheet) throw new Error("Zakładka 'Zapisy' nie istnieje w arkuszu wydarzeń!");
    const sheetId = sheet.properties.sheetId;

    const now = new Date();
    const timestamp = now.toLocaleString('pl-PL');

    await api.spreadsheets.batchUpdate({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: { sheetId: sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
              inheritFromBefore: false
            }
          },
          {
            updateCells: {
              start: { sheetId: sheetId, rowIndex: 1, columnIndex: 0 },
              rows: [{
                values: [
                  { userEnteredValue: { stringValue: timestamp } },
                  { userEnteredValue: { stringValue: childId } },
                  { userEnteredValue: { stringValue: childName } },
                  { userEnteredValue: { stringValue: eventId } },
                  { userEnteredValue: { stringValue: 'Oczekujący' } },
                  { userEnteredValue: { stringValue: 'Do Zapłaty' } }
                ]
              }],
              fields: 'userEnteredValue'
            }
          }
        ]
      }
    });
    return true;
  } catch (error) {
    console.error('Błąd zapisywania na wydarzenie:', error);
    return false;
  }
};

export const getEventBookings = async () => {
  try {
    const api = await initAuth();
    if (!api) return [];
    const res = await api.spreadsheets.values.get({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      range: 'Zapisy!A:F',
    });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];
    
    return rows.slice(1).map((row: any[], i: number) => ({
      rowIndex: i + 1, // index in data array (0-based) + 1 because we sliced header = row index in sheet (0-based) is i+1. Actually row 1 is header, row 2 is i=0. So sheetRow = i + 2
      sheetRow: i + 2,
      timestamp: row[0] || '',
      childId: row[1] || '',
      childName: row[2] || '',
      eventId: row[3] || '',
      status: row[4] || '',
      paymentStatus: row[5] || ''
    }));
  } catch (err) {
    console.error('Błąd getEventBookings:', err);
    return [];
  }
};

export const approveEventBooking = async (sheetRow: number, status: string) => {
  try {
    const api = await initAuth();
    if (!api) return false;
    await api.spreadsheets.values.update({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      range: `Zapisy!E${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[status]] }
    });
    return true;
  } catch (err) {
    console.error('Błąd approveEventBooking:', err);
    return false;
  }
};

export const payEventBooking = async (sheetRow: number) => {
  try {
    const api = await initAuth();
    if (!api) return false;
    await api.spreadsheets.values.update({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      range: `Zapisy!F${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Opłacone']] }
    });
    return true;
  } catch (err) {
    console.error('Błąd payEventBooking:', err);
    return false;
  }
};

export const updateUserProfile = async (childId: string, email: string, phone: string, parentId?: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error("Brak autoryzacji");

    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:S',
    });
    const rows = usersRes.data.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r[0] === childId);
    
    if (rowIndex === -1) return false;

    const isP2 = parentId && parentId.startsWith('p2-');
    const isP1 = parentId && parentId.startsWith('p1-');
    
    let emailCol = 'F';
    let phoneCol = 'I';
    
    if (isP2) {
      emailCol = 'K';
      phoneCol = 'L';
    } else if (isP1) {
      emailCol = 'H';
      phoneCol = 'I';
    }

    if (email !== undefined && email !== null) {
      await api.spreadsheets.values.update({
        spreadsheetId: USERS_SPREADSHEET_ID,
        range: `Baza_Uczniow!${emailCol}${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[email]] }
      });
    }
    
    if (phone !== undefined && phone !== null) {
      await api.spreadsheets.values.update({
        spreadsheetId: USERS_SPREADSHEET_ID,
        range: `Baza_Uczniow!${phoneCol}${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[phone]] }
      });
    }

    return true;
  } catch (err) {
    console.error('Błąd aktualizacji profilu:', err);
    return false;
  }
};

export const setParentDeviceToken = async (parentEmail: string, token: string) => {
  try {
    const api = await initAuth();
    if (!api) return false;
    
    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:S',
    });
    const rows = usersRes.data.values || [];
    
    // Zaktualizuj kolumnę S dla wszystkich wierszy powiązanych z tym e-mailem rodzica
    for (let i = 1; i < rows.length; i++) {
      const p1Email = (rows[i][7] || '').trim().toLowerCase();
      const p2Email = (rows[i][10] || '').trim().toLowerCase();
      
      if (p1Email === parentEmail.toLowerCase() || p2Email === parentEmail.toLowerCase()) {
        await api.spreadsheets.values.update({
          spreadsheetId: USERS_SPREADSHEET_ID,
          range: `Baza_Uczniow!S${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[token]] }
        });
      }
    }
    return true;
  } catch(e) {
    console.error(e);
    return false;
  }
};

export const removeDeviceToken = async (token: string) => {
  try {
    const api = await initAuth();
    if (!api) return false;
    
    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:S',
    });
    const rows = usersRes.data.values || [];
    
    for (let i = 1; i < rows.length; i++) {
      const rowToken = (rows[i][18] || '').trim();
      if (rowToken === token) {
        await api.spreadsheets.values.update({
          spreadsheetId: USERS_SPREADSHEET_ID,
          range: `Baza_Uczniow!S${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['']] } // wyczyść
        });
      }
    }
    return true;
  } catch(e) {
    console.error(e);
    return false;
  }
};

export const updateUserPin = async (childId: string, newPin: string, targetType: 'op1'|'op2'|'child' = 'child') => {
  try {
    const api = await initAuth();
    if (!api) return false;
    
    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:S',
    });
    const rows = usersRes.data.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r[0] === childId);
    if (rowIndex === -1) return false;
    
    let pinCol = 'R'; // domyślnie PIN ucznia
    if (targetType === 'op1') pinCol = 'P';
    if (targetType === 'op2') pinCol = 'Q';
    
    await api.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: `Baza_Uczniow!${pinCol}${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newPin]] }
    });
    return true;
  } catch(e) {
    console.error(e);
    return false;
  }
};

export const saveEventQuestion = async (docId: string, author: string, text: string) => {
  try {
    const api = await initAuth();
    if (!api) throw new Error("Brak autoryzacji");
    const spreadSheetInfo = await api.spreadsheets.get({
      spreadsheetId: EVENTS_SPREADSHEET_ID
    });
    const sheet = spreadSheetInfo.data.sheets?.find((s: any) => s.properties?.title === 'Pytania');
    if (!sheet) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: EVENTS_SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: 'Pytania' }
              }
            }
          ]
        }
      });
      await api.spreadsheets.values.update({
        spreadsheetId: EVENTS_SPREADSHEET_ID,
        range: 'Pytania!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['ID Pytania', 'ID Dokumentu', 'Autor', 'Tre�� Pytania', 'Data i Czas', 'Status']] }
      });
    }

    const questionId = 'Q-' + Date.now();
    const dateStr = new Date().toISOString();

    await api.spreadsheets.values.append({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      range: 'Pytania!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[questionId, docId, author, text, dateStr, 'Oczekuj�ce']]
      }
    });

    return true;
  } catch (err) {
    console.error('B��d zapisu pytania:', err);
    return false;
  }
};

export const getPendingEventQuestions = async () => {
  try {
    const api = await initAuth();
    if (!api) return [];
    
    // Upewnijmy si�, �e zak�adka istnieje by nie wywala� b��du GET
    try {
        const res = await api.spreadsheets.values.get({
        spreadsheetId: EVENTS_SPREADSHEET_ID,
        range: 'Pytania!A:F',
        });
        const rows = res.data.values;
        if (!rows || rows.length <= 1) return [];

        return rows.map((row: any[], index: number) => ({
            sheetRow: index + 1,
            questionId: row[0] || '',
            docId: row[1] || '',
            author: row[2] || '',
            text: row[3] || '',
            date: row[4] || '',
            status: row[5] || ''
        })).filter((q: any) => q.status === 'Oczekuj�ce');
    } catch(e) {
        return [];
    }
  } catch (err) {
    console.error('B��d pobierania pyta�:', err);
    return [];
  }
};

export const markEventQuestionAsAnswered = async (sheetRow: number) => {
  try {
    const api = await initAuth();
    if (!api) return false;
    await api.spreadsheets.values.update({
      spreadsheetId: EVENTS_SPREADSHEET_ID,
      range: 'Pytania!F' + sheetRow,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Rozwi�zane']] }
    });
    return true;
  } catch (err) {
    console.error('B��d aktualizacji statusu pytania:', err);
    return false;
  }
};

/**
 * Zwraca cennik w formie tekstu do osadzenia w RAG
 */
export const getPrices = async (): Promise<string> => {
  try {
    const api = await initAuth();
    if (!api) return '';
    const res = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Grup!A:C',
    });
    const rows = res.data.values || [];
    if (rows.length <= 1) return 'Brak cennikow.';
    let text = '=== CENNIK ZAJEC ===\n';
    rows.slice(1).forEach((row: any) => {
      const groupName = row[0] || 'Nieznana';
      const price = row[2] || 'Brak danych';
      text += '- Grupa: ' + groupName + ', Cena: ' + price + '\n';
    });
    return text;
  } catch (err) {
    console.error('Blad getPrices:', err);
    return 'Brak cennikow (Blad).';
  }
};

export const setExpoPushToken = async (identifier: string, token: string): Promise<boolean> => {
  try {
    const api = await initAuth();
    if (!api) return false;
    
    const usersRes = await api.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'Baza_Uczniow!A:T',
    });
    
    const rows = usersRes.data.values || [];
    const searchId = identifier.toLowerCase().replace(/^p1-|^p2-|^adult-/, '').trim();
    
    const updatePromises = [];
    
    // Szukamy pasującego wiersza (ID dziecka, Email Ucznia, Email P1, Email P2)
    for (let i = 1; i < rows.length; i++) {
      const childId = (rows[i][0] || '').toLowerCase();
      const p1Email = (rows[i][7] || '').trim().toLowerCase();
      const p2Email = (rows[i][10] || '').trim().toLowerCase();
      const studentEmail = (rows[i][5] || '').trim().toLowerCase();
      
      if (childId === searchId || p1Email === searchId || p2Email === searchId || studentEmail === searchId) {
        updatePromises.push(
          api.spreadsheets.values.update({
            spreadsheetId: USERS_SPREADSHEET_ID,
            range: `Baza_Uczniow!T${i + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[token]] }
          })
        );
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    return true;
  } catch(e) {
    console.error('Błąd zapisywania ExpoPushToken:', e);
    return false;
  }
};

const NOTIFICATIONS_SPREADSHEET_ID = '1FxQQP2yBESSXfCTLFDZcZ68W1pPlVT-174P0J4g4OK0';

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

export const getNotificationsForUser = async (groupId: string, groupName: string = '', email: string = '', childIds: string = '') => {
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
       const childIdsArr = (childIds || '').split(',').filter(Boolean);
       const hasGroup = n.targetGroups.some((g: string) => g.toLowerCase() === groupId.toLowerCase() || (groupName && g.toLowerCase() === groupName.toLowerCase()) || (email && g.toLowerCase() === email.toLowerCase()) || childIdsArr.some((cid:string) => cid.toLowerCase() === g.toLowerCase()));
       return hasAll || hasGroup;
    });
  } catch (error) {
    console.error('[Sheets API] Błąd pobierania powiadomień:', error);
    return [];
  }
};
