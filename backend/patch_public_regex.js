const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const regex = /const publicRoutes = \[[^\]]+\];/g;
const replacement = `const publicRoutes = [
    '/api/auth/login',
    '/api/register',
    '/api/users/add',
    '/api/users/recover-pin',
    '/api/health',
    '/api/auth/device-pair-token',
    '/api/auth/pair-device',
    '/api/push/mock',
    '/api/tablet/recent-checkins',
    '/api/checkin',
    '/api/groups',
    '/api/users'
  ];`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/index.ts', code);
console.log("publicRoutes updated via regex!");
