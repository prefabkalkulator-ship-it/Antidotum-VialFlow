const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const endpointsToAdd = `

app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getGroups();
    res.json(groups);
  } catch (err) {
    console.error('Błąd pobierania grup:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsersAndParents();
    res.json(users);
  } catch (err) {
    console.error('Błąd pobierania użytkowników:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

`;

// Insert after app.get('/api/health'...)
const insertionPoint = code.indexOf("app.get('/api/health'");
const endOfHealth = code.indexOf("});", insertionPoint) + 3;

code = code.substring(0, endOfHealth) + endpointsToAdd + code.substring(endOfHealth);

fs.writeFileSync('src/index.ts', code);
console.log("Re-added /api/groups and /api/users");
