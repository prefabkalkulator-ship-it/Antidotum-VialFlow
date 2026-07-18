const fs = require('fs');

// 1. Fix mobile-app/App.tsx
let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// Add keyboardShouldPersistTaps="handled" to the ScrollView in the Login screen
appTsx = appTsx.replace(
  '<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: \'center\', padding: 30 }}>',
  '<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: \'center\', padding: 30 }}>'
);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated');

// 2. Fix backend/src/index.ts Nodemailer config
let indexTs = fs.readFileSync('backend/src/index.ts', 'utf8');

const oldNodemailer = `      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER || 'antidotum.vialflow@gmail.com',
          pass: process.env.GMAIL_PASS || 'lqcv krch aucy drgn'
        }
      });`;

const newNodemailer = `      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER || 'antidotum.vialflow@gmail.com',
          pass: process.env.GMAIL_PASS || 'lqcv krch aucy drgn'
        }
      });`;

indexTs = indexTs.replace(oldNodemailer, newNodemailer);
fs.writeFileSync('backend/src/index.ts', indexTs, 'utf8');
console.log('index.ts updated');
