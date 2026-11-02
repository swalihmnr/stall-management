import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const STORE_FILE = path.join(DATA_DIR, 'cloud_store.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// Initial cloud store state
let cloudStore = {
  sales: {},
  expenses: {},
  stock: {},
  settings: {
    backupEmail: process.env.BACKUP_EMAIL || '',
    backupEmailEnabled: true,
    lastBackupTime: null,
    lastBackupStatus: 'idle',
  },
  backupHistory: [],
};

// Load existing store if present
if (fs.existsSync(STORE_FILE)) {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    cloudStore = { ...cloudStore, ...JSON.parse(raw) };
  } catch (err) {
    console.error('[CloudStore] Error reading store file:', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(cloudStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[CloudStore] Error saving store file:', err);
  }
}

const app = express();

// ── Security: CORS — restrict to known origin ────────────────────────────────
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl in dev, server-to-server)
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10mb' }));

// ── Security: Auth middleware — shared secret token ──────────────────────────
const API_SECRET = process.env.API_SECRET;

function requireSecret(req, res, next) {
  if (!API_SECRET) {
    console.warn('[Security] WARNING: API_SECRET not set in server/.env — all requests allowed. Set it in production!');
    return next();
  }
  const token = req.headers['x-api-secret'];
  if (!token || token !== API_SECRET) {
    console.warn(`[Security] Rejected unauthorized request from ${req.ip} to ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized: invalid or missing API secret' });
  }
  next();
}

// ── Security: Rate limiting ──────────────────────────────────────────────────
const syncLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sync requests, please slow down.' },
});

const backupLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many backup requests. Please wait.' },
});

const settingsLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many settings requests.' },
});

// ── 1. Cloud Sync Endpoint ──────────────────────────────────────────────────
app.post('/api/sync', syncLimiter, requireSecret, (req, res) => {
  try {
    const { sales = [], expenses = [], stock = [], queue = [] } = req.body;

    // Input validation: prevent record flooding
    const MAX_RECORDS = 10000;
    if (sales.length > MAX_RECORDS || expenses.length > MAX_RECORDS || stock.length > MAX_RECORDS) {
      return res.status(400).json({ error: 'Payload record count exceeds allowed limit' });
    }

    // Safe ID pattern: 5-80 characters, alphanumeric + underscore + hyphen
    const isSafeId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{5,80}$/.test(id);

    // Upsert sales idempotently by ID
    for (const s of sales) {
      if (s && isSafeId(s.id)) cloudStore.sales[s.id] = s;
    }

    // Upsert expenses idempotently by ID
    for (const e of expenses) {
      if (e && isSafeId(e.id)) cloudStore.expenses[e.id] = e;
    }

    // Upsert stock by date & ID
    for (const st of stock) {
      if (st && (st.id || st.date)) {
        const key = String(st.id || st.date);
        if (isSafeId(key) || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(key)) {
          cloudStore.stock[key] = st;
        }
      }
    }

    // Process deletions in queue
    for (const q of queue) {
      if (q.action === 'delete' && isSafeId(q.recordId)) {
        if (q.entityType === 'sale') delete cloudStore.sales[q.recordId];
        if (q.entityType === 'expense') delete cloudStore.expenses[q.recordId];
        if (q.entityType === 'stock') delete cloudStore.stock[q.recordId];
      }
    }

    saveStore();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        sales: Object.keys(cloudStore.sales).length,
        expenses: Object.keys(cloudStore.expenses).length,
        stock: Object.keys(cloudStore.stock).length,
      },
    });
  } catch (error) {
    console.error('[Sync] Error processing sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── 2. Settings Endpoints ────────────────────────────────────────────────────
app.get('/api/backup/email-settings', settingsLimiter, requireSecret, (req, res) => {
  res.json({
    email: cloudStore.settings.backupEmail,
    enabled: cloudStore.settings.backupEmailEnabled,
    lastBackupTime: cloudStore.settings.lastBackupTime,
    lastBackupStatus: cloudStore.settings.lastBackupStatus,
  });
});

app.post('/api/backup/email-settings', settingsLimiter, requireSecret, (req, res) => {
  const { email, enabled } = req.body;
  if (email !== undefined) cloudStore.settings.backupEmail = String(email).slice(0, 254);
  if (enabled !== undefined) cloudStore.settings.backupEmailEnabled = Boolean(enabled);
  saveStore();
  res.json({ success: true, settings: cloudStore.settings });
});

// ── 3. Backup History ────────────────────────────────────────────────────────
app.get('/api/backup/history', settingsLimiter, requireSecret, (req, res) => {
  res.json({ history: cloudStore.backupHistory.slice(-50).reverse() });
});

// ── 4. Backup Execution Core ─────────────────────────────────────────────────
async function executeBackup(type = 'manual') {
  const todayDate = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const recipient = cloudStore.settings.backupEmail;

  const backupData = {
    appName: 'Chicken Stall Manager',
    version: '2.0.0',
    exportDate: nowIso,
    timezone: 'Asia/Kolkata',
    summary: {
      totalSales: Object.keys(cloudStore.sales).length,
      totalExpenses: Object.keys(cloudStore.expenses).length,
      totalStockDays: Object.keys(cloudStore.stock).length,
    },
    sales: Object.values(cloudStore.sales),
    expenses: Object.values(cloudStore.expenses),
    stock: Object.values(cloudStore.stock),
    settings: cloudStore.settings,
  };

  const backupFilename = `chicken_stall_backup_${todayDate}.json`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFilename);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  // If no recipient configured
  if (!recipient) {
    const historyItem = {
      id: `bk_${Date.now()}`,
      timestamp: nowIso,
      status: 'failed',
      type,
      recipient: 'Not configured',
      recordCount: {
        sales: backupData.sales.length,
        expenses: backupData.expenses.length,
        stock: backupData.stock.length,
      },
      message: 'Backup JSON saved locally, but no recipient email configured.',
    };
    cloudStore.backupHistory.push(historyItem);
    cloudStore.settings.lastBackupTime = nowIso;
    cloudStore.settings.lastBackupStatus = 'failed';
    saveStore();
    return { success: false, message: historyItem.message, file: backupFilename };
  }

  // Attempt Email Delivery via Nodemailer
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"Chicken Stall Backup" <${smtpUser}>`,
        to: recipient,
        subject: `🐔 Daily Business Backup - Chicken Stall (${todayDate})`,
        text: `Hello,\n\nAttached is your automated business data backup for ${todayDate}.\n\nTotal Sales: ${backupData.sales.length}\nTotal Expenses: ${backupData.expenses.length}\nStock Days: ${backupData.stock.length}\n\nGenerated at: ${nowIso} (Asia/Kolkata)\n\nChicken Stall Manager`,
        attachments: [
          {
            filename: backupFilename,
            content: JSON.stringify(backupData, null, 2),
            contentType: 'application/json',
          },
        ],
      });

      const historyItem = {
        id: `bk_${Date.now()}`,
        timestamp: nowIso,
        status: 'success',
        type,
        recipient,
        recordCount: {
          sales: backupData.sales.length,
          expenses: backupData.expenses.length,
          stock: backupData.stock.length,
        },
        message: `Backup emailed to ${recipient} successfully.`,
      };
      cloudStore.backupHistory.push(historyItem);
      cloudStore.settings.lastBackupTime = nowIso;
      cloudStore.settings.lastBackupStatus = 'success';
      saveStore();
      return { success: true, message: historyItem.message, file: backupFilename };
    } catch (mailError) {
      console.error('[Backup] Email sending failed:', mailError);
      const historyItem = {
        id: `bk_${Date.now()}`,
        timestamp: nowIso,
        status: 'failed',
        type,
        recipient,
        recordCount: {
          sales: backupData.sales.length,
          expenses: backupData.expenses.length,
          stock: backupData.stock.length,
        },
        message: `Email sending error: ${mailError.message}. JSON archive saved on server.`,
      };
      cloudStore.backupHistory.push(historyItem);
      cloudStore.settings.lastBackupTime = nowIso;
      cloudStore.settings.lastBackupStatus = 'failed';
      saveStore();
      return { success: false, message: historyItem.message, file: backupFilename };
    }
  } else {
    // Graceful fallback when SMTP credentials are not yet configured in .env
    const historyItem = {
      id: `bk_${Date.now()}`,
      timestamp: nowIso,
      status: 'success',
      type,
      recipient,
      recordCount: {
        sales: backupData.sales.length,
        expenses: backupData.expenses.length,
        stock: backupData.stock.length,
      },
      message: `Complete JSON archive (${backupFilename}) generated and saved on server. Configure SMTP in server/.env to dispatch live emails.`,
    };
    cloudStore.backupHistory.push(historyItem);
    cloudStore.settings.lastBackupTime = nowIso;
    cloudStore.settings.lastBackupStatus = 'success';
    saveStore();
    return { success: true, message: historyItem.message, file: backupFilename };
  }
}

// ── 5. Manual Backup Now Route ──────────────────────────────────────────────
app.post('/api/backup/trigger', backupLimiter, requireSecret, async (req, res) => {
  try {
    const result = await executeBackup('manual');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 6. Scheduled Daily Backup at 9:00 PM Asia/Kolkata ───────────────────────
// Cron format: minute hour day-of-month month day-of-week
// '0 21 * * *' = 21:00 (9:00 PM) every day
cron.schedule(
  '0 21 * * *',
  async () => {
    console.log('[Scheduler] Executing scheduled daily backup at 9:00 PM Asia/Kolkata...');
    if (cloudStore.settings.backupEmailEnabled && cloudStore.settings.backupEmail) {
      // Prevent duplicate scheduled backups for the exact same date
      const todayDate = new Date().toISOString().split('T')[0];
      const alreadyRun = cloudStore.backupHistory.some(
        (h) => h.type === 'scheduled' && h.timestamp.startsWith(todayDate) && h.status === 'success'
      );
      if (alreadyRun) {
        console.log('[Scheduler] Scheduled backup already completed for today. Skipping.');
        return;
      }
      await executeBackup('scheduled');
    } else {
      console.log('[Scheduler] Automated backup skipped: email backup not enabled or email not set.');
    }
  },
  {
    timezone: 'Asia/Kolkata',
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Chicken Stall Server] Running on http://localhost:${PORT}`);
  console.log(`[Chicken Stall Server] Daily backup scheduled for 9:00 PM (Asia/Kolkata)`);
});
