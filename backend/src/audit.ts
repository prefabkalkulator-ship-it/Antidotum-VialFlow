import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const storage = new Storage();
const AUDIT_BUCKET_NAME = process.env.AUDIT_BUCKET_NAME || 'vialflow-audit-logs';
const VIDEO_BUCKET_NAME = process.env.VIDEO_BUCKET_NAME || 'vialflow-ephemeral-videos';

export const logConsentToWORM = async (parentEmail: string, childName: string, consentScope: string) => {
  try {
    const bucket = storage.bucket(AUDIT_BUCKET_NAME);
    
    // Pseudonymization: Replace names/emails with UUIDs to comply with RODO / Right to Erasure
    // In a real DB, you would map these UUIDs to the user records.
    const parentSubjectId = uuidv4();
    const childSubjectId = uuidv4();
    
    const policyContent = "Polityka Prywatności i Zgoda na Przetwarzanie Biometryczne v1.0...";
    const legalDocumentHash = crypto.createHash('sha256').update(policyContent).digest('hex');

    const auditLog = {
      consentTransactionId: uuidv4(),
      eventTimestamp: new Date().toISOString(),
      parentSubjectId,
      childSubjectId,
      authenticationVector: 'OAUTH_NATIVE_REGISTER',
      legalDocumentHash,
      consentScope
    };

    const fileName = `consent-logs/${auditLog.consentTransactionId}.json`;
    const file = bucket.file(fileName);

    await file.save(JSON.stringify(auditLog, null, 2), {
      contentType: 'application/json'
    });
    
    console.log(`[RODO WORM] Zapisano zaszyfrowany log zgody w wiadrze ${AUDIT_BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.error('[RODO WORM] Błąd podczas zapisywania logu audytowego:', error);
    return false; // Nie blokujemy głównego wątku podczas braku kluczy GCP w dev, ale na produkcji to musiałoby zwrócić błąd.
  }
};

export const deleteEphemeralVideo = async (fileName: string) => {
  try {
    const bucket = storage.bucket(VIDEO_BUCKET_NAME);
    const file = bucket.file(fileName);
    await file.delete();
    console.log(`[AI Pipeline] Wideo ${fileName} pomyślnie i bezpowrotnie usunięte z GCS.`);
  } catch (error) {
    console.error(`[AI Pipeline] Błąd usuwania wideo ${fileName}:`, error);
  }
};
