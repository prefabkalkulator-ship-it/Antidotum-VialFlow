const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

const oldUseEffect = `  const groupId = childrenList[0]?.groupId;

  useEffect(() => {
    if (groupId) {
      apiFetch(\`https://vialflow-backend-392406857647.europe-central2.run.app/api/schedule?groupId=\${groupId}\`)
        .then(res => res.json())
        .then(data => setSchedule(data))
        .catch(err => console.error(err));
    }

    Promise.all([
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings').then(res => res.json()),
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events').then(res => res.json())
    ])
    .then(([bookings, eventsData]) => {
      if (Array.isArray(eventsData)) {
        setEventsList(eventsData);
      }
      if (Array.isArray(bookings)) {
        const childIds = childrenList.map((c: any) => c.id);
        const approved = bookings.filter(b => 
          childIds.includes(b.childId) && 
          b.status === 'Zatwierdzony' && 
          b.paymentStatus === 'Opłacone'
        );
        setUpcomingEvents(approved);
      }
    })
    .catch(err => console.error(err));
  }, [groupId]);`;

const newUseEffect = `  const groupIdsDep = childrenList.map((c: any) => c.groupId).filter(Boolean).join(',');

  useEffect(() => {
    const uniqueGroupIds = Array.from(new Set(childrenList.map((c: any) => c.groupId).filter(Boolean)));
    if (uniqueGroupIds.length > 0) {
      Promise.all(uniqueGroupIds.map((gId: string) => 
        apiFetch(\`https://vialflow-backend-392406857647.europe-central2.run.app/api/schedule?groupId=\${gId}\`).then(res => res.json())
      ))
      .then(results => {
        const merged = results.flat();
        const uniqueSchedule = Array.from(new Map(merged.map((item: any) => [item.id + '-' + item.dayOfWeek, item])).values());
        setSchedule(uniqueSchedule);
      })
      .catch(err => console.error(err));
    }

    Promise.all([
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings').then(res => res.json()),
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events').then(res => res.json())
    ])
    .then(([bookings, eventsData]) => {
      if (Array.isArray(eventsData)) {
        setEventsList(eventsData);
      }
      if (Array.isArray(bookings)) {
        const childIds = childrenList.map((c: any) => c.id);
        const approved = bookings.filter(b => 
          childIds.includes(b.childId) && 
          b.status === 'Zatwierdzony' && 
          b.paymentStatus === 'Opłacone'
        );
        setUpcomingEvents(approved);
      }
    })
    .catch(err => console.error(err));
  }, [groupIdsDep]);`;

appTsx = appTsx.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for multiple children schedules');
