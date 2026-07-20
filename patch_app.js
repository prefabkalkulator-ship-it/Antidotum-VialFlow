const fs = require('fs');

let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

const hookCode = `
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  const fetchAnnouncements = async () => {
    if (!user) return;
    try {
      const res = await fetch(\`\${BACKEND_URL}/api/notifications?groupId=\${user.groupId || ''}\`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Parse date for nice display
        const formatted = data.map(item => {
          let dateStr = item.date;
          try {
            const d = new Date(item.date);
            dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch(e) {}
          return { ...item, date: dateStr };
        });
        setAnnouncements(formatted);
      }
    } catch (error) {
      console.log('Error fetching announcements:', error);
    }
  };

  useEffect(() => {
    if (viewMode === 'timeline') {
      fetchAnnouncements();
    }
  }, [viewMode, user]);
`;

code = code.replace(
  "const announcements: any[] = [];",
  hookCode
);

fs.writeFileSync('mobile-app/App.tsx', code);
console.log("Patched App.tsx successfully!");
