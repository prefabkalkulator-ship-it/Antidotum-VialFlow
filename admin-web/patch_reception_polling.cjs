
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/pages/ReceptionTablet.tsx");
let content = fs.readFileSync(file, "utf8");

const oldSimulate = `  // Symulacja nadejœcia sygna³u z WebSocketu / Backendu o pomyœlnym skanowaniu przez telefon ucznia
  // W prawdziwym œrodowisku nas³uchujemy na Server-Sent Events lub WebSocket.
  const simulateIncomingScan = () => {
    setLastScannedChild(\x27Zosia Kowalska\x27);
    setTimeout(() => setLastScannedChild(null), 3000);
  };`;

const newPolling = `  // Short polling z backendu
  useEffect(() => {
    const pollCheckins = async () => {
      try {
        const res = await fetch(\x27https://vialflow-backend-392406857647.europe-central2.run.app/api/tablet/recent-checkins?terminalId=REC-MAIN-1\x27);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setLastScannedChild(data[0].childName || "Uczeñ");
            setTimeout(() => setLastScannedChild(null), 3000);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollCheckins, 2000);
    return () => clearInterval(interval);
  }, []);

  // Usuwamy onClick={simulateIncomingScan} ze struktur
`;

if (content.includes("const simulateIncomingScan = () => {")) {
  content = content.replace(oldSimulate, newPolling);
  content = content.replace(" onClick={simulateIncomingScan}", "");
  fs.writeFileSync(file, content);
  console.log("ReceptionTablet patched for real-time polling!");
}

