const { getHomeworkTasks } = require('./src/sheetsApi');

async function main() {
  console.log('Testing getHomeworkTasks for group KIDS TEAM 2026-27...');
  const tasksGroup = await getHomeworkTasks('', 'KIDS TEAM 2026-27');
  console.log('Group tasks found:', tasksGroup);

  console.log('\nTesting getHomeworkTasks for group SENIOR MASTER 2026-27...');
  const tasksGroup2 = await getHomeworkTasks('', 'SENIOR MASTER 2026-27');
  console.log('Group tasks found:', tasksGroup2);
}

main().catch(console.error);
