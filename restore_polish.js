const fs = require('fs');

const fixFile = (path) => {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Specific replacements for \uFFFD based on context
  const dict = {
    "Op\uFFFDacone": "Op\u0142acone",
    "Nieprawid\uFFFDowy": "Nieprawid\u0142owy",
    "B\uFFFD\uFFFDd skanowania": "B\u0142\u0105d skanowania",
    "B\uFFFD\uFFFDd po\uFFFD\uFFFDczenia z serwerem": "B\u0142\u0105d po\u0142\u0105czenia z serwerem",
    "U\uFFFDytkowniku": "U\u017Cytkowniku",
    "Najbli\uFFFDsze zaj\uFFFDtcia": "Najbli\u017Csze zaj\u0119cia",
    "Najbli\uFFFDsze zaj\uFFFDcia": "Najbli\u017Csze zaj\u0119cia",
    "Pe\uFFFD'en grafik": "Pe\u0142en grafik",
    "Pe\uFFFDen grafik": "Pe\u0142en grafik",
    "Brak zaj\uFFFD\uFFFD w harmonogramie": "Brak zaj\u0119\u0107 w harmonogramie",
    "Rejestracja obecno\uFFFDci": "Rejestracja obecno\u015Bci",
    "Obecno\uFFFD\uFFFD potwierdzona!": "Obecno\u015B\u0107 potwierdzona!",
    "Rejestracj\uFFFD obecno\uFFFDci mo\uFFFDna wykona\uFFFD": "Rejestracj\u0119 obecno\u015Bci mo\u017Cna wykona\u0107",
    "zaj\uFFFDcia": "zaj\u0119cia",
    "ka\uFFFDdym": "ka\u017Cdym",
    "Zrozumia\uFFFDem": "Zrozumia\u0142em",
    "POTWIERD\uFFFD OBECNO\uFFFD\uFFFD": "POTWIERD\u0179 OBECNO\u015A\u0106",
    "Jeste\uFFFD w szkole? Zeskanuj kod QR z tabletu w recepcji, aby potwierdzi\uFFFD swoje wej\uFFFDcie na sal\uFFFD.": "Jeste\u015B w szkole? Zeskanuj kod QR z tabletu w recepcji, aby potwierdzi\u0107 swoje wej\u015Bcie na sal\u0119.",
    "Nadchodz\uFFFDce": "Nadchodz\u0105ce",
    "Tw\uFFFDj Grafik": "Tw\u00F3j Grafik",
    "Zarz\uFFFDdzaj swoimi zaj\uFFFDciami, p\uFFFDatno\uFFFDciami i komunikacj\uFFFD w jednym miejscu. Aplikacja w pe\uFFFDni u\uFFFDatwi Ci \uFFFDycie w szkole ta\uFFFDca.": "Zarz\u0105dzaj swoimi zaj\u0119ciami, p\u0142atno\u015Bciami i komunikacj\u0105 w jednym miejscu. Aplikacja w pe\u0142ni u\u0142atwi Ci \u017Cycie w szkole ta\u0144ca.",
    "Zako\uFFFDcz rejestracj\uFFFD i Poznaj aplikacj\uFFFD": "Zako\u0144cz rejestracj\u0119 i Poznaj aplikacj\u0119",
    "Aplikacja Szko\uFFFDy Ta\uFFFDca": "Aplikacja Szko\u0142y Ta\u0144ca",
    "\uFFFDr": "\u015Ar",
    "Zainstaluj Aplikacj\uFFFD": "Zainstaluj Aplikacj\u0119"
  };

  for (const [bad, good] of Object.entries(dict)) {
    content = content.split(bad).join(good);
  }
  
  // Any lingering \uFFFD characters? Just replace common ones heuristically if any remain
  content = content.replace(/Wygeneruj kod w aplikacji rodzica \(sekcja Profil\) i podaj go tutaj\./g, "Wygeneruj kod w aplikacji rodzica (sekcja Profil) i podaj go tutaj.");
  content = content.replace(/Wpisz 6-cyfrowy kod z aplikacji bankowej/g, "Wpisz 6-cyfrowy kod z aplikacji bankowej");
  content = content.replace(/\?\? Hej!/g, "👋 Hej!");
  content = content.replace(/Witaj w Antidotum! \?\?/g, "Witaj w Antidotum! 👋");

  fs.writeFileSync(path, content, 'utf8');
};

fixFile('C:/Antidotum-VialFlow/mobile-app/App.tsx');
fixFile('C:/Antidotum-VialFlow/mobile-app/components/InstallPrompt.tsx');
console.log('Restored Polish chars.');
