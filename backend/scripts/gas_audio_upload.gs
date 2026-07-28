/**
 * Google Apps Script — deploy jako Web App (Execute as: antidotum.vialflow@gmail.com, Access: Anyone)
 * 
 * Endpoint: POST z JSON { name, folderId, base64, mimeType }
 * Tworzy plik na Google Drive i zwraca { id, url }
 * 
 * INSTRUKCJA WDROŻENIA:
 * 1. Otwórz https://script.google.com
 * 2. Utwórz nowy projekt "Audio Upload Webhook"
 * 3. Wklej poniższy kod
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me (antidotum.vialflow@gmail.com)
 *    - Who has access: Anyone
 * 5. Skopiuj URL webhooka i wklej do backend/src/index.ts jako AUDIO_GAS_WEBHOOK_URL
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name = data.name || ('audio_' + Date.now() + '.mp3');
    var folderId = data.folderId || '1spUdddDtH87HjjrVuokuXj96YZCbMRDE';
    var base64 = data.base64;
    var mimeType = data.mimeType || 'audio/mpeg';
    
    if (!base64) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Brak danych audio (base64)' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var decoded = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(decoded, mimeType, name);
    
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);
    
    // Ustaw dostęp "Anyone with link can view" żeby proxy mogło pobrać
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var result = {
      success: true,
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId()
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'Audio Upload Webhook is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
