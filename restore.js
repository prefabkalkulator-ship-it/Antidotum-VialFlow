const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

const target = \      if (data.success) {
        setCheckedInMap(prev => ({...prev, [childId]: true}));
      } else {
    const today = now.getDay() === 0 ? 7 : now.getDay();\;

const replacement = \      if (data.success) {
        setCheckedInMap(prev => ({...prev, [childId]: true}));
      } else {
        alert(data.error || 'B³¹d skanowania');
      }
    } catch {
      alert('B³¹d po³¹czenia z serwerem');
    }
    setScanningMap(prev => ({...prev, [childId]: false}));
  };

  const normalizeGroup = (g) => String(g).toLowerCase().replace(/\\\\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const hasClassToday = (groupId) => {
    if (!groupId || !schedule.length) return null;
    const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
    const normalizedQuery = normalizeGroup(groupId);
    return schedule.find((s) => normalizeGroup(s.groupId) === normalizedQuery && s.dayOfWeek === today) || null;
  };

  const getNextClass = () => {
    if (!schedule || !schedule.length) return null;
    const now = new Date();
    const today = now.getDay() === 0 ? 7 : now.getDay();\;

code = code.replace(target, replacement);
fs.writeFileSync('mobile-app/App.tsx', code);
console.log('Restored correctly!');

