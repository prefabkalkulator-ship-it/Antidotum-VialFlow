import { google } from 'googleapis';
import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';

const PROJECT_ID = 'antidotum-vialflow-mvp';
const LOCATION = 'europe-central2';
const MASTER_FOLDER_ID = '1vuZnaISJ7wEdaKZ2IbnD5SnC-mMHcb75'; 

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../service-account.json'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/documents'
    ]
  });
}

export async function runEventOrchestration(messages: {role: string, content: string}[]) {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const calendar = google.calendar({ version: 'v3', auth });
    const docs = google.docs({ version: 'v1', auth });
    
    // 0. Pobranie Zewnętrznych Reguł
    let externalRules = "";
    try {
      const response = await drive.files.export({
        fileId: '1csG-LO-a2QadUlrDS0vooT34M8jaoTgfxrfj7Mb-fmQ',
        mimeType: 'text/plain'
      });
      if (response.data) externalRules = String(response.data);
    } catch (e: any) {
      console.warn('Nie udalo sie pobrac zewnetrznych regul z Dysku. Ignoruje...');
    }

    // Pobranie Oficjalnych Grup z bazy
    let availableGroupsList: string[] = [];
    try {
      const { getGroups } = require('./sheetsApi');
      const groupsData = await getGroups();
      if (Array.isArray(groupsData)) {
        availableGroupsList = groupsData.map((g: any) => g.name);
      }
    } catch (e) {
      console.warn('Nie udalo sie pobrac oficjalnych grup. Ignoruje...');
    }

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' } as any,
    });

    const currentDateStr = new Date().toLocaleString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });

    const systemPrompt = `
      Jesteś Asystentem Organizacyjnym Szkoły Tańca Antidotum.
      Pomagasz administratorowi stworzyć ogłoszenie o nowym wydarzeniu.

      OFICJALNE GRUPY W BAZIE DANYCH SZKOŁY:
      ${availableGroupsList.join(', ')}

      BIEŻĄCY CZAS (Zawsze bierz pod uwagę bieżący rok, miesiąc i dzień tygodnia przy ustalaniu dat):
      Dzisiejsza data, dzień tygodnia i godzina: ${currentDateStr}.

      ZASADA 1 – CZYTAJ HISTORIĘ:
      Dokładnie przeanalizuj CAŁĄ historię rozmowy zanim zadasz pytanie.
      Jeśli administrator podał już jakąś informację — NIE PYTAJ O NIĄ PONOWNIE.

      ZASADA 2 – ZBIERANIE DANYCH:
      Zanim przejdziesz dalej, upewnij się że znasz:
      - Typ wydarzenia, Datę rozpoczęcia, Datę zakończenia, Miejsce/salę, Koszt, Wymagania dot. stroju, Grupy docelowe (konkretne nazwy grup, np. "Grupa A, Grupa B", lub cała szkoła/wszyscy)
      Zadawaj maksymalnie 2 pytania naraz, w przyjaznym tonie.
      Kończ pytania słowami: "(brakuje: [lista] — podaj proszę lub zaznaczę jako nieokreślone)"

      ZASADA DOPASOWANIA GRUP DO BAZY DANYCH:
      Gdy administrator podaje grupy docelowe dla wydarzenia (np. "Junior 2" lub "Hobby"), dopasuj te potoczne nazwy do ich PEŁNYCH oficjalnych nazw z powyższej listy "OFICJALNE GRUPY W BAZIE DANYCH SZKOŁY" (np. "Junior 2" pasuje do "JUNIOR 2 2026-27"). W polu "targetGroups" (przy statusie "complete") wpisz dokładnie te oficjalne nazwy z listy (oddzielone przecinkami, jeśli jest ich więcej niż jedna). Jeśli wydarzenie jest dla całej szkoły, wpisz "Wszyscy". Kategorycznie unikaj wpisywania skróconych, potocznych lub błędnych nazw w polu "targetGroups" – wartości te muszą dokładnie odpowiadać nazwom z powyższej listy grup.

      ZASADA 3 – KROK PREVIEW (OBOWIĄZKOWY):
      Gdy masz wszystkie dane — NIE twórz jeszcze wydarzenia.
      Zwróć status "preview". W polu "message" napisz TYLKO:
      - Krótką, rzeczową informację dla administratora (bez emoji, 2-3 zdania) że oto projekt ogłoszenia
      - Pełny tekst ogłoszenia dla uczniów/rodziców z emoji (zachęcający, pełen energii)
      - Na końcu: "Napisz 'Zatwierdzam' aby zapisać wydarzenie, lub wskaż co zmienić."
      W polu "draft" umieść TYLKO tekst ogłoszenia (bez wstępu administratora).

      ZASADA 4 – TWORZENIE:
      Gdy administrator napisze 'zatwierdzam', 'ok', 'tworz', 'zapisz' lub podobne —
      zwróć status "complete" z "detailedDescription" równym polu "draft" z poprzedniego preview.

      ZASADA 5 – ZWIĘZŁOŚĆ I ABSOLUTNY BRAK LANIA WODY / MARKETINGOWEGO ZAPYCHANIA:
      Opis wydarzenia i pole 'draft' MUSZĄ być zwięzłe i zawierać tylko konkretne fakty. KATEGORYCZNIE unikaj wklejania ogólnych, marketingowych formułek-zapychaczy o emocjach, rywalizacji czy pasji scenicznej (np. "Przygotujcie się na dzień pełen pasji, rywalizacji i niezapomnianych wrażeń!", "To idealna okazja, by zaprezentować swoje umiejętności..."), chyba że administrator wyraźnie zażądał ich dodania. Trzymaj się konkretnych informacji (Kto, Kiedy, Gdzie, Koszt, Strój).

      ZASADY DODATKOWE SZKOŁY:
      ${externalRules}

      === FORMAT ODPOWIEDZI (TYLKO JSON, bez żadnego tekstu przed ani po) ===

      Zbierasz dane:
      { "status": "ask", "message": "Twoja wiadomość do administratora." }

      Proponujesz ogłoszenie do zatwierdzenia:
      {
        "status": "preview",
        "message": "Projekt ogłoszenia gotowy. Sprawdź poniższy tekst:\n\n[TEKST OGŁOSZENIA Z EMOJI]\n\nNapisz 'Zatwierdzam' aby zapisać wydarzenie, lub wskaż co zmienić.",
        "draft": "Tylko tekst ogłoszenia z emoji — bez wstępu administratora. To trafi do Google Docs."
      }

      Tworzysz wydarzenie po zatwierdzeniu:
      {
        "status": "complete",
        "eventName": "krótka nazwa",
        "type": "Typ",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "cost": "300 PLN",
        "targetGroups": "Grupa A, Grupa B (lub Wszyscy)",
        "needsCalendar": true,
        "needsFolders": true,
        "needsSpreadsheet": true,
        "posterPrompt": "detailed English prompt for poster generator",
        "detailedDescription": "Skopiuj tu pole draft z poprzedniego preview."
      }

      ZWRÓĆ WYŁĄCZNIE OBIEKT JSON. Żadnego tekstu przed ani po. Żadnych znaczników \`\`\`json.
    `;

    // Mapuj wiadomości z frontendu do formatu Vertex AI
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    
    const lastMessage = messages[messages.length - 1].content;

    const chatSession = model.startChat({
      systemInstruction: systemPrompt,
      history: history
    });

    const result = await chatSession.sendMessage(lastMessage);
    const rawText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Wyciągnij JSON przez wyważone nawiasy (niezawodne przy tekście przed/po JSON)
    function extractJSON(text: string): string | null {
      const start = text.indexOf('{');
      if (start === -1) return null;
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) return text.substring(start, i + 1); }
      }
      return null;
    }
    const jsonText = extractJSON(rawText);
    
    let aiResponse;
    try {
      if (!jsonText) throw new Error('no json');
      aiResponse = JSON.parse(jsonText);
    } catch(err) {
      // Model odpowiedział czystym tekstem – traktujemy jako "ask"
      console.warn("AI returned plain text, treating as ask:", rawText.substring(0, 80));
      return { status: "ask", message: rawText.trim() };
    }

    if (aiResponse.status === 'ask' || aiResponse.status === 'preview') {
      return aiResponse;
    }
    
    // Jeśli status === 'complete', wykonujemy kreację
    const eventName = aiResponse.eventName || 'Nowe Wydarzenie';
    const eventDate = aiResponse.date || new Date().toISOString().split('T')[0];
    const detailedDescription = aiResponse.detailedDescription || 'Szczegóły wkrótce...';
    
    let folderId = 'brak-id';
    let docId = 'brak-id';
    
    if (aiResponse.needsFolders) {
      try {
        const folderRes = await drive.files.create({
          requestBody: {
            name: `${eventDate} - ${eventName}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [MASTER_FOLDER_ID]
          },
          fields: 'id'
        });
        folderId = folderRes.data.id || 'brak-id';
      } catch (e: any) {}
    }

      // Tworzenie głównego pliku GDoc przez Webhook GAS (GAS sam wpisuje treść)
      try {
        const gasUrl = "https://script.google.com/macros/s/AKfycbxNuE6UoXPwaXFZb4TyRvhbM23Et459rQp_QZZxTULDex5LJpnstNRUpK5jDPGIFU19/exec";
        console.log("[GAS] Calling webhook with content length:", detailedDescription ? detailedDescription.length : 0);
        const gasRes = await fetch(gasUrl, {
          method: "POST",
          body: JSON.stringify({
            name: `Opis Wydarzenia - ${eventName}`,
            folderId: '17zuZ6MOqYv_XqhJIW7-fgva7vT4KlpUG',
            content: `=== ${eventName} ===\n\n${detailedDescription}\n\n---\nSEKCJA Q&A / KOMENTARZE\n\n`
          }),
          headers: { "Content-Type": "text/plain" }
        });
        const gasData = await gasRes.json();
        console.log("[GAS] Response:", JSON.stringify(gasData));
        docId = gasData.id || 'brak-id';
      } catch (e: any) {
        console.error("GDocs error", e);
      }
    
    
    // Zapis do arkusza Lista_Wydarzen
    try {
      const { saveEventToList } = require('./sheetsApi');
      const eventId = 'E-' + Date.now();
      await saveEventToList({
        id: eventId,
        type: aiResponse.type || 'Inne',
        title: eventName,
        startDate: aiResponse.startDate || eventDate,
        endDate: aiResponse.endDate || eventDate,
        cost: aiResponse.cost || 'Nieokreślone',
        description: docId,
        targetGroups: aiResponse.targetGroups || 'Wszyscy'
      });
    } catch(err) {
      console.error("Błąd zapisu do arkusza wydarzeń:", err);
    }

    if (aiResponse.needsCalendar) {
      try {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: { summary: eventName, start: { date: eventDate }, end: { date: eventDate }, description: `Doc ID: ${docId}` }
        });
      } catch (e: any) {}
    }
    
    if (aiResponse.posterPrompt) {
      try {
        const imagenModel = vertexAI.preview.getGenerativeModel({ model: 'imagegeneration@006' });
        await imagenModel.generateContent({ contents: [{ role: 'user', parts: [{ text: aiResponse.posterPrompt }]}] });
      } catch (e: any) {}
    }
    
    return {
      status: 'complete',
      eventName,
      folderId,
      docId,
      message: 'Cała orkiestracja została zakończona sukcesem (Drive + Calendar + AI + GDocs)!'
    };

  } catch (error: any) {
    return { status: 'error', message: 'Błąd: ' + error.message };
  }
}

export async function rewriteEventDocumentWithComment(docId: string, newComment: string, author: string) {
  try {
    const auth = getGoogleAuth();
    const docs = google.docs({ version: 'v1', auth });

    const docMeta = await docs.documents.get({ documentId: docId });
    let currentContent = '';
    docMeta.data.body?.content?.forEach(c => {
      if (c.paragraph) {
        c.paragraph.elements?.forEach(e => {
          if (e.textRun) currentContent += e.textRun.content;
        });
      }
    });

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `
      Jesteś administratorem wydarzeń. Otrzymujesz aktualną treść ogłoszenia w Google Docs oraz nowe pytanie/komentarz od użytkownika "${author}".
      Twoim zadaniem jest nadpisać zawartość dokumentu. Jeśli pytanie wnosi nową, istotną informację do wydarzenia (lub wymaga uściślenia z punktu widzenia organizatora), WBUDUJ tę informację do głównego opisu, aby kolejni czytelnicy mieli pełny kontekst i nie musieli czytać komentarzy. 
      Niezależnie od tego, dopisz oryginalny komentarz i swoją ewentualną odpowiedź na sam dół w "SEKCJĘ Q&A / KOMENTARZE" (np. Data | Autor | Komentarz).
      
      AKTUALNA TREŚĆ DOKUMENTU:
      """
      ${currentContent}
      """

      NOWY KOMENTARZ / PYTANIE OD: ${author}
      TREŚĆ: "${newComment}"

      Zwróć TYLKO nową, gotową treść pełnego dokumentu, bez komentarzy pobocznych. Pamiętaj o znacznikach sekcji, ułóż to ładnie tekstowo.
    `;

    const result = await model.generateContent(prompt);
    const newContent = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const currentLength = docMeta.data.body?.content?.[docMeta.data.body.content.length - 1]?.endIndex || 2;
    
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: currentLength - 1
              }
            }
          },
          {
            insertText: {
              location: { index: 1 },
              text: newContent
            }
          }
        ]
      }
    });

    return { success: true, updatedContent: newContent };
  } catch (err: any) {
    console.error("Błąd nadpisywania dokumnetu:", err);
    throw err;
  }
}
export async function readEventDocument(docId: string) {
  try {
    const auth = getGoogleAuth();
    const docs = google.docs({ version: 'v1', auth });
    const docMeta = await docs.documents.get({ documentId: docId });
    let currentContent = '';
    docMeta.data.body?.content?.forEach(c => {
      if (c.paragraph) {
        c.paragraph.elements?.forEach(e => {
          if (e.textRun) currentContent += e.textRun.content;
        });
      }
    });
    let cleanContent = currentContent.replace(/^===\s*.*?\s*===\s*\n*/g, '');
    cleanContent = cleanContent.split(/---\s*\n*SEKCJA Q&A/i)[0];
    cleanContent = cleanContent.trim();
    return { success: true, content: cleanContent };
  } catch (err: any) {
    console.error('Błąd pobierania dokumentu:', err);
    throw err;
  }
}

export async function generateEventRewriteDraft(docId: string, directive: string, author: string) {
  try {
    const auth = getGoogleAuth();
    const docs = google.docs({ version: 'v1', auth });

    const docMeta = await docs.documents.get({ documentId: docId });
    let currentContent = '';
    docMeta.data.body?.content?.forEach(c => {
      if (c.paragraph) {
        c.paragraph.elements?.forEach(e => {
          if (e.textRun) currentContent += e.textRun.content;
        });
      }
    });

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const currentDateStr = new Date().toLocaleString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });

    const prompt = `
      Jesteś administratorem wydarzeń w szkole tańca Antidotum.
      Otrzymujesz aktualną treść ogłoszenia w Google Docs oraz nową wytyczną / odpowiedź organizatora odnośnie pytania ucznia "${author}".
      
      BIEŻĄCY CZAS (Weź pod uwagę przy datowaniu):
      Dzisiejsza data i czas: ${currentDateStr}.

      WYTYCZNA / INSTRUKCJA DLA AI:
      "${directive}"
      
      AKTUALNA TREŚĆ DOKUMENTU GOOGLE DOCS:
      """
      ${currentContent}
      """

      Twoim zadaniem jest poprawić i zaktualizować zawartość dokumentu. 
      Przekształć treść tak, aby wytyczna była zgrabnie i naturalnie wbudowana w treść ogłoszenia.
      Używaj entuzjastycznego tonu z odpowiednimi emoji (np. 🎉, 👟, 💃, 📍, 🗓️).
      
      ZASADA ZWIĘZŁOŚĆI I ABSOLUTNEGO BRAKU LANIA WODY:
      Pisz krótko i na temat. Zmień lub stwórz treść tak, aby zawierała wyłącznie konkretne fakty. 
      KATEGORYCZNIE wyklucz generowanie ogólnych, marketingowych formułek-zapychaczy o emocjach, rywalizacji czy pasji scenicznej (np. "Przygotujcie się na dzień pełen pasji, rywalizacji i niezapomnianych wrażeń!", "To idealna okazja, by zaprezentować swoje umiejętności..."), chyba że administrator wyraźnie zażądał ich dodania. Skup się wyłącznie na konkretnych informacjach.

      Zachowaj czystą strukturę z sekcjami:
      === [Tytuł Wydarzenia] ===
      [Główny Opis i Szczegóły]
      ---
      SEKCJA Q&A / KOMENTARZE
      [Dodany wpis z nowym pytaniem i odpowiedzią w sekcji Q&A na dole]

      Zwróć TYLKO nową, gotową pełną treść dokumentu.
    `;

    const result = await model.generateContent(prompt);
    const newContent = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return newContent.trim();
  } catch (err: any) {
    console.error("Błąd generowania propozycji zmian:", err);
    throw err;
  }
}

export async function applyEventRewrite(docId: string, newContent: string) {
  try {
    const auth = getGoogleAuth();
    const docs = google.docs({ version: 'v1', auth });

    const docMeta = await docs.documents.get({ documentId: docId });
    const currentLength = docMeta.data.body?.content?.[docMeta.data.body.content.length - 1]?.endIndex || 2;

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: currentLength - 1
              }
            }
          },
          {
            insertText: {
              location: { index: 1 },
              text: newContent
            }
          }
        ]
      }
    });

    return { success: true, updatedContent: newContent };
  } catch (err: any) {
    console.error("Błąd nadpisywania dokumentu GDocs:", err);
    throw err;
  }
}
