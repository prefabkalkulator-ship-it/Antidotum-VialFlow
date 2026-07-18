
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src/index.ts");
let content = fs.readFileSync(file, "utf8");

// Truncate at the end of short polling
const marker = "res.json(checkins);\n  });";
const index = content.indexOf(marker);

if (index !== -1) {
  content = content.substring(0, index + marker.length) + `

// --- FAZA 6: AI DANCE COACH (Trener Wideo) ---
app.get(\x27/api/coach/choreographies\x27, (req, res) => {
  res.json([
    { id: \x271\x27, title: \x27Hip-Hop Basic Groove\x27, instructor: \x27Kamil\x27, duration: \x270:45\x27, level: \x27Pocz¹tkuj¹cy\x27 },
    { id: \x272\x27, title: \x27Jazz Pirouette Combo\x27, instructor: \x27Marta\x27, duration: \x271:20\x27, level: \x27Œredniozaawansowany\x27 },
    { id: \x273\x27, title: \x27High Heels Walk\x27, instructor: \x27Sara\x27, duration: \x270:30\x27, level: \x27Pocz¹tkuj¹cy\x27 }
  ]);
});

app.post(\x27/api/coach/analyze\x27, upload.single(\x27video\x27), (req, res) => {
  console.log(\x27[AI Coach] Otrzymano wideo do analizy. Przesy³anie do Vertex AI...\x27);
  // Symulacja ciê¿kiej pracy modelu ML:
  setTimeout(async () => {
    res.json({
      success: true,
      score: 82,
      timingAccuracy: 75,
      postureAccuracy: 90,
      feedback: [
        "Œwietnie trzymasz ramê w pierwszej sekwencji (0:05-0:15)!",
        "Popracuj nad timingiem w przejœciu do parteru (spóŸnienie 0.2s).",
        "Twoje piruety s¹ stabilne, dobra praca stóp."
      ]
    });
  }, 3000);
});

// Zamiast res.sendFile na ka¿d¹ nieznan¹ œcie¿kê (Faza 2, do obs³ugi PWA), serwujemy index.html
app.use((req, res) => {
  if (!req.path.startsWith(\x27/api/\x27)) {
    res.sendFile(require(\x27path\x27).join(__dirname, \x27../public/index.html\x27));
  } else {
    res.status(404).json({ error: \x27Not found\x27 });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(\`[Server] VialFlow API dzia³a na porcie \${PORT}\`);
  // Uruchom cron jobs
  initCronJobs();
});
`;
  fs.writeFileSync(file, content);
  console.log("Restored full file end");
}

