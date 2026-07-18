const fs = require('fs');
let c = fs.readFileSync('src/pages/UsersPage.tsx', 'utf8');

c = c.replace(
  "const [editForm, setEditForm] = useState<Student | null>(null);",
  "const [editForm, setEditForm] = useState<Student | null>(null);\n  const [approvingIds, setApprovingIds] = useState<string[]>([]);"
);

c = c.replace(
  "  const approveRegistration = async (childId: string, groupId: string) => {\n    if (!groupId) {\n      alert('Wybierz grupę docelową przed zatwierdzeniem.');\n      return;\n    }\n    try {\n      const res = await fetch(`http://localhost:3000/api/users/${childId}/approve`, {\n        method: 'PUT',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ groupId })\n      });\n      if (!res.ok) throw new Error('Błąd serwera');\n      fetchUsers();\n    } catch (err) {\n      console.error(err);\n      alert('Błąd zatwierdzania.');\n    }\n  };",
  "  const approveRegistration = async (childId: string, groupId: string) => {\n    if (!groupId) {\n      alert('Wybierz grupę docelową przed zatwierdzeniem.');\n      return;\n    }\n    setApprovingIds(prev => [...prev, childId]);\n    try {\n      const res = await fetch(`http://localhost:3000/api/users/${childId}/approve`, {\n        method: 'PUT',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ groupId })\n      });\n      if (!res.ok) throw new Error('Błąd serwera');\n      await fetchUsers();\n    } catch (err) {\n      console.error(err);\n      alert('Błąd zatwierdzania.');\n    } finally {\n      setApprovingIds(prev => prev.filter(id => id !== childId));\n    }\n  };"
);

c = c.replace(
  /<button \n\s*onClick=\{\(\) => \{\n\s*const sel = document\.getElementById\(`select-group-\$\{req\.childId\}`\) as HTMLSelectElement;\n\s*approveRegistration\(req\.childId, sel\.value\);\n\s*\}\}\n\s*className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"\n\s*>/g,
  `<button 
                    onClick={() => {
                      const sel = document.getElementById(\`select-group-\${req.childId}\`) as HTMLSelectElement;
                      approveRegistration(req.childId, sel.value);
                    }}
                    disabled={approvingIds.includes(req.childId)}
                    className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >`
);

c = c.replace(
  "<Check size={16} /> Zatwierdź\n                  </button>",
  "{approvingIds.includes(req.childId) ? 'Zatwierdzanie...' : <><Check size={16} /> Zatwierdź</>}\n                  </button>"
);

fs.writeFileSync('src/pages/UsersPage.tsx', c, 'utf8');
console.log('UsersPage.tsx updated.');
