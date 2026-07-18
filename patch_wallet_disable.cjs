
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// We injected this earlier:
// <TouchableOpacity 
//   style={styles.scanButton}
//   onPress={() => handleScanClick(c.id)}
//   disabled={scanningMap[c.id]}
// >

let oldButton = `<TouchableOpacity 
                   style={styles.scanButton}
                   onPress={() => handleScanClick(c.id)}
                   disabled={scanningMap[c.id]}
                 >
                   {scanningMap[c.id] ? <Loader2 color={COLORS.background} size={24} /> : <Text style={styles.scanButtonText}>SKANUJ KOD W RECEPCJI</Text>}
                 </TouchableOpacity>`;

let hasClassToday = `(nextClass && nextClass.dayOfWeek === (new Date().getDay() === 0 ? 7 : new Date().getDay()))`;

let newButton = `<TouchableOpacity 
                   style={[styles.scanButton, !${hasClassToday} && { backgroundColor: '#333' }]}
                   onPress={() => handleScanClick(c.id)}
                   disabled={scanningMap[c.id] || !${hasClassToday}}
                 >
                   {scanningMap[c.id] ? <Loader2 color={COLORS.background} size={24} /> : <Text style={[styles.scanButtonText, !${hasClassToday} && { color: COLORS.textMuted }]}>{${hasClassToday} ? 'SKANUJ KOD W RECEPCJI' : 'BRAK ZAJÊÆ'}</Text>}
                 </TouchableOpacity>`;

content = content.replaceAll(oldButton, newButton);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Button disabled patched!");

