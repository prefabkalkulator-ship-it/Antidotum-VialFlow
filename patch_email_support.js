const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('mobile-app/App.tsx', 'utf8');
appCode = appCode.replace(
  "&groupName=${userData.groupName || ''}",
  "&groupName=${userData.groupName || ''}&email=${userData.email || ''}"
);
fs.writeFileSync('mobile-app/App.tsx', appCode);

// Patch sheetsApi.ts
let apiCode = fs.readFileSync('backend/src/sheetsApi.ts', 'utf8');
apiCode = apiCode.replace(
  "export const getNotificationsForUser = async (groupId: string, groupName: string = '') => {",
  "export const getNotificationsForUser = async (groupId: string, groupName: string = '', email: string = '') => {"
);
apiCode = apiCode.replace(
  "const hasGroup = n.targetGroups.some((g: string) => g.toLowerCase() === groupId.toLowerCase() || (groupName && g.toLowerCase() === groupName.toLowerCase()));",
  "const hasGroup = n.targetGroups.some((g: string) => g.toLowerCase() === groupId.toLowerCase() || (groupName && g.toLowerCase() === groupName.toLowerCase()) || (email && g.toLowerCase() === email.toLowerCase()));"
);
fs.writeFileSync('backend/src/sheetsApi.ts', apiCode);

// Patch index.ts
let indexCode = fs.readFileSync('backend/src/index.ts', 'utf8');
indexCode = indexCode.replace(
  "const { groupId, groupName } = req.query;",
  "const { groupId, groupName, email } = req.query;"
);
indexCode = indexCode.replace(
  "const notifications = await getNotificationsForUser(groupId as string, groupName as string);",
  "const notifications = await getNotificationsForUser(groupId as string, groupName as string, email as string);"
);
fs.writeFileSync('backend/src/index.ts', indexCode);

console.log("Patched email support!");
