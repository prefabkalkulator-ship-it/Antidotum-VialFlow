const fs = require('fs');

let code = fs.readFileSync('src/index.ts', 'utf8');

const oldPublicRoutes = `  const publicRoutes = [
    '/api/auth/login',
    '/api/register',
    '/api/users/add',
    '/api/users/recover-pin',
    '/api/health',
    '/api/auth/device-pair-token',
    '/api/auth/pair-device',
    '/api/push/mock',
    '/api/tablet/recent-checkins',
    '/api/checkin'
  ];`;

const newPublicRoutes = `  const publicRoutes = [
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

code = code.replace(oldPublicRoutes, newPublicRoutes);

fs.writeFileSync('src/index.ts', code);
console.log("publicRoutes updated!");
