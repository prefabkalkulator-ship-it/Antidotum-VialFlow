import cron from 'node-cron';
import { getUsersAndParents, getGroups, getAllPasses, generateStudentPass } from './sheetsApi';

export const runPassGenerationJob = async () => {
  console.log('[Cron] Rozpoczynam wystawianie karnetów (Ręczne/Automatyczne)...');
  try {
    const usersData = await getUsersAndParents();
    const groupsData = await getGroups();
    const existingPasses = await getAllPasses();
    
    const now = new Date();
    // Ostatni dzień obecnego miesiąca
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const validUntil = `${lastDay.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

    // Znajdź wszystkie dzieci, używając Mapy aby usunąć duplikaty w przypadku dwóch opiekunów
    const allChildrenMap = new Map();
    usersData.forEach((u: any) => {
      if (u.children && u.children.length > 0) {
        u.children.forEach((c: any) => allChildrenMap.set(c.id, c));
      } else if (u.role === 'Uczen_Dorosly') {
        allChildrenMap.set(u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName, groupId: u.groupId });
      }
    });
    const allChildren = Array.from(allChildrenMap.values());

    let generatedCount = 0;
    console.log(`[Cron Debug] Znaleziono łącznie dzieci do przetworzenia: ${allChildren.length}`);

    for (const child of allChildren) {
      if (!child.groupId || child.groupId === 'Brak' || child.groupId === 'brak' || child.groupId === '') {
        console.log(`[Cron Debug] Pomijam dziecko ${child.id} (${child.firstName}) - brak grupy (${child.groupId})`);
        continue;
      }

      const group = groupsData.find(g => g.id === child.groupId || g.name === child.groupId);
      if (!group) {
        console.log(`[Cron Debug] Pomijam dziecko ${child.id} (${child.firstName}) - nie znaleziono grupy o id: ${child.groupId}`);
        continue;
      }

      const variant = `Karnet ${group.name}`;
      const price = group.passPrice ? group.passPrice.toString() : '150';
      const childName = `${child.firstName} ${child.lastName || ''}`.trim();

      // Zabezpieczenie przed dublowaniem
      const hasPassThisMonth = existingPasses.some((p: any) => p.childId === child.id && p.validUntil === validUntil);
      if (hasPassThisMonth) {
        console.log(`[Cron Debug] Pomijam dziecko ${child.id} (${child.firstName}) - posiada już karnet ważny do ${validUntil}`);
        continue;
      }

      const success = await generateStudentPass(child.id, childName, group.name, variant, validUntil, price);
      if (success) {
        generatedCount++;
        console.log(`[Cron Debug] Wygenerowano karnet dla ${childName} (Grupa: ${group.name})`);
      } else {
        console.log(`[Cron Debug] generateStudentPass zwróciło false dla ${childName}`);
      }
    }

    console.log(`[Cron] Zakończono generowanie karnetów. Wygenerowano: ${generatedCount}`);
    return { success: true, count: generatedCount };
  } catch (err) {
    console.error('[Cron] Błąd podczas generowania karnetów:', err);
    return { success: false, error: err };
  }
};

export const runPassRemindersJob = async () => {
  console.log('[Cron] Sprawdzam zaległe płatności za karnety (Ręczne/Automatyczne)...');
  try {
    const passes = await getAllPasses();
    const now = new Date();
    const currentMonthStr = `.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

    const unpaidPasses = passes.filter((p: any) => 
      p.status === 'Do Zapłaty' && 
      p.autoReminder === true &&
      p.validUntil.endsWith(currentMonthStr)
    );

    console.log(`[Cron] Znaleziono ${unpaidPasses.length} zaległych karnetów.`);
    
    for (const pass of unpaidPasses) {
      // Tu uderzamy do API powiadomień. Użyjemy mockowej notyfikacji.
      try {
        await fetch('http://localhost:3000/api/push/mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Przypomnienie: Termin opłaty za ${pass.variant} minął 10-go. Prosimy o uregulowanie zaległości w kwocie ${pass.price} PLN.`,
            groupName: pass.group
          })
        });
        console.log(`[Cron] Wysłano przypomnienie do rodzica ucznia ${pass.childName} za ${pass.variant}`);
      } catch (e) {
        console.error(`[Cron] Błąd wysyłania powiadomienia do ${pass.childId}`);
      }
    }
    return { success: true, count: unpaidPasses.length };
  } catch (err) {
    console.error('[Cron] Błąd podczas sprawdzania przypomnień o karnetach:', err);
    return { success: false, error: err };
  }
};

export const initCronJobs = () => {
  console.log('[Cron] Inicjalizacja harmonogramu zadań...');

  cron.schedule('0 8 1 * *', () => {
    runPassGenerationJob();
  });

  cron.schedule('0 8 10-31 * *', () => {
    runPassRemindersJob();
  });
};
