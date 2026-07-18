const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const replacements = {
  'Najbli\ufffdsze': 'Najbli\u017csze',
  'zaj\ufffdcia': 'zaj\u0119cia',
  'Pe\ufffden': 'Pe\u0142en',
  'OBECNO\ufffdCI': 'OBECNO\u015aCI',
  'POTWIERD\ufffd': 'POTWIERD\u0179',
  'OBECNO\ufffd\ufffd': 'OBECNO\u015a\u0106',
  'odb\ufffdd\ufffd': 'odb\u0119d\u0105',
  'si\ufffd': 'si\u0119',
  'przysz\ufffdo\ufffd\ufffd': 'przysz\u0142o\u015b\u0107',
  'p\ufffd\ufffdniej': 'p\u00f3\u017aniej',
  'wy\ufffdwietl': 'wy\u015bwietl',
  'Zaj\ufffdcia': 'Zaj\u0119cia',
  'Szczeg\ufffd\ufffdy': 'Szczeg\u00f3\u0142y',
  'Poka\ufffd': 'Poka\u017c',
  'wi\ufffdcej': 'wi\u0119cej',
  'Zap\ufffda\ufffd': 'Zap\u0142a\u0107',
  'Wprowad\ufffd': 'Wprowad\u017a',
  'wiadomo\ufffd\ufffd': 'wiadomo\u015b\u0107',
  'Wy\ufffdlij': 'Wy\u015blij',
  'Naci\ufffdnij': 'Naci\u015bnij',
  'm\ufffdwi\ufffd': 'm\u00f3wi\u0107'
};

for (const [bad, good] of Object.entries(replacements)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync('App.tsx', content);
console.log('Encoding fixed.');
