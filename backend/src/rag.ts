import { VertexAI } from '@google-cloud/vertexai';
import { google } from 'googleapis';
import path from 'path';
import { getPrices, moveStudents } from './sheetsApi';

const PROJECT_ID = 'antidotum-vialflow-mvp';
const LOCATION = 'europe-central2';
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  folder: 'Publiczne' | 'Instruktorzy' | 'Admin';
}

let memoryWiki: KnowledgeDoc[] = [];
let refreshPromise: Promise<void> | null = null;

const FOLDERS = {
  Admin: '1WlwQjxJ34UlhQl0ZRYHjDtURWD9_g5kt',
  Instruktorzy: '1K3puRh6JEhbPIzpD4JT309hmGbYoHwuZ',
  Publiczne: '17zuZ6MOqYv_XqhJIW7-fgva7vT4KlpUG'
};

const getDriveAuth = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../service-account.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const client = await auth.getClient();
  return google.drive({ version: 'v3', auth: client as any });
};

export const refreshKnowledgeBase = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    console.log('[RAG] Rozpoczęcie odświeżania bazy Wiki z Google Drive...');
    try {
      const drive = await getDriveAuth();
    const newWiki: KnowledgeDoc[] = [];

    // Pobranie cennika z sheetsApi jako wirtualny dokument Publiczny
    const pricesText = await getPrices();
    newWiki.push({
      id: 'prices-doc',
      title: 'Cennik Zajęć',
      content: pricesText,
      folder: 'Publiczne'
    });

    for (const [folderName, folderId] of Object.entries(FOLDERS)) {
      try {
        const res = await drive.files.list({
          q: `'${folderId}' in parents and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet') and trashed=false`,
          fields: 'files(id, name, mimeType)',
        });
        const files = res.data.files || [];
        
        for (const file of files) {
          if (file.id) {
            try {
              const isSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
              const exportRes = await drive.files.export({
                fileId: file.id,
                mimeType: isSheet ? 'text/csv' : 'text/plain'
              });
              newWiki.push({
                id: file.id,
                title: file.name || 'Dokument',
                content: String(exportRes.data),
                folder: folderName as any
              });
            } catch (err: any) {
              console.warn(`[RAG] Nie udało się pobrać treści pliku ${file.name}:`, err.message);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[RAG] Nie udało się wylistować folderu ${folderName}:`, err.message);
      }
    }
    
    memoryWiki = newWiki;
    console.log(`[RAG] Odświeżanie zakończone. Pobrano ${memoryWiki.length} dokumentów.`);
  } catch (error) {
    console.error('[RAG] Błąd podczas odświeżania wiedzy:', error);
  } finally {
    refreshPromise = null;
  }
  })();
  return refreshPromise;
};

// Automatyczne odświeżanie co 15 minut
setInterval(refreshKnowledgeBase, 15 * 60 * 1000);

let globalPendingFunctionCall: any = null;

export async function chatWithRAG(userMessage: string, userRole: string = 'Rodzic', history: Array<{role: string, text: string}> = []) {
  const positiveWords = ['ok', 'tak', 'zatwierdzam', 'potwierdzam', 'zgadzam', 'jasne', 'pewnie', 'oczywiście'];
  if (globalPendingFunctionCall && positiveWords.some(w => userMessage.toLowerCase().trim() === w || userMessage.toLowerCase().includes(w))) {
      const call = globalPendingFunctionCall;
      globalPendingFunctionCall = null;
      if (call.name === 'moveStudentsGroup') {
          const args = call.args;
          const success = await moveStudents(args.studentNames || [], args.targetGroup || '', args.sourceGroup || '');
          return { answer: success ? 'Gotowe! Uczniowie zostali pomyślnie przeniesieni.' : 'Wystąpił błąd podczas przenoszenia uczniów. Sprawdź logi.', contextUsed: false };
      }
  }

  if (memoryWiki.length === 0) {
    console.log('[RAG] memoryWiki puste, wymuszam/oczekuję na odświeżenie...');
    await refreshKnowledgeBase();
  }
  let allowedFolders = ['Publiczne'];
  if (userRole === 'Instruktor') {
    allowedFolders = ['Publiczne', 'Instruktorzy'];
  } else if (userRole === 'Administrator') {
    allowedFolders = ['Publiczne', 'Instruktorzy', 'Admin'];
  }

  const allowedDocs = memoryWiki.filter(doc => allowedFolders.includes(doc.folder));
  const contextText = allowedDocs.map(doc => `Dokument: ${doc.title}\nTreść:\n${doc.content}`).join('\n\n---Koniec Dokumentu---\n\n');

  console.log(`[RAG] userRole=${userRole}, allowedDocs.length=${allowedDocs.length}, contextLength=${contextText.length}`);

  const generativeModel = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [
      {
        functionDeclarations: [
          {
            name: 'moveStudentsGroup',
            description: 'Zmienia grupę wskazanych uczniów z obecnej grupy na inną. Wywołaj tę funkcję, gdy użytkownik prosi o przepisanie uczniów.',
            parameters: {
              type: 'OBJECT' as any,
              properties: {
                studentNames: {
                  type: 'ARRAY' as any,
                  description: 'Lista imion i nazwisk uczniów do przeniesienia.',
                  items: { type: 'STRING' as any }
                },
                targetGroup: {
                  type: 'STRING' as any,
                  description: 'Nowa nazwa grupy.'
                },
                sourceGroup: {
                  type: 'STRING' as any,
                  description: 'Obecna grupa uczniów (jeśli znana).'
                }
              },
              required: ['studentNames', 'targetGroup']
            }
          }
        ]
      }
    ]
  });

  const isAdminOrCoach = userRole === 'Administrator' || userRole === 'Instruktor';
  
  const systemPrompt = isAdminOrCoach
    ? `Jesteś asystentem AI szkoły tańca Antidotum (Baza danych / Analityk).
Rola użytkownika to: ${userRole}.
Zasady odpowiedzi:
1. Twoje odpowiedzi muszą być skrajnie rzeczowe, profesjonalne, suche i formalne. Żadnych powitań, żadnych emoji, żadnej grzeczności – podawaj czyste fakty, listy lub wykonuj polecenia jak najszybciej.
2. Opieraj się TYLKO na poniższym KONTEKŚCIE Z BAZY WIEDZY.
3. Nigdy nie zmyślaj informacji.`
    : `Jesteś asystentem AI szkoły tańca Antidotum. Twój ton jest uprzejmy, życzliwy i pomocny, a w wypowiedziach naturalnie używasz odpowiednich emoji 😊✨.
Rola użytkownika to: ${userRole}.
Zasady odpowiedzi:
1. Nie witaj się z użytkownikiem (zrobiłeś to już wcześniej). Bądź bardzo uprzejmy, ale konkretny – unikaj "lania wody". Odpowiadaj zwięźle, w maksymalnie 2-4 zdaniach.
2. Opieraj się TYLKO na poniższym KONTEKŚCIE Z BAZY WIEDZY. Jeśli informacji tam nie ma, odpowiedz grzecznie, że niestety nie posiadasz takich danych 😔.
3. Nigdy nie zmyślaj informacji. Zawsze staraj się pomóc.`;

  const requestMsg = `Pytanie użytkownika: ${userMessage}`;
  
  const contentsArray: any[] = [];
  
  for (const h of history) {
    contentsArray.push({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: h.text }]
    });
  }
  
  contentsArray.push({
    role: 'user',
    parts: [{ text: `${systemPrompt}\n\nKONTEKST Z BAZY WIEDZY:\n${contextText}\n\n${requestMsg}` }]
  });

  try {
    const aiResponse = await generativeModel.generateContent({
      contents: contentsArray
    });

    const firstPart = aiResponse.response.candidates?.[0]?.content?.parts?.[0];
    
    if (firstPart?.functionCall) {
      globalPendingFunctionCall = {
         name: firstPart.functionCall.name,
         args: firstPart.functionCall.args
      };
      let dynamicAnswer = 'Rozpoznano komendę operacyjną. Zanim ją wykonam, proszę o zatwierdzenie (napisz po prostu "ok" lub "zatwierdzam").';
      
      if (firstPart.functionCall.name === 'moveStudentsGroup') {
        const args = firstPart.functionCall.args as any;
        const students = args.studentNames || [];
        const group = args.targetGroup || 'nieznanej grupy';
        
        let studentsText = 'wszystkich omawianych uczniów';
        if (students.length > 0 && students.length <= 3) {
           studentsText = students.join(', ');
        } else if (students.length > 3) {
           studentsText = `${students.length} uczniów`;
        }
        
        dynamicAnswer = `Planuję przepisać ${studentsText} do grupy ${group}. Zatwierdź działanie, pisząc "ok".`;
      }
      
      return {
        answer: dynamicAnswer,
        contextUsed: true,
        functionCall: {
          name: firstPart.functionCall.name,
          args: firstPart.functionCall.args
        }
      };
    }

    return {
      answer: firstPart?.text || 'Nie umiem odpowiedzieć.',
      contextUsed: contextText !== ''
    };
  } catch (aiErr) {
    console.error('[RAG] Błąd Vertex AI (Gemini):', aiErr);
    throw new Error('Błąd generowania odpowiedzi RAG');
  }
}

export async function generatePushDraft(instruction: string) {
  const generativeModel = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const prompt = `Otrzymujesz polecenie wysłania powiadomienia od użytkownika: "${instruction}".
Zredaguj gotowy, krótki i rzeczowy tekst powiadomienia Push. Ma być uprzejmy, ale bez lania wody (1-2 zwięzłe zdania). Zawsze dodaj na końcu adekwatne emoji.
Popraw błędy ortograficzne (np. w imionach). Jeśli wskazano odbiorcę, wyciągnij go do 'suggestedTarget', a 'targetType' to jedna z opcji: "opiekun", "uczen", "grupa", "wszyscy".

Musisz zwrócić odpowiedź jako JSON:
{
  "draft": "Krótki tekst powiadomienia 😊",
  "suggestedTarget": "jan kowalski",
  "targetType": "opiekun"
}`;

  try {
    const aiResponse = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    // Użycie responseMimeType gwarantuje surowego JSON'a.
    const text = aiResponse.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    
    return { 
      draft: parsed.draft || instruction, 
      suggestedTarget: parsed.suggestedTarget || '',
      targetType: parsed.targetType || 'wszyscy'
    };
  } catch(e) {
    console.error('[RAG] Błąd generatePushDraft:', e);
    return { draft: instruction, suggestedTarget: '', targetType: 'wszyscy' };
  }
}

export async function refinePushDraft(currentDraft: string, modification: string) {
  const generativeModel = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  const prompt = `Jesteś asystentem redagującym powiadomienia Push. Masz obecny szkic powiadomienia: "${currentDraft}". 
Użytkownik powiedział, że chce to zmienić: "${modification}". 
Zmodyfikuj szkic zgodnie z jego życzeniem zachowując zwięzły, uprzejmy styl powiadomienia Push z emoji. 
Zwróć TYLKO nową treść powiadomienia, bez zbędnych słów.`;

  try {
    const aiResponse = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return aiResponse.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || (currentDraft + ' ' + modification);
  } catch(e) {
    console.error('[RAG] Błąd refinePushDraft:', e);
    return currentDraft + ' ' + modification;
  }
}

