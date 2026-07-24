import express from 'express';
import nodemailer from 'nodemailer';
import { Expo } from 'expo-server-sdk';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { runEventOrchestration, rewriteEventDocumentWithComment, readEventDocument, generateEventRewriteDraft, applyEventRewrite } from './orchestrator';
import { initCronJobs, runPassGenerationJob, runPassRemindersJob } from './cron';
import { processVideo } from './videoPipeline';
import { chatWithRAG, refreshKnowledgeBase, generatePushDraft, refinePushDraft } from './rag';
import { getPaymentHistory, addPaymentTransaction, getStudentPasses, getAllPasses, generateStudentPass, payStudentPass, getGroups, getUsersAndParents, addStudent, deleteStudent, updateStudentFullData, approveStudent, getTeamRoles, getSchedule, addAttendance, getEvents, bookEvent, getEventBookings, approveEventBooking, payEventBooking, saveEventQuestion, getPendingEventQuestions, markEventQuestionAsAnswered, updateUserProfile, setParentDeviceToken, removeDeviceToken, updateUserPin, setExpoPushToken , saveNotification, getNotificationsForUser, createHomeworkTask, getHomeworkTasks, submitHomeworkResult, getAllHomeworkResults } from './sheetsApi';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from './middleware';
import { logConsentToWORM, deleteEphemeralVideo } from './audit';
import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

admin.initializeApp();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

dotenv.config();

const upload = multer({ dest: 'uploads/' });

const expo = new Expo();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve PWA static files z jednolitą ścieżką w kontenerze
const possiblePublicDirs = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'backend/public')
];
const PUBLIC_DIR = possiblePublicDirs.find(d => fs.existsSync(d)) || path.resolve(process.cwd(), 'public');

app.use(express.static(PUBLIC_DIR, {
  index: false,
  dotfiles: 'allow',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('manifest.json') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Global JWT Middleware
app.use((req, res, next) => {
  const publicRoutes = [
    '/api/auth/login',
    '/api/register',
    '/api/users/add',
    '/api/users/recover-pin',
    '/api/health',
    '/api/auth/device-pair-token',
    '/api/auth/pair-device',
    '/api/push/mock',
    '/api/tablet/recent-checkins',
    '/api/checkin',
    '/api/groups',
    '/api/notifications',
    '/api/users',
    '/api/coach/tasks',
    '/api/coach/choreographies',
    '/api/coach/transition',
    '/api/coach/homework/results',
    '/api/coach/submit'
  ];
  
  if (!req.path.startsWith('/api/') || publicRoutes.includes(req.path) || req.path.startsWith('/api/events') || req.path.startsWith('/api/coach') || req.path.startsWith('/api/drive/webhook') || req.path.startsWith('/api/debug/cron')) {
    return next();
  }
  
  authenticateJWT(req, res, next);
});



app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VialFlow API is running' });
});


app.get('/api/notifications', async (req, res) => {
  try {
    const { groupId, groupName, email, childIds } = req.query;
    if (!groupId) return res.status(400).json({ error: 'Brak groupId' });
    const notifications = await getNotificationsForUser(groupId);
    res.json(notifications);
  } catch (err) {
    console.error('Błąd pobierania powiadomień:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getGroups();
    res.json(groups);
  } catch (err) {
    console.error('Błąd pobierania grup:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsersAndParents();
    res.json(users);
  } catch (err) {
    console.error('Błąd pobierania użytkowników:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// --- AUTHENTICATION (RBAC & PIN) ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, pin } = req.body;
    if (!login || !pin) return res.status(400).json({ error: 'Brak loginu lub PINu' });

    const loginLower = login.trim().toLowerCase();
    const pinTrimmed = String(pin).trim();

    // 1. Sprawdź kadrę (Zespół)
    const team = await getTeamRoles();
    const staffMember = team.find(t => t.email === loginLower);
    if (staffMember) {
      if (staffMember.pin === pinTrimmed || staffMember.pin === '') {
        const payload = { id: staffMember.id, role: staffMember.role, email: staffMember.email, name: `${staffMember.firstName} ${staffMember.lastName}` };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ 
          success: true, 
          role: staffMember.role,
          userData: payload,
          token
        });
      }
      return res.status(401).json({ error: 'Nieprawidłowy PIN' });
    }

    // 2. Pobierz rodziców i dzieci z GSheets
    const parents = await getUsersAndParents();
    
    // Szukaj jako rodzic
    const parentMatch = parents.find(p => p.email.toLowerCase() === loginLower);
    if (parentMatch) {
      if (parentMatch.pin === pinTrimmed || parentMatch.pin === '') {
        const payload = { id: parentMatch.id, role: 'Rodzic', email: parentMatch.email, name: parentMatch.name };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
        return res.json({
          success: true,
          role: 'Rodzic',
          userData: parentMatch,
          token
        });
      }
      return res.status(401).json({ error: 'Nieprawidłowy PIN' });
    };

    // Szukaj jako uczeń (logowanie przez ID np. U-123)
    let childMatch = null;
    let parentOfChild = null;
    for (const p of parents) {
      const c = p.children.find((c: any) => c.id.toLowerCase() === loginLower || c.email.toLowerCase() === loginLower);
      if (c) {
        childMatch = c;
        parentOfChild = p;
        break;
      }
    }

    if (childMatch) {
      if (childMatch.pin === pinTrimmed || childMatch.pin === '') {
        // Sprawdź wiek
        let isAdult = false;
        if (childMatch.birthDate) {
          const dob = new Date(childMatch.birthDate);
          const ageDifMs = Date.now() - dob.getTime();
          const ageDate = new Date(ageDifMs); 
          const age = Math.abs(ageDate.getUTCFullYear() - 1970);
          isAdult = age >= 16;
        }

        const role = isAdult ? 'Uczen_Dorosly' : 'Uczen_Nieletni';
        const payload = { id: childMatch.id, role, name: childMatch.name, email: childMatch.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

        return res.json({
          success: true,
          role: isAdult ? 'Uczen_Dorosly' : 'Uczen_Nieletni',
          userData: childMatch,
          token
        });
      }
      return res.status(401).json({ error: 'Nieprawidłowy PIN' });
    }

    // Nie znaleziono
    return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

  } catch (err) {
    console.error('Błąd logowania:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// --- NETFLIX-STYLE AUTHENTICATION ---

const pairCodes = new Map<string, { email: string, expires: number }>();

app.post('/api/auth/device-pair-token', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Brak emaila' });
  
  // Generuj 6-cyfrowy kod
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pairCodes.set(code, { email, expires: Date.now() + 15 * 60 * 1000 }); // 15 minut
  
  res.json({ success: true, code });
});

app.post('/api/auth/pair-device', async (req, res) => {
  const { code } = req.body;
  const entry = pairCodes.get(code);
  
  if (!entry || entry.expires < Date.now()) {
    return res.status(400).json({ error: 'Nieprawidłowy lub wygasły kod' });
  }
  
  // Generuj trwały token
  const deviceToken = `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const success = await setParentDeviceToken(entry.email, deviceToken);
  
  if (success) {
    pairCodes.delete(code); // Usuń zużyty kod
    res.json({ success: true, deviceToken });
  } else {
    res.status(500).json({ error: 'Błąd parowania' });
  }
});

app.get('/api/auth/device-profiles', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Brak tokenu' });
  
  const parents = await getUsersAndParents();
  const matchedChildren = [];
  
  for (const parent of parents) {
    // Sprawdź czy któreś z dzieci ma ten token w kolumnie S
    const hasToken = parent.children.some((c: any) => c.deviceToken === token);
    if (hasToken) {
      // Zwracamy wszystkie dzieci tego rodzica
      matchedChildren.push(...parent.children.map((c: any) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        groupId: c.groupId,
        hasPin: !!c.pin
      })));
      break; // Złożenie, że token przypisany do 1 rodziny
    }
  }
  
  res.json({ success: true, profiles: matchedChildren });
});

app.post('/api/auth/verify-profile-pin', async (req, res) => {
  const { token, childId, pin } = req.body;
  if (!token || !childId || !pin) return res.status(400).json({ error: 'Brak danych' });
  
  const parents = await getUsersAndParents();
  let matchedChild = null;
  
  for (const parent of parents) {
    const hasToken = parent.children.some((c: any) => c.deviceToken === token);
    if (hasToken) {
      const child = parent.children.find((c: any) => c.id === childId);
      if (child && child.pin === pin) {
        matchedChild = child;
        break;
      }
    }
  }
  
  if (matchedChild) {
    res.json({ success: true, role: 'Uczen_Nieletni', userData: matchedChild });
  } else {
    res.status(401).json({ error: 'Nieprawidłowy PIN' });
  }
});

app.post('/api/auth/set-profile-pin', async (req, res) => {
  const { childId, newPin, targetType } = req.body;
  const success = await updateUserPin(childId, newPin, targetType);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Błąd aktualizacji PINu' });
  }
});

app.post('/api/auth/unpair-device', async (req, res) => {
  const { token } = req.body;
  const success = await removeDeviceToken(token);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Błąd odłączania urządzenia' });
  }
});

// --- PUSH NOTIFICATIONS ---
app.post('/api/push/register', async (req, res) => {
  const { identifier, pushToken } = req.body;
  if (!identifier || !pushToken) return res.status(400).json({ error: 'Brak danych' });
  const success = await setExpoPushToken(identifier, pushToken);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Błąd zapisu tokenu Push' });
  }
});

app.post('/api/push/send', async (req, res) => {
    const { targetGroups, targetGroup, title, body } = req.body;
    const groups = targetGroups || (targetGroup ? [targetGroup] : []);
    if (groups.length === 0 || !title || !body) return res.status(400).json({ error: 'Brak danych' });

    try {
      const parents = await getUsersAndParents();
      let expoTokens: string[] = [];
      let fcmTokens: string[] = [];
  
      for (const parent of parents) {
        for (const child of parent.children) {
          if (child.expoPushToken && !child.expoPushToken.startsWith('MOCK-TOKEN-')) {
            if (groups.includes('wszyscy') || groups.includes('wszyscy_uczniowie') || groups.includes(child.groupId) || groups.includes(child.id) || groups.includes(child.email) || groups.includes(parent.email)) {
              if (Expo.isExpoPushToken(child.expoPushToken)) {
                expoTokens.push(child.expoPushToken);
              } else {
                fcmTokens.push(child.expoPushToken);
              }
            }
          }
        }
      }
  
      expoTokens = [...new Set(expoTokens)];
      fcmTokens = [...new Set(fcmTokens)];
  
      if (expoTokens.length === 0 && fcmTokens.length === 0) {
        return res.json({ success: true, message: 'Brak urządzeń do wysłania', sentCount: 0 });
      }
  
      let sentCount = 0;

      if (expoTokens.length > 0) {
        const messages = expoTokens.map(token => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: { withSome: 'data' },
        }));
    
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
            sentCount += chunk.length;
          } catch (error) {
            console.error('Błąd wysyłania chunka push (Expo):', error);
          }
        }
      }

      if (fcmTokens.length > 0) {
        const payload = {
          notification: { title, body },
          tokens: fcmTokens,
        };
        try {
          const response = await getMessaging().sendEachForMulticast(payload);
          sentCount += response.successCount;
        } catch (error) {
          console.error('Błąd wysyłania FCM:', error);
        }
      }
  
      await saveNotification(title, body, groups, 'System');
        res.json({ success: true, sentCount });
    } catch (err) {
      console.error('Błąd API push:', err);
      res.status(500).json({ error: 'Błąd serwera' });
    }
  });

  app.post('/api/users/add', async (req, res) => {
  try {
    const result = await addStudent(req.body);
    res.json(result);
  } catch (err) {
    console.error('Błąd dodawania ucznia:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// --- RECOVER PIN via EMAIL ---
app.post('/api/users/recover-pin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Brak adresu e-mail' });

    const searchEmail = email.trim().toLowerCase();
    let foundPin = null;
    let foundName = 'Użytkowniku';

    // 1. Check Team (Admins/Instructors)
    const team = await getTeamRoles();
    const staff = team.find(t => t.email.toLowerCase() === searchEmail);
    if (staff && staff.pin) {
      foundPin = staff.pin;
      foundName = staff.firstName || 'Członku Zespołu';
    }

    // 2. Check Parents & Adult Students
    if (!foundPin) {
      const parents = await getUsersAndParents();
      const parentList = Array.from(parents.values());
      
      for (const p of parentList) {
        if (p.email.toLowerCase() === searchEmail) {
          if (p.pin) {
            foundPin = p.pin;
            foundName = p.name || 'Rodzicu/Opiekunie';
            break;
          }
        }
        
        // Also check OP2
        for (const child of p.children) {
          if (child.op2Email && child.op2Email.trim().toLowerCase() === searchEmail) {
            if (child.op2Pin) {
              foundPin = child.op2Pin;
              foundName = child.op2Name || 'Drugi Opiekunie';
              break;
            }
          }
          if (child.email && child.email.trim().toLowerCase() === searchEmail) {
            // Student
            if (child.pin) {
              foundPin = child.pin;
              foundName = child.firstName || 'Uczniu';
              break;
            }
          }
        }
        if (foundPin) break;
      }
    }

    // Send email if found
    if (foundPin) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER || 'antidotum.vialflow@gmail.com',
          pass: process.env.GMAIL_PASS || 'lqcv krch aucy drgn'
        }
      });

      const mailOptions = {
        from: '"Antidotum App" <antidotum.vialflow@gmail.com>',
        to: searchEmail,
        subject: 'Twoje przypomnienie PIN-u do aplikacji Antidotum',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #F472B6;">Aplikacja Antidotum</h2>
            <p>Witaj ${foundName},</p>
            <p>Ktoś poprosił o przypomnienie numeru PIN logowania powiązanego z tym adresem e-mail.</p>
            <p>Twój aktualny PIN to: <strong style="font-size: 24px; letter-spacing: 2px;">${foundPin}</strong></p>
            <p><br>Jeśli to nie Ty składałeś to zapytanie, po prostu zignoruj tę wiadomość, a Twój PIN pozostanie bezpieczny.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Wiadomość wygenerowana automatycznie przez system VialFlow.</p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail z przypomnieniem PIN wysłany pomyślnie do:', searchEmail);
      } catch (error) {
        console.error('Błąd wysyłania e-maila:', error);
      }
    }

    // We respond with success either way to prevent email enumeration
    res.json({ success: true, message: 'Jeśli e-mail istnieje, instrukcje zostały wysłane.' });

  } catch (err) {
    console.error('Błąd w /api/users/recover-pin:', err);
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

app.delete('/api/users/:childId', async (req, res) => {
  try {
    const result = await deleteStudent(req.params.childId);
    res.json(result);
  } catch (err) {
    console.error('Błąd usuwania ucznia:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/api/users/:childId/edit', async (req, res) => {
  try {
    const result = await updateStudentFullData(req.params.childId, req.body);
    res.json({ success: result });
  } catch (err) {
    console.error('Błąd edycji ucznia:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/api/users/:childId/approve', async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'Brak grupy' });
    const result = await approveStudent(req.params.childId, groupId);
    res.json(result);
  } catch (err) {
    console.error('Błąd zatwierdzania ucznia:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Endpoint Event Orchestratora AI (Faza 3)
app.post('/api/orchestrate', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Brak messages' });

    const result = await runEventOrchestration(messages);
    res.json(result);
  } catch (err) {
    console.error('Błąd Orkiestratora API:', err);
    res.status(500).json({ error: 'Wystąpił błąd podczas orkiestracji zdarzenia.' });
  }
});

// --- LISTA WYDARZEŃ I REZERWACJE ---
app.get('/api/events', async (req, res) => {
  try {
    const events = await getEvents();
    res.json(events);
  } catch (err) {
    console.error('Blad /api/events:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.get('/api/events/bookings', async (req, res) => {
  try {
    const bookings = await getEventBookings();
    res.json(bookings);
  } catch (err) {
    console.error('Blad /api/events/bookings GET:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.post('/api/events/book', async (req, res) => {
  try {
    const { childId, eventId } = req.body;
    if (!childId || !eventId) return res.status(400).json({ error: 'Brak childId lub eventId' });
    const result = await bookEvent(childId, eventId);
    res.json({ success: result });
  } catch (err) {
    console.error('Blad /api/events/book:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.put('/api/events/bookings/:sheetRow/approve', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await approveEventBooking(Number(req.params.sheetRow), status || 'Zatwierdzony');
    res.json({ success: result });
  } catch (err) {
    console.error('Blad /api/events/bookings/approve:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.post('/api/events/bookings/:sheetRow/pay', async (req, res) => {
  try {
    const { blikCode, method, childId, childName, amount, title } = req.body;
    const result = await payEventBooking(Number(req.params.sheetRow));
    if (result) {
      const cleanAmount = Number(String(amount || '').replace(/[^0-9.]/g, '')) || 0;
      await addPaymentTransaction({
        childId: childId || '',
        childName: childName || 'Nieznany',
        amount: cleanAmount,
        title: title || 'Opłata za wydarzenie',
        type: 'Wydarzenie',
        method: method || 'BLIK',
        status: 'Zakończona',
        handledByEmail: 'System BLIK'
      });
    }
    res.json({ success: result });
  } catch (err) {
    console.error('Blad /api/events/bookings/pay:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

// Endpoint do czytania dokumentu wydarzenia z GDocs
app.get('/api/events/docs/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const result = await readEventDocument(docId);
    res.json(result);
  } catch (err) {
    console.error('Błąd pobierania dokumentu:', err);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania Google Docs.' });
  }
});

app.get('/api/events/:docId/comments', async (req, res) => {
  try {
    const { docId } = req.params;
    const result = await readEventDocument(docId);
    res.json(result);
  } catch (err) {
    console.error('Błąd pobierania dokumentu:', err);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania Google Docs.' });
  }
});

// Zapisanie pytania do Skrzynki (POST /api/events/questions)
app.post('/api/events/questions', async (req, res) => {
  try {
    const { docId, comment, author } = req.body;
    if (!docId || !comment || !author) return res.status(400).json({ error: 'Brak docId, komentarza lub autora' });

    const success = await saveEventQuestion(docId, author, comment);
    if (success) {
      res.json({ success: true, message: 'Pytanie trafiło do organizatora!' });
    } else {
      res.status(500).json({ error: 'Błąd zapisywania pytania.' });
    }
  } catch (err) {
    console.error('Błąd zapisu pytania:', err);
    res.status(500).json({ error: 'Wystąpił błąd podczas zapisu pytania.' });
  }
});

app.post('/api/events/:docId/questions', async (req, res) => {
  try {
    const { docId } = req.params;
    const { comment, author } = req.body;
    if (!comment || !author) return res.status(400).json({ error: 'Brak komentarza lub autora' });

    const success = await saveEventQuestion(docId, author, comment);
    if (success) {
      res.json({ success: true, message: 'Pytanie trafiło do organizatora!' });
    } else {
      res.status(500).json({ error: 'Błąd zapisywania pytania.' });
    }
  } catch (err) {
    console.error('Błąd zapisu pytania:', err);
    res.status(500).json({ error: 'Wystąpił błąd podczas zapisu pytania.' });
  }
});

// Pobieranie oczekujących pytań (dla Admina)
app.get('/api/events/questions/pending', async (req, res) => {
  try {
    const questions = await getPendingEventQuestions();
    res.json(questions);
  } catch (err) {
    console.error('Błąd pobierania pytań:', err);
    res.status(500).json({ error: 'Wystąpił błąd.' });
  }
});

// Oznaczanie pytania jako przeczytane/rozwiązane bez nadpisywania opisu
app.post('/api/events/questions/:sheetRow/mark-answered', async (req, res) => {
  try {
    const { sheetRow } = req.params;
    const success = await markEventQuestionAsAnswered(Number(sheetRow));
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Błąd aktualizacji statusu' });
    }
  } catch (err) {
    console.error('Błąd mark-answered:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Generowanie podglądu zmian w dokumencie z udziałem AI na podstawie dyrektyw admina
app.post('/api/events/questions/preview-rewrite', async (req, res) => {
  try {
    const { docId, originalQuestion, author, directive } = req.body;
    if (!docId) return res.status(400).json({ error: 'Brak docId' });

    const combinedDirective = `PYTANIE OD ${author || 'Ucznia'}: "${originalQuestion || ''}" \n WYTYCZNE ORGANIZATORA: "${directive || 'Uwzględnij to uściślenie w opisie.'}"`;
    const draft = await generateEventRewriteDraft(docId, combinedDirective, author || 'Uczeń');
    res.json({ success: true, draft });
  } catch (err: any) {
    console.error('Błąd generowania podglądu zmian:', err);
    res.status(500).json({ error: err.message || 'Błąd AI' });
  }
});

// Endpoint do zatwierdzania odpowiedzi i nadpisywania GDocs
app.post('/api/events/questions/:sheetRow/answer', async (req, res) => {
  try {
    const { sheetRow } = req.params;
    const { docId, approvedContent, originalQuestion, author, answer } = req.body;
    
    let result;
    if (approvedContent) {
      // Bezpośredni zapis zatwierdzonego podglądu
      result = await applyEventRewrite(docId, approvedContent);
    } else {
      // Tradycyjny fallback
      const combinedContext = `PYTANIE: ${originalQuestion} \n ODPOWIEDŹ ORGANIZATORA: ${answer}`;
      result = await rewriteEventDocumentWithComment(docId, combinedContext, author);
    }
    
    if (result && result.success) {
      await markEventQuestionAsAnswered(Number(sheetRow));
      res.json(result);
    } else {
      res.status(500).json({ error: 'Błąd zapisu GDocs' });
    }
  } catch (err) {
    console.error('Błąd odpowiedzi i nadpisywania:', err);
    res.status(500).json({ error: 'Wystąpił błąd.' });
  }
});

// --- HISTORIA PLATNOSCI I KARNETY ---
app.get('/api/payments/history', async (req, res) => {
  try {
    const { childId } = req.query;
    const history = await getPaymentHistory(childId as string);
    res.json(history);
  } catch (err) {
    console.error('Blad /api/payments/history:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.get('/api/payments/passes', async (req, res) => {
  try {
    const { childId } = req.query;
    const passes = await getStudentPasses(childId as string);
    res.json(passes);
  } catch (err) {
    console.error('Blad /api/payments/passes:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.get('/api/payments/passes/all', async (req, res) => {
  try {
    const passes = await getAllPasses();
    res.json(passes);
  } catch (err) {
    console.error('Blad /api/payments/passes/all:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.post('/api/payments/passes/generate/:childId', async (req, res) => {
  try {
    const result = await generateStudentPass(req.params.childId);
    res.json(result);
  } catch (err) {
    console.error('Blad /api/payments/passes/generate:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.post('/api/payments/passes/:childId/pay', async (req, res) => {
  try {
    const { blikCode, method, childName, amount, title } = req.body;
    const result = await payStudentPass(req.params.childId);
    if (result) {
      const cleanAmount = Number(String(amount || '').replace(/[^0-9.]/g, '')) || 0;
      await addPaymentTransaction({
        childId: req.params.childId,
        childName: childName || 'Nieznany',
        amount: cleanAmount,
        title: title || 'Opłata za karnet',
        type: 'Karnet',
        method: method || 'BLIK',
        status: 'Zakończona',
        handledByEmail: 'System BLIK'
      });
    }
    res.json({ success: result });
  } catch (err) {
    console.error('Blad /api/payments/passes/pay:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.post('/api/payments/add', async (req, res) => {
  try {
    const result = await addPaymentTransaction(req.body);
    res.json(result);
  } catch (err) {
    console.error('Blad /api/payments/add:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

app.put('/api/users/:childId/profile', async (req, res) => {
  try {
    const result = await updateUserProfile(req.params.childId, req.body);
    res.json({ success: result });
  } catch (err) {
    console.error('Blad /api/users/profile:', err);
    res.status(500).json({ error: 'Blad serwera' });
  }
});

// --- HARMONOGRAM I FREKWENCJA ---
app.get('/api/schedule', async (req, res) => {
  try {
    const { groupId } = req.query;
    const schedule = await getSchedule(groupId as string);
    res.json(schedule);
  } catch (err) {
    console.error('Błąd endpointu /api/schedule:', err);
    res.status(500).json({ error: 'Błąd pobierania harmonogramu' });
  }
});

  // --- RAG AI CHAT ---
  app.post('/api/rag/chat', async (req, res) => {
    try {
      const { message } = req.body;
      const userRole = (req as any).user?.role || 'Rodzic';
      const response = await chatWithRAG(message, userRole);
      res.json(response);
    } catch (err) {
      console.error('Błąd RAG:', err);
      res.status(500).json({ error: 'Błąd generowania odpowiedzi AI' });
    }
  });

  app.post('/api/rag/push-draft', async (req, res) => {
    try {
      const { message } = req.body;
      const result = await generatePushDraft(message);
      res.json(result); // { draft, suggestedTarget }
    } catch (err) {
      console.error('Błąd push-draft:', err);
      res.status(500).json({ error: 'Błąd generowania szkicu' });
    }
  });

  app.post('/api/rag/push-refine', async (req, res) => {
    try {
      const { currentDraft, modification } = req.body;
      const newDraft = await refinePushDraft(currentDraft, modification);
      res.json({ draft: newDraft });
    } catch (err) {
      console.error('Błąd push-refine:', err);
      res.status(500).json({ error: 'Błąd modyfikacji szkicu' });
    }
  });

// Endpoint do weryfikacji obecności z QR (Faza 2)
// --- FAZA 5: REVERSE QR CHECK-IN ---
app.post('/api/checkin', async (req, res) => {
    try {
      let childId: string, terminalId: string;

      if (req.body.qrData) {
         const parsed = JSON.parse(req.body.qrData);
         childId = parsed.childId;
         terminalId = parsed.terminalId;
      } else {
         childId = req.body.childId;
         terminalId = req.body.terminalId;
      }

      if (!childId) return res.status(400).json({ error: 'Brak childId' });
      if (!terminalId) terminalId = 'REC-MAIN-1';

      // Zapisz obecnosc w Google Sheets
      await addAttendance(childId);

      // Pobierz imie ucznia do wyswietlenia na tablecie
      let childName = 'Uczen: ' + childId;
      try {
        const parents = await getUsersAndParents();
        for (const parent of parents) {
          const child = parent.children?.find((c: any) => c.id === childId);
          if (child) { childName = `${child.firstName} ${child.lastName}`; break; }
        }
      } catch {}

      // Zapisz w pamieci podrejcznej tabletu
      if (!global.recentCheckins) global.recentCheckins = {};
      if (!global.recentCheckins[terminalId]) global.recentCheckins[terminalId] = [];
      global.recentCheckins[terminalId].push({ childId, childName, timestamp: Date.now() });

      res.json({ success: true });
    } catch(err) {
      console.error('Blad checkin:', err);
      res.status(500).json({ error: 'Blad serwera' });
    }
  });

  // Endpoint dla short-pollingu tabletu
  app.get('/api/tablet/recent-checkins', (req, res) => {
    const { terminalId } = req.query;
    if (!terminalId || !global.recentCheckins || !global.recentCheckins[terminalId as string]) {
      return res.json([]);
    }
    const checkins = global.recentCheckins[terminalId as string];
    global.recentCheckins[terminalId as string] = [];
    res.json(checkins);
  });


// --- FAZA 6: AI DANCE COACH (Trener Wideo) ---
app.get('/api/coach/choreographies', (req, res) => {
  res.json([
    { id: '1', title: 'Hip-Hop Basic Groove', instructor: 'Kamil', duration: '0:45', level: 'Pocz�tkuj�cy' },
    { id: '2', title: 'Jazz Pirouette Combo', instructor: 'Marta', duration: '1:20', level: '�redniozaawansowany' },
    { id: '3', title: 'High Heels Walk', instructor: 'Sara', duration: '0:30', level: 'Pocz�tkuj�cy' }
  ]);
});

app.post('/api/coach/analyze', upload.single('video'), (req, res) => {
  console.log('[AI Coach] Otrzymano wideo do analizy. Przesy�anie do Vertex AI...');
  // Symulacja ci�kiej pracy modelu ML:
  setTimeout(async () => {
    res.json({
      success: true,
      score: 82,
      timingAccuracy: 75,
      postureAccuracy: 90,
      feedback: [
        "�wietnie trzymasz ram� w pierwszej sekwencji (0:05-0:15)!",
        "Popracuj nad timingiem w przej�ciu do parteru (sp�nienie 0.2s).",
        "Twoje piruety s� stabilne, dobra praca st�p."
      ]
    });
  }, 3000);
});

app.post('/api/coach/tasks', async (req, res) => {
  try {
    const result = await createHomeworkTask(req.body);
    res.json(result);
  } catch (err) {
    console.error('Błąd POST /api/coach/tasks:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.get('/api/coach/tasks', async (req, res) => {
  try {
    const { childName, groupId } = req.query;
    const tasks = await getHomeworkTasks(childName as string || '', groupId as string || '');
    res.json(tasks);
  } catch (err) {
    console.error('Błąd GET /api/coach/tasks:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/coach/submit', async (req, res) => {
  try {
    const result = await submitHomeworkResult(req.body);
    res.json(result);
  } catch (err) {
    console.error('Błąd POST /api/coach/submit:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.get('/api/coach/homework/results', async (req, res) => {
  try {
    const results = await getHomeworkResults();
    res.json(results);
  } catch (err) {
    console.error('Błąd GET /api/coach/homework/results:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/coach/generate-choreo', (req, res) => {
  try {
    const { prompt = '', style = '', difficulty = '' } = req.body || {};
    const text = String(prompt).toLowerCase();

    // Inteligentny wybór klocków ruchowych 3D na podstawie opisu trenera
    let selectedMoveIds = ['hiphop_toprock_cross', 'hiphop_bounce_groove', 'comm_body_wave', 'break_toprock_basic'];
    let targetBPM = 104;
    let sequenceTitle = 'AI Wygenerowany Układ Treningowy';

    if (text.includes('kpop') || text.includes('k-pop') || text.includes('ostry') || text.includes('sharp')) {
      selectedMoveIds = ['kpop_sharp_locks', 'hiphop_toprock_cross', 'comm_body_wave', 'kpop_sharp_locks'];
      targetBPM = 120;
      sequenceTitle = 'K-Pop Sharp Routine (AI)';
    } else if (text.includes('heels') || text.includes('obcas') || text.includes('zmysłow') || text.includes('sassy')) {
      selectedMoveIds = ['heels_sassy_strut', 'comm_body_wave', 'heels_sassy_strut', 'hiphop_bounce_groove'];
      targetBPM = 104;
      sequenceTitle = 'High Heels Glam Routine (AI)';
    } else if (text.includes('break') || text.includes('b-boy') || text.includes('street') || text.includes('parter')) {
      selectedMoveIds = ['break_toprock_basic', 'hiphop_toprock_cross', 'break_toprock_basic', 'hiphop_bounce_groove'];
      targetBPM = 112;
      sequenceTitle = 'B-Boy Street Combo (AI)';
    } else if (text.includes('commercial') || text.includes('funk') || text.includes('fala') || text.includes('jazz')) {
      selectedMoveIds = ['comm_body_wave', 'hiphop_bounce_groove', 'comm_body_wave', 'heels_sassy_strut'];
      targetBPM = 108;
      sequenceTitle = 'Commercial Fluid Routine (AI)';
    } else if (text.includes('hip-hop') || text.includes('hiphop') || text.includes('bounce') || text.includes('groove')) {
      selectedMoveIds = ['hiphop_toprock_cross', 'hiphop_bounce_groove', 'break_toprock_basic', 'hiphop_bounce_groove'];
      targetBPM = 100;
      sequenceTitle = 'Hip-Hop Urban Routine (AI)';
    }

    const DANCE_MOVE_CATALOG: Record<string, any> = {
      'hiphop_toprock_cross': {
        id: 'hiphop_toprock_cross',
        name: 'Toprock Cross Step',
        style: 'Hip-Hop',
        difficulty: 'Początkujący',
        nativeBPM: 100,
        durationBeats: 8,
        description: 'Dynamiczny krok otwarcia z krzyżowaniem nóg.',
        tags: ['toprock', 'bounce', 'footwork'],
        keyframes: [
          { beatOffset: 0, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0,0] }, { boneName: 'mixamorigSpine1', rotation: [0.1,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.4,0.5,0.6] }, { boneName: 'mixamorigRightArm', rotation: [0.4,-0.5,-0.6] }] },
          { beatOffset: 2, rotations: [{ boneName: 'mixamorigHips', rotation: [0.2,0.5,-0.2] }, { boneName: 'mixamorigSpine1', rotation: [0.25,0.4,0.1] }, { boneName: 'mixamorigLeftArm', rotation: [1.2,0.8,-0.4] }, { boneName: 'mixamorigRightArm', rotation: [-0.5,-0.8,-0.5] }] },
          { beatOffset: 4, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0,0] }, { boneName: 'mixamorigSpine1', rotation: [0.1,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.4,0.5,0.6] }, { boneName: 'mixamorigRightArm', rotation: [0.4,-0.5,-0.6] }] },
          { beatOffset: 6, rotations: [{ boneName: 'mixamorigHips', rotation: [0.2,-0.5,0.2] }, { boneName: 'mixamorigSpine1', rotation: [0.25,-0.4,-0.1] }, { boneName: 'mixamorigLeftArm', rotation: [-0.5,0.8,0.5] }, { boneName: 'mixamorigRightArm', rotation: [1.2,-0.8,0.4] }] },
          { beatOffset: 8, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0,0] }, { boneName: 'mixamorigSpine1', rotation: [0.1,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.4,0.5,0.6] }, { boneName: 'mixamorigRightArm', rotation: [0.4,-0.5,-0.6] }] }
        ]
      },
      'hiphop_bounce_groove': {
        id: 'hiphop_bounce_groove',
        name: 'Hip-Hop Heavy Groove',
        style: 'Hip-Hop',
        difficulty: 'Początkujący',
        nativeBPM: 96,
        durationBeats: 8,
        description: 'Głęboki groove z opadaniem klatki piersiowej.',
        tags: ['groove', 'bounce'],
        keyframes: [
          { beatOffset: 0, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0,0] }, { boneName: 'mixamorigSpine', rotation: [0.05,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.5,0.2,0.3] }, { boneName: 'mixamorigRightArm', rotation: [0.5,-0.2,-0.3] }] },
          { beatOffset: 2, rotations: [{ boneName: 'mixamorigHips', rotation: [0.35,0,0] }, { boneName: 'mixamorigSpine', rotation: [0.4,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.1,0.4,0.8] }, { boneName: 'mixamorigRightArm', rotation: [1.1,-0.4,-0.8] }] },
          { beatOffset: 4, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0,0] }, { boneName: 'mixamorigSpine', rotation: [0.05,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.5,0.2,0.3] }, { boneName: 'mixamorigRightArm', rotation: [0.5,-0.2,-0.3] }] },
          { beatOffset: 6, rotations: [{ boneName: 'mixamorigHips', rotation: [0.35,0,0] }, { boneName: 'mixamorigSpine', rotation: [0.4,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.1,0.4,0.8] }, { boneName: 'mixamorigRightArm', rotation: [1.1,-0.4,-0.8] }] },
          { beatOffset: 8, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0,0] }, { boneName: 'mixamorigSpine', rotation: [0.05,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.5,0.2,0.3] }, { boneName: 'mixamorigRightArm', rotation: [0.5,-0.2,-0.3] }] }
        ]
      },
      'comm_body_wave': {
        id: 'comm_body_wave',
        name: 'Commercial Fluid Body Wave',
        style: 'Commercial',
        difficulty: 'Średniozaawansowany',
        nativeBPM: 108,
        durationBeats: 8,
        description: 'Płynna fala przechodząca od głowy do bioder.',
        tags: ['wave', 'commercial'],
        keyframes: [
          { beatOffset: 0, rotations: [{ boneName: 'mixamorigNeck', rotation: [-0.3,0,0] }, { boneName: 'mixamorigSpine2', rotation: [-0.1,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.2,0.4,1.2] }, { boneName: 'mixamorigRightArm', rotation: [0.2,-0.4,-1.2] }] },
          { beatOffset: 2, rotations: [{ boneName: 'mixamorigNeck', rotation: [0.4,0,0] }, { boneName: 'mixamorigSpine2', rotation: [-0.3,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.6,0.2,0.8] }, { boneName: 'mixamorigRightArm', rotation: [0.6,-0.2,-0.8] }] },
          { beatOffset: 4, rotations: [{ boneName: 'mixamorigNeck', rotation: [0,0,0] }, { boneName: 'mixamorigSpine2', rotation: [0.4,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.8,0,0.4] }, { boneName: 'mixamorigRightArm', rotation: [0.8,0,-0.4] }] },
          { beatOffset: 6, rotations: [{ boneName: 'mixamorigNeck', rotation: [-0.2,0,0] }, { boneName: 'mixamorigSpine2', rotation: [0.1,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.4,0.3,1.0] }, { boneName: 'mixamorigRightArm', rotation: [0.4,-0.3,-1.0] }] },
          { beatOffset: 8, rotations: [{ boneName: 'mixamorigNeck', rotation: [-0.3,0,0] }, { boneName: 'mixamorigSpine2', rotation: [-0.1,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.2,0.4,1.2] }, { boneName: 'mixamorigRightArm', rotation: [0.2,-0.4,-1.2] }] }
        ]
      },
      'break_toprock_basic': {
        id: 'break_toprock_basic',
        name: 'B-Boy Toprock Indian Step',
        style: 'Breakdance',
        difficulty: 'Średniozaawansowany',
        nativeBPM: 112,
        durationBeats: 8,
        description: 'Klasyczny Indian Step z wykrętem bioder i otwarciem rąk.',
        tags: ['bboy', 'street'],
        keyframes: [
          { beatOffset: 0, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0.6,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.4,0.5,0.8] }, { boneName: 'mixamorigRightArm', rotation: [-0.4,-0.5,-0.4] }] },
          { beatOffset: 4, rotations: [{ boneName: 'mixamorigHips', rotation: [0,-0.6,0] }, { boneName: 'mixamorigLeftArm', rotation: [-0.4,0.5,0.4] }, { boneName: 'mixamorigRightArm', rotation: [1.4,-0.5,-0.8] }] },
          { beatOffset: 8, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0.6,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.4,0.5,0.8] }, { boneName: 'mixamorigRightArm', rotation: [-0.4,-0.5,-0.4] }] }
        ]
      },
      'heels_sassy_strut': {
        id: 'heels_sassy_strut',
        name: 'High Heels Sassy Strut',
        style: 'High Heels',
        difficulty: 'Średniozaawansowany',
        nativeBPM: 104,
        durationBeats: 8,
        description: 'Zmysłowy krok w obcasach.',
        tags: ['heels', 'sassy'],
        keyframes: [
          { beatOffset: 0, rotations: [{ boneName: 'mixamorigHips', rotation: [0.1,0.4,-0.3] }, { boneName: 'mixamorigLeftArm', rotation: [1.8,0.6,0.4] }, { boneName: 'mixamorigRightArm', rotation: [0.3,-0.4,-0.8] }] },
          { beatOffset: 4, rotations: [{ boneName: 'mixamorigHips', rotation: [0.1,-0.4,0.3] }, { boneName: 'mixamorigLeftArm', rotation: [0.3,0.4,0.8] }, { boneName: 'mixamorigRightArm', rotation: [1.8,-0.6,-0.4] }] },
          { beatOffset: 8, rotations: [{ boneName: 'mixamorigHips', rotation: [0.1,0.4,-0.3] }, { boneName: 'mixamorigLeftArm', rotation: [1.8,0.6,0.4] }, { boneName: 'mixamorigRightArm', rotation: [0.3,-0.4,-0.8] }] }
        ]
      },
      'kpop_sharp_locks': {
        id: 'kpop_sharp_locks',
        name: 'K-Pop Sharp Isolation',
        style: 'K-Pop',
        difficulty: 'Zaawansowany',
        nativeBPM: 120,
        durationBeats: 8,
        description: 'Precyzyjne blokady ramion.',
        tags: ['kpop', 'isolation'],
        keyframes: [
          { beatOffset: 0, rotations: [{ boneName: 'mixamorigSpine2', rotation: [0.2,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.5,1.2,0] }, { boneName: 'mixamorigRightArm', rotation: [1.5,-1.2,0] }] },
          { beatOffset: 2, rotations: [{ boneName: 'mixamorigSpine2', rotation: [-0.2,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.8,0,1.4] }, { boneName: 'mixamorigRightArm', rotation: [0.8,0,-1.4] }] },
          { beatOffset: 4, rotations: [{ boneName: 'mixamorigHips', rotation: [0,0.3,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.8,0.5,0.2] }, { boneName: 'mixamorigRightArm', rotation: [0.2,-0.8,-0.8] }] },
          { beatOffset: 6, rotations: [{ boneName: 'mixamorigHips', rotation: [0,-0.3,0] }, { boneName: 'mixamorigLeftArm', rotation: [0.2,0.8,0.8] }, { boneName: 'mixamorigRightArm', rotation: [1.8,-0.5,-0.2] }] },
          { beatOffset: 8, rotations: [{ boneName: 'mixamorigSpine2', rotation: [0.2,0,0] }, { boneName: 'mixamorigLeftArm', rotation: [1.5,1.2,0] }, { boneName: 'mixamorigRightArm', rotation: [1.5,-1.2,0] }] }
        ]
      }
    };

    const blocks = selectedMoveIds.map(id => DANCE_MOVE_CATALOG[id] || DANCE_MOVE_CATALOG['hiphop_toprock_cross']);

    res.json({
      success: true,
      sequence: {
        id: `seq_ai_${Date.now()}`,
        title: sequenceTitle,
        targetBPM,
        blocks
      }
    });
  } catch (err) {
    console.error('Błąd POST /api/coach/generate-choreo:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/coach/transition', (req, res) => {
  console.log('[Vertex AI Proxy] Żądanie in-betweening dla figur...');
  const numJoints = 24;
  const dof = 6;
  const numFrames = 120;
  const buffer = Buffer.alloc(numJoints * dof * numFrames * 4);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  for (let i = 0; i < numJoints * dof * numFrames; i++) {
    view.setFloat32(i * 4, Math.sin(i * 0.05), true);
  }
  res.set('Content-Type', 'application/octet-stream');
  res.send(buffer);
});

// Obsługa PWA fallback z gwarancją serwowania index.html
app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      let html = fs.readFileSync(indexPath, 'utf8');

      // Gwarancja wstrzyknięcia skryptu PWA jeśli szablon index.html jest bez skryptu
      const jsDir = path.join(PUBLIC_DIR, '_expo/static/js/web');
      if (fs.existsSync(jsDir)) {
        const files = fs.readdirSync(jsDir);
        const jsFiles = files
          .filter((f: string) => f.startsWith('index-') && f.endsWith('.js'))
          .map((f: string) => ({
            name: f,
            mtime: fs.statSync(path.join(jsDir, f)).mtimeMs
          }))
          .sort((a, b) => b.mtime - a.mtime);

        const mainJs = jsFiles.length > 0 ? jsFiles[0].name : null;
        if (mainJs && !html.includes(mainJs)) {
          html = html.replace('</body>', `<script src="/_expo/static/js/web/${mainJs}" defer></script></body>`);
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (e) {
      console.error('Błąd odczytu index.html:', e);
      return res.status(404).send('Index not found');
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[Server] VialFlow API dziaa na porcie ${PORT}`);
  // Uruchom cron jobs
  initCronJobs();
});
