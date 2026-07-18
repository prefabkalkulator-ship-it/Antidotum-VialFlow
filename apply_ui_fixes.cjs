
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Fix 1: "Nie pamiêtasz PIN?"
content = content.replace(
  "alert('Skontaktuj sit z organizatorem aby zresetowa PIN.')",
  "Platform.OS === 'web' ? window.alert('Skontaktuj si\u0119 z organizatorem aby zresetowa\u0107 PIN.') : Alert.alert('PIN', 'Skontaktuj si\u0119 z organizatorem aby zresetowa\u0107 PIN.')"
);
content = content.replace("Nie pamittasz PIN?", "Nie pami\u0119tasz PIN?");
// Just in case it's already partly fixed or the exact string above is wrong, let's do broader replacements
content = content.replace(/alert\('Skontaktuj.*?PIN\.'\)/, "Platform.OS === 'web' ? window.alert('Skontaktuj siê z organizatorem aby zresetowaæ PIN.') : Alert.alert('PIN', 'Skontaktuj siê z organizatorem aby zresetowaæ PIN.')");
content = content.replace(/Nie pami.*?tasz PIN\?/, "Nie pamiêtasz PIN?");

// Fix 4: panel logowania: E-mail po lewej, PIN po lewej
// Find the PIN input label:
content = content.replace(
  /<Text style=\{\{ color: COLORS\.textMuted, marginBottom: 5, textAlign: 'center' \}\}>PIN<\/Text>/,
  "<Text style={{ color: COLORS.textMuted, marginBottom: 5, textAlign: 'left' }}>PIN</Text>"
);

// Fix 5: panel Profil "WYGENERUJ KOD PAROWANIA" skrolowanie do góry.
// We can wrap the user profile inside a ScrollView and scrollTo(0) or just let the user see it by putting it higher up, or passing a ref to ScrollView.
// Let's check if there is a ScrollView in Profil.

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Replaced");

