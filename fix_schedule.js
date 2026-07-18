const fs = require('fs');

// 1. Fix getSchedule in backend
let sheetsTs = fs.readFileSync('backend/src/sheetsApi.ts', 'utf8');

const oldScheduleCode = `    const schedule = rows.slice(1).map((row: any[]) => ({
      id: row[0] || '',
      groupId: row[1] || '',
      title: \`\${row[1] || 'Zajęcia'}\`, // Tytuł to nazwa grupy, ponieważ pominięto tę kolumnę
      dayOfWeek: parseInt(row[2] || '1', 10),
      startTime: row[3] || '',
      endTime: row[4] || '',
      room: row[5] || '',
      instructor: row[6] || ''
    }));`;

const newScheduleCode = `    const schedule: any[] = [];
    rows.slice(1).forEach((row: any[]) => {
      const daysStr = String(row[2] || '1');
      const days = daysStr.split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
      
      days.forEach((day: number) => {
        schedule.push({
          id: row[0] || '',
          groupId: row[1] || '',
          title: \`\${row[1] || 'Zajęcia'}\`,
          dayOfWeek: day,
          startTime: row[3] || '',
          endTime: row[4] || '',
          room: row[5] || '',
          instructor: row[6] || ''
        });
      });
    });`;

if (sheetsTs.includes(oldScheduleCode)) {
  sheetsTs = sheetsTs.replace(oldScheduleCode, newScheduleCode);
  fs.writeFileSync('backend/src/sheetsApi.ts', sheetsTs, 'utf8');
  console.log('backend/src/sheetsApi.ts updated');
}

// 2. Fix UI in mobile-app/App.tsx
let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "<Text style={styles.classMetaText}>{nextClass.startTime} - {nextClass.endTime}</Text>",
  "<Text style={styles.classMetaText}>{nextClass.startTime}{nextClass.endTime ? ' - ' + nextClass.endTime : ''}</Text>"
);

appTsx = appTsx.replace(
  "<Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 5 }}>{s.startTime} - {s.endTime}</Text>",
  "<Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 5 }}>{s.startTime}{s.endTime ? ' - ' + s.endTime : ''}</Text>"
);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('mobile-app/App.tsx updated');
