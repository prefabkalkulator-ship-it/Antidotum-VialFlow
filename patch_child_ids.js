const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('mobile-app/App.tsx', 'utf8');
appCode = appCode.replace(
  "&groupName=${userData.groupName || ''}&email=${userData.email || ''}&t=${Date.now()}",
  "&groupName=${userData.groupName || ''}&email=${userData.email || ''}&childIds=${(userData.children || []).map((c:any)=>c.id).join(',')}&t=${Date.now()}"
);
fs.writeFileSync('mobile-app/App.tsx', appCode);

// Patch backend/src/index.ts
let indexCode = fs.readFileSync('backend/src/index.ts', 'utf8');
indexCode = indexCode.replace(
  "const { groupId, groupName, email } = req.query;",
  "const { groupId, groupName, email, childIds } = req.query;"
);
indexCode = indexCode.replace(
  "const notifications = await getNotificationsForUser(groupId as string, groupName as string, email as string);",
  "const notifications = await getNotificationsForUser(groupId as string, groupName as string, email as string, childIds as string);"
);
fs.writeFileSync('backend/src/index.ts', indexCode);

// Patch backend/src/sheetsApi.ts
let apiCode = fs.readFileSync('backend/src/sheetsApi.ts', 'utf8');
apiCode = apiCode.replace(
  "export const getNotificationsForUser = async (groupId: string, groupName: string = '', email: string = '') => {",
  "export const getNotificationsForUser = async (groupId: string, groupName: string = '', email: string = '', childIds: string = '') => {"
);
apiCode = apiCode.replace(
  "const hasGroup = n.targetGroups.some((g: string) => g.toLowerCase() === groupId.toLowerCase() || (groupName && g.toLowerCase() === groupName.toLowerCase()) || (email && g.toLowerCase() === email.toLowerCase()));",
  "const childIdsArr = (childIds || '').split(',').filter(Boolean);\n       const hasGroup = n.targetGroups.some((g: string) => g.toLowerCase() === groupId.toLowerCase() || (groupName && g.toLowerCase() === groupName.toLowerCase()) || (email && g.toLowerCase() === email.toLowerCase()) || childIdsArr.some((cid:string) => cid.toLowerCase() === g.toLowerCase()));"
);
fs.writeFileSync('backend/src/sheetsApi.ts', apiCode);

console.log("Patched childIds support!");
