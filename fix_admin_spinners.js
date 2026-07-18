const fs = require('fs');
let content = fs.readFileSync('admin-web/src/pages/UsersPage.tsx', 'utf8');

// 1. Import Loader2
if (!content.includes('Loader2')) {
  content = content.replace(
    "import { Search, Users, UserPlus, ChevronDown, Activity, Settings, Check, Clock } from 'lucide-react';",
    "import { Search, Users, UserPlus, ChevronDown, Activity, Settings, Check, Clock, Loader2 } from 'lucide-react';"
  );
}

// 2. Add approvingEvents state
if (!content.includes('approvingEvents')) {
  content = content.replace(
    "const [approvingIds, setApprovingIds] = useState<string[]>([]);",
    "const [approvingIds, setApprovingIds] = useState<string[]>([]);\n  const [approvingEvents, setApprovingEvents] = useState<number[]>([]);"
  );
}

// 3. Update approvingIds UI
content = content.replace(
  "{approvingIds.includes(req.childId) ? 'Zatwierdzanie...' : <><Check size={16} /> Zatwierdź</>}",
  "{approvingIds.includes(req.childId) ? <><Loader2 className=\"animate-spin\" size={16} /> Zatwierdzanie...</> : <><Check size={16} /> Zatwierdź</>}"
);

// 4. Update approveEvent function
const oldApproveEvent = `  const approveEvent = async (sheetRow: number, status: string) => {
    try {
      await fetch('http://localhost:3000/api/events/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetRow, status })
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };`;

const newApproveEvent = `  const approveEvent = async (sheetRow: number, status: string) => {
    try {
      setApprovingEvents(prev => [...prev, sheetRow]);
      await fetch('http://localhost:3000/api/events/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetRow, status })
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingEvents(prev => prev.filter(id => id !== sheetRow));
    }
  };`;

content = content.replace(oldApproveEvent, newApproveEvent);

// 5. Update Zatwierdź Zapis button
const oldButton = `<button 
                        onClick={() => approveEvent(b.sheetRow, 'Zatwierdzony')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                      >
                        <Check size={16} /> Zatwierdź Zapis
                      </button>`;

const newButton = `<button 
                        onClick={() => approveEvent(b.sheetRow, 'Zatwierdzony')}
                        disabled={approvingEvents.includes(b.sheetRow)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approvingEvents.includes(b.sheetRow) ? <><Loader2 className="animate-spin" size={16} /> Zatwierdzanie...</> : <><Check size={16} /> Zatwierdź Zapis</>}
                      </button>`;

content = content.replace(oldButton, newButton);

fs.writeFileSync('admin-web/src/pages/UsersPage.tsx', content, 'utf8');
console.log('Admin-web UI updated for spinners');
