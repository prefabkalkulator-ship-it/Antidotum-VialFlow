
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "App.tsx");
let content = fs.readFileSync(file, "utf8");

// Import QRScannerModal
if (!content.includes("import QRScannerModal")) {
  content = content.replace("import InstallPrompt from \x27./components/InstallPrompt\x27;", "import InstallPrompt from \x27./components/InstallPrompt\x27;\nimport QRScannerModal from \x27./components/QRScannerModal\x27;");
}

// Add state to WalletScreen
if (!content.includes("const [showScanner, setShowScanner] = useState(false)")) {
  content = content.replace("const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);", "const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);\n  const [showScanner, setShowScanner] = useState(false);\n  const [activeChildIdForScan, setActiveChildIdForScan] = useState<string | null>(null);");
}

// Modify handleScan to handle actual scanned text
const oldHandleScan = `const handleScan = async (childId: string) => {
    setScanningMap(prev => ({...prev, [childId]: true}));
    try {
      const res = await apiFetch(\x27https://vialflow-backend-392406857647.europe-central2.run.app/api/checkin\x27, {
        method: \x27POST\x27,
        headers: { \x27Content-Type\x27: \x27application/json\x27 },
        body: JSON.stringify({
          qrData: JSON.stringify({ childId, type: \x27check-in\x27, timestamp: Date.now() })
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckedInMap(prev => ({...prev, [childId]: true}));
      } else {
        alert(data.error || \x27B³¹d skanowania\x27);
      }
    } catch (err) {
      alert(\x27B³¹d po³¹czenia z serwerem\x27);
    }
    setScanningMap(prev => ({...prev, [childId]: false}));
  };`;

const newHandleScan = `const handleScanClick = (childId: string) => {
    setActiveChildIdForScan(childId);
    setShowScanner(true);
  };

  const handleQRScanResult = async (decodedText: string) => {
    const childId = activeChildIdForScan;
    if (!childId) return;
    
    setScanningMap(prev => ({...prev, [childId]: true}));
    try {
      // Decode QR from tablet
      let tabletData;
      try {
        tabletData = JSON.parse(decodedText);
      } catch (e) {
        throw new Error("Nieprawid³owy kod QR");
      }

      const res = await apiFetch(\x27https://vialflow-backend-392406857647.europe-central2.run.app/api/checkin\x27, {
        method: \x27POST\x27,
        headers: { \x27Content-Type\x27: \x27application/json\x27 },
        body: JSON.stringify({
          qrData: JSON.stringify({ 
            childId, 
            terminalId: tabletData.terminalId,
            timestamp: tabletData.timestamp,
            action: \x27check-in\x27
          })
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckedInMap(prev => ({...prev, [childId]: true}));
      } else {
        alert(data.error || \x27B³¹d skanowania\x27);
      }
    } catch (err: any) {
      alert(err.message || \x27B³¹d po³¹czenia z serwerem\x27);
    }
    setScanningMap(prev => ({...prev, [childId]: false}));
  };`;

if (content.includes("const handleScan = async (childId: string) => {")) {
  content = content.replace(oldHandleScan, newHandleScan);
}

// Update the button press
content = content.replace(/onPress=\{.*?handleScan\(c\.id\).*?\}/g, "onPress={() => handleScanClick(c.id)}");

// Inject the Modal component at the end of ScrollView
if (!content.includes("<QRScannerModal")) {
  content = content.replace("</ScrollView>\n  );\n}", "  <QRScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScan={handleQRScanResult} />\n    </ScrollView>\n  );\n}");
}

fs.writeFileSync(file, content);
console.log("App.tsx patched for QR scanner!");

