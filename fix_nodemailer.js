const fs = require('fs');

let indexTs = fs.readFileSync('backend/src/index.ts', 'utf8');

// Insert import nodemailer from 'nodemailer'; if it doesn't exist
if (!indexTs.includes('import nodemailer')) {
  indexTs = indexTs.replace("import express from 'express';", "import express from 'express';\nimport nodemailer from 'nodemailer';");
  fs.writeFileSync('backend/src/index.ts', indexTs, 'utf8');
  console.log('Nodemailer imported in index.ts');
} else {
  console.log('Nodemailer already imported');
}
