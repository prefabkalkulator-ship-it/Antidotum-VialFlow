const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const replacements = {
  'Najbli\ufffdsze': 'Najbliøsze',
  'zaj\ufffdcia': 'zajÍcia',
  'Pe\ufffden': 'Pe≥en',
  'OBECNO\ufffdCI': 'OBECNOåCI',
  'POTWIERD\ufffd': 'POTWIERDè',
  'OBECNO\ufffd\ufffd': 'OBECNOå∆',
  'odb\ufffdd\ufffd': 'odbÍdπ',
  'si\ufffd': 'siÍ',
  'przysz\ufffdo\ufffd\ufffd': 'przysz≥oúÊ',
  'p\ufffd\ufffdniej': 'pÛüniej',
  'wy\ufffdwietl': 'wyúwietl',
  'Zaj\ufffdcia': 'ZajÍcia',
  'Szczeg\ufffd\ufffdy': 'SzczegÛ≥y',
  'Poka\ufffd': 'Pokaø',
  'wi\ufffdcej': 'wiÍcej',
  'Zap\ufffda\ufffd': 'Zap≥aÊ',
  'Wprowad\ufffd': 'Wprowadü',
  'wiadomo\ufffd\ufffd': 'wiadomoúÊ',
  'Wy\ufffdlij': 'Wyúlij',
  'Naci\ufffdnij': 'Naciúnij',
  'm\ufffdwi\ufffd': 'mÛwiÊ'
};

for (const [bad, good] of Object.entries(replacements)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync('App.tsx', content);
console.log('Encoding fixed.');
