
const fs = require("fs");
const fixFile = (path) => {
  let content = fs.readFileSync(path, "utf8");
  const dict = {
    "Opacone": "Op≥acone",
    "Nieprawidowy": "Nieprawid≥owy",
    "Bd skanowania": "B≥πd skanowania",
    "Bd poczenia z serwerem": "B≥πd po≥πczenia z serwerem",
    "Uytkowniku": "Uøytkowniku",
    "Najblisze zajcia": "Najbliøsze zajÍcia",
    "Peen grafik": "Pe≥en grafik",
    "Brak zaj": "Brak zajÍÊ",
    "Rejestracja obecnoci": "Rejestracja obecnoúci",
    "Obecno potwierdzona!": "ObecnoúÊ potwierdzona!",
    "Rejestracj obecnoci mona wykona": "RejestracjÍ obecnoúci moøna wykonaÊ",
    "zajcia": "zajÍcia",
    "kadym": "kaødym",
    "Zrozumiaem": "Zrozumia≥em",
    "POTWIERD OBECNO": "POTWIERDè OBECNOå∆",
    "Jeste w szkole? Zeskanuj kod QR z tabletu w recepcji, aby potwierdzi swoje wejcie na sal.": "Jesteú w szkole? Zeskanuj kod QR z tabletu w recepcji, aby potwierdziÊ swoje wejúcie na salÍ.",
    "Nadchodzce": "Nadchodzπce",
    "Twj Grafik": "TwÛj Grafik",
    "Zarzdzaj swoimi zajciami, patnociami i komunikacj w jednym miejscu. Aplikacja w peni uatwi Ci ycie w szkole taca.": "Zarzπdzaj swoimi zajÍciami, p≥atnoúciami i komunikacjπ w jednym miejscu. Aplikacja w pe≥ni u≥atwi Ci øycie w szkole taÒca.",
    "Zakocz rejestracj i Poznaj aplikacj": "ZakoÒcz rejestracjÍ i Poznaj aplikacjÍ",
    "Aplikacja Szkoy Taca": "Aplikacja Szko≥y TaÒca",
    "r": "år",
    "  ": " ï ",
    "Zainstaluj Aplikacj": "Zainstaluj AplikacjÍ"
  };
  
  for (const [bad, good] of Object.entries(dict)) {
    content = content.split(bad).join(good);
  }
  
  fs.writeFileSync(path, content, "utf8");
};

fixFile("C:/Antidotum-VialFlow/mobile-app/App.tsx");
fixFile("C:/Antidotum-VialFlow/mobile-app/components/InstallPrompt.tsx");
console.log("Fixed files.");

