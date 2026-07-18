
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Fix BackHandler for both Native and Web
content = content.replace(
  "const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);",
  "const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);\n      if (Platform.OS === 'web') {\n        window.history.pushState({ tab: activeTab }, '');\n        const handlePopState = () => {\n          if (activeTab !== 'wallet') { setActiveTab('wallet'); window.history.pushState({ tab: 'wallet' }, ''); }\n        };\n        window.addEventListener('popstate', handlePopState);\n        return () => {\n          backHandler.remove();\n          window.removeEventListener('popstate', handlePopState);\n        };\n      }"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("BackHandler fixed.");

