import { getSchedule } from './src/sheetsApi';
(async () => {
  try {
    const s = await getSchedule();
    console.log("SCHEDULE:", s);
  } catch (e) {
    console.error("ERROR:", e);
  }
})();
