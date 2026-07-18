const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

const walletCardsRegex = /({\/\* Wallet Cards \*\/}[\s\S]*?){\/\* Next Class Widget \*\/}/;
const matchWallet = code.match(walletCardsRegex);
if (!matchWallet) { console.error('Could not find Wallet Cards section'); process.exit(1); }

const nextClassRegex = /({\/\* Next Class Widget \*\/}[\s\S]*?){\/\* Upcoming Events Widget \*\/}/;
const matchNextClass = code.match(nextClassRegex);
if (!matchNextClass) { console.error('Could not find Next Class Widget'); process.exit(1); }

let walletCardsStr = matchWallet[1];
let nextClassStr = matchNextClass[1];

walletCardsStr = walletCardsStr.replace(
  /<View key=\{c\.id\} style=\{\[styles\.walletCard, \{ marginBottom: 20 \}\]\}>/g,
  '<View key={c.id} style={[styles.walletCard, { marginBottom: 20 }, !todayClass && { padding: 15, backgroundColor: \'#222\', opacity: 0.9 }]}>'
);
walletCardsStr = walletCardsStr.replace(
  /<Camera color=\{COLORS\.background\} size=\{48\} \/>/g,
  '<QrCode color={todayClass ? COLORS.background : \'#555\'} size={48} />'
);
walletCardsStr = walletCardsStr.replace(
  /backgroundColor: '#FFFFFF'/g,
  'backgroundColor: todayClass ? \'#FFFFFF\' : \'rgba(255,255,255,0.05)\''
);
walletCardsStr = walletCardsStr.replace(/<Camera /g, '<QrCode ');

const fullOldBlock = matchWallet[1] + matchNextClass[1];
const fullNewBlock = nextClassStr + '\n        ' + walletCardsStr;

code = code.replace(fullOldBlock, fullNewBlock);
fs.writeFileSync('mobile-app/App.tsx', code);
console.log('Swapped successfully');

