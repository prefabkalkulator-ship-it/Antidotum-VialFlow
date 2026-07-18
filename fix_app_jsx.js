const fs = require('fs');
let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// The file ends with:
//       </View>
//     </SafeAreaView>
//   );
// }

// Replace the end of the file using a regex that handles whitespace/newlines
appTsx = appTsx.replace(/<\/View>\s*<\/SafeAreaView>\s*\);\s*\}/, '</View>\n      )}\n    </SafeAreaView>\n  );\n}');

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx JSX fixed');
