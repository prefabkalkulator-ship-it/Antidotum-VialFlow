import { VertexAI } from '@google-cloud/vertexai';
import { google } from 'googleapis';
import path from 'path';
import { getPrices } from './sheetsApi';

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
          q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
          fields: 'files(id, name)',
        });
        const files = res.data.files || [];
        
        for (const file of files) {
          if (file.id) {
            try {
              const exportRes = await drive.files.export({
                fileId: file.id,
                mimeType: 'text/plain'
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

export async function chatWithRAG(userMessage: string, userRole: string = 'Rodzic') {
  if (memoryWiki.length === 0) {
    console.log('[RAG] memoryWiki puste, wymuszam/oczekuję na odświeżenie...');
    await refreshKnowledgeBase();
  }
  let allowedFolders = ['Publiczne'];
  if (userRole === 'Instruktor') allowedFolders.push('Instruktorzy');
  if (userRole === 'Administrator') allowedFolders.push('Instruktorzy', 'Admin');

  const allowedDocs = memoryWiki.filter(doc => allowedFolders.includes(doc.folder));
  const contextText = allowedDocs.map(doc => `Dokument: ${doc.title}\nTreść:\n${doc.content}`).join('\n\n---Koniec Dokumentu---\n\n');

  console.log(`[RAG] userRole=${userRole}, allowedDocs.length=${allowedDocs.length}, contextLength=${contextText.length}`);

  const generativeModel = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  const systemPrompt = `Jesteś asystentem AI szkoły tańca Antidotum. Twój ton jest uprzejmy, życzliwy i pomocny, a w wypowiedziach naturalnie używasz odpowiednich emoji 😊✨.
Rola użytkownika to: ${userRole}.
Zasady odpowiedzi:
1. Nie witaj się z użytkownikiem (zrobiłeś to już wcześniej). Bądź bardzo uprzejmy, ale konkretny – unikaj "lania wody". Odpowiadaj zwięźle, w maksymalnie 2-4 zdaniach.
2. Opieraj się TYLKO na poniższym KONTEKŚCIE Z BAZY WIEDZY. Jeśli informacji tam nie ma, odpowiedz grzecznie, że niestety nie posiadasz takich danych 😔.
3. Nigdy nie zmyślaj informacji. Zawsze staraj się pomóc.

KONTEKST Z BAZY WIEDZY:
${contextText}`;

  const requestMsg = `Pytanie użytkownika: ${userMessage}`;

  try {
    const aiResponse = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${requestMsg}` }] }]
    });

    return {
      answer: aiResponse.response.candidates?.[0]?.content?.parts?.[0]?.text || 'Nie umiem odpowiedzieć.',
      contextUsed: contextText !== ''
    };
  } catch (aiErr) {
    console.error('[RAG] Błąd Vertex AI (Gemini):', aiErr);
    throw new Error('Błąd generowania odpowiedzi RAG');
  }
}
