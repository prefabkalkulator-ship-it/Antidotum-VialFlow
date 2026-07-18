const fs = require('fs');

const correctCode = `import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import multer from 'multer';
import { runEventOrchestration, rewriteEventDocumentWithComment, readEventDocument } from './orchestrator';
import { initCronJobs, runPassGenerationJob, runPassRemindersJob } from './cron';
import { processVideo } from './videoPipeline';
import { ingestKnowledge, chatWithRAG } from './rag';
import { getPaymentHistory, addPaymentTransaction, getStudentPasses, getAllPasses, generateStudentPass, payStudentPass, getGroups, getUsersAndParents, addStudent, deleteStudent, updateStudentFullData, approveStudent, getTeamRoles, getSchedule, addAttendance, getEvents, bookEvent, getEventBookings, approveEventBooking, payEventBooking, saveEventQuestion, getPendingEventQuestions, markEventQuestionAsAnswered, updateUserProfile, setParentDeviceToken, removeDeviceToken, updateUserPin } from './sheetsApi';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from './middleware';
import { logConsentToWORM, deleteEphemeralVideo } from './audit';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve PWA static files
app.use(express.static(path.join(__dirname, '../public')));

// Global JWT Middleware
app.use((req, res, next) => {
  const publicRoutes = [
    '/api/auth/login',
    '/api/register',
    '/api/users/add',
    '/api/users/recover-pin',
    '/api/health',
    '/api/auth/device-pair-token',
    '/api/auth/pair-device',
    '/api/push/mock'
  ];
  
  if (!req.path.startsWith('/api/') || publicRoutes.includes(req.path) || req.path.startsWith('/api/drive/webhook') || req.path.startsWith('/api/debug/cron')) {
    return next();
  }
  
  authenticateJWT(req, res, next);
});`;

let indexTs = fs.readFileSync('backend/src/index.ts', 'utf8');

// Find the line that starts with '});' which closes the middleware
const middlewareCloseIdx = indexTs.indexOf('authenticateJWT(req, res, next);\n});') + 'authenticateJWT(req, res, next);\n});'.length;

const restOfFile = indexTs.substring(middlewareCloseIdx);

// Append the catch-all
const catchAll = `\n\n// Catch-all for PWA navigation
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});\n`;

fs.writeFileSync('backend/src/index.ts', correctCode + catchAll + restOfFile, 'utf8');
console.log('Restored backend/src/index.ts completely');
