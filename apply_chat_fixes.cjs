
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Chat fix: Add a ref to ScrollView
if (!content.includes("const chatScrollRef = useRef")) {
  content = content.replace(
    "const recognitionRef = useRef<any>(null);",
    "const recognitionRef = useRef<any>(null);\n  const chatScrollRef = useRef<any>(null);"
  );
  
  content = content.replace(
    "<ScrollView style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps=\"handled\">",
    "<ScrollView ref={chatScrollRef} style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps=\"handled\" onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({animated: true})}>"
  );
}

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Chat scroll fixed.");

