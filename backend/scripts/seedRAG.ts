import { Pool } from 'pg';
import { ingestKnowledge } from '../src/rag';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const docs = [
  {
    title: 'Wewnętrzny system prowizji instruktorskich 2026',
    content: 'Stawka godzinowa za prowadzenie grupy zaawansowanej to 150 PLN netto. Prowizja od każdego sprzedanego karnetu to 10% dla instruktora prowadzącego.',
    allowedRoles: ['Administrator']
  },
  {
    title: 'Reguły Orkiestracji Wydarzeń i Eventów',
    content: 'Tylko administratorzy mają prawo zatwierdzać budżet wydarzeń. Organizacja eventów zewnętrznych wymaga wpisu do tabeli Antidotum_Events.',
    allowedRoles: ['Administrator']
  },
  {
    title: 'Procedury awaryjne i dostęp do sali',
    content: 'Klucze do sal A i B znajdują się w sejfie na portierni. Kod do sejfu to 9988. Po zajęciach należy upewnić się, że klimatyzacja jest wyłączona.',
    allowedRoles: ['Administrator', 'Instruktor']
  },
  {
    title: 'Regulamin Szkoły Tańca Antidotum',
    content: 'Opłaty za zajęcia należy uiszczać do 10-go dnia każdego miesiąca. W przypadku nieobecności, uczeń ma prawo odrobić zajęcia w innej grupie w ciągu 14 dni.',
    allowedRoles: ['ALL']
  },
  {
    title: 'Zasady ubioru na zajęcia',
    content: 'Na zajęcia z baletu wymagany jest czarny strój jednoczęściowy oraz baletki. Na zajęcia hip-hop zalecane są luźne spodnie dresowe i czyste buty sportowe.',
    allowedRoles: ['ALL']
  }
];

async function seed() {
  console.log('Rozpoczynam synchronizację z wirtualnymi folderami Google Drive...');
  
  for (const doc of docs) {
    console.log(`Ingest: [${doc.allowedRoles.join(', ')}] ${doc.title}`);
    await ingestKnowledge(pool, doc.title, doc.content, doc.allowedRoles);
  }

  console.log('Synchronizacja zakończona pomyślnie!');
  process.exit(0);
}

seed();
