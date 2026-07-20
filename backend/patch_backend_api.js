const fs = require('fs');

// Patch sheetsApi.ts
let apiCode = fs.readFileSync('src/sheetsApi.ts', 'utf8');
apiCode = apiCode.replace(
  "export const getNotificationsForUser = async (groupId: string) => {",
  "export const getNotificationsForUser = async (groupId: string, groupName: string = '') => {"
);
apiCode = apiCode.replace(
  "const hasGroup = n.targetGroups.includes(groupId);",
  "const hasGroup = n.targetGroups.some((g: string) => g.toLowerCase() === groupId.toLowerCase() || (groupName && g.toLowerCase() === groupName.toLowerCase()));"
);
fs.writeFileSync('src/sheetsApi.ts', apiCode);

// Patch index.ts
let indexCode = fs.readFileSync('src/index.ts', 'utf8');
indexCode = indexCode.replace(
  "const { groupId } = req.query;",
  "const { groupId, groupName } = req.query;"
);
indexCode = indexCode.replace(
  "const notifications = await getNotificationsForUser(groupId as string);",
  "const notifications = await getNotificationsForUser(groupId as string, groupName as string);"
);
fs.writeFileSync('src/index.ts', indexCode);

console.log("Patched backend for groupName and case insensitivity!");
