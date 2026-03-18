import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new Database('mafia.db');

// Setup Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    app_id TEXT UNIQUE,
    username TEXT UNIQUE,
    pin_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    code TEXT,
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER,
    friend_id INTEGER,
    PRIMARY KEY(user_id, friend_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
  );
`);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8688318916:AAEzudEVmk1ae01umEYKAxySV89hhIzBMXY';

// Helper: Verify Telegram WebApp initData
function verifyTelegramWebAppData(telegramInitData: string): any {
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash === hash) {
    const userStr = urlParams.get('user');
    return userStr ? JSON.parse(decodeURIComponent(userStr)) : null;
  }
  return null;
}

// Helper: Send Telegram Message
async function sendTelegramMessage(chatId: string, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    return response.ok;
  } catch (e) {
    console.error('Failed to send TG message', e);
    return false;
  }
}

// --- API ROUTES ---

// 0. Manual Registration & Login
app.post('/api/auth/register', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin || pin.length !== 6) {
    return res.status(400).json({ error: 'Username and 6-digit PIN required' });
  }

  try {
    const pin_hash = await bcrypt.hash(pin, 10);
    const insert = db.prepare('INSERT INTO users (username, pin_hash) VALUES (?, ?)');
    const info = insert.run(username, pin_hash);
    const userRecord: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.json({ success: true, user: { id: userRecord.id, username: userRecord.username, hasPin: true } });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login-manual', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });

  try {
    const userRecord: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!userRecord || !userRecord.pin_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(pin, userRecord.pin_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, user: { id: userRecord.id, username: userRecord.username, hasPin: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1. Seamless Auth
app.post('/api/auth/login', async (req, res) => {
  const { initData, pin } = req.body;

  try {
    let userRecord;

    if (initData) {
      // Scenario 1: Telegram Bot
      const tgUser = verifyTelegramWebAppData(initData);
      if (!tgUser) {
        return res.status(401).json({ error: 'Invalid Telegram data' });
      }

      const tgId = tgUser.id.toString();
      const username = tgUser.username || tgUser.first_name;

      userRecord = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(tgId);

      if (!userRecord) {
        // Create new user
        const insert = db.prepare('INSERT INTO users (telegram_id, username) VALUES (?, ?)');
        const info = insert.run(tgId, username);
        userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      } else if (userRecord.username !== username) {
        // Update username if changed
        db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userRecord.id);
        userRecord.username = username;
      }
    } else {
      // Scenario 2: Browser (No initData)
      const { app_id } = req.body;
      if (!app_id) {
        // Create new browser user
        const newAppId = crypto.randomUUID();
        const insert = db.prepare('INSERT INTO users (app_id, username) VALUES (?, ?)');
        const info = insert.run(newAppId, 'Guest_' + newAppId.substring(0, 4));
        userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      } else {
        userRecord = db.prepare('SELECT * FROM users WHERE app_id = ?').get(app_id);
        if (!userRecord) {
           return res.status(404).json({ error: 'App ID not found' });
        }
      }
    }

    // PIN Check
    if (userRecord.pin_hash) {
      if (!pin) {
        return res.json({ requirePin: true, user: { id: userRecord.id, username: userRecord.username, app_id: userRecord.app_id } });
      }
      const isValid = await bcrypt.compare(pin, userRecord.pin_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }

    res.json({ success: true, user: { id: userRecord.id, username: userRecord.username, app_id: userRecord.app_id, hasPin: !!userRecord.pin_hash } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set PIN
app.post('/api/auth/set-pin', async (req, res) => {
  const { userId, pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'Invalid PIN' });

  const hash = await bcrypt.hash(pin, 10);
  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hash, userId);
  res.json({ success: true });
});

// 2. Forgot PIN (Generate OTP & Send via TG)
app.post('/api/auth/forgot-pin', async (req, res) => {
  const { userId } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.telegram_id) return res.status(400).json({ error: 'Cannot recover PIN without linked Telegram account' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

  db.prepare('INSERT INTO otps (user_id, code, expires_at) VALUES (?, ?, ?)').run(user.id, otp, expiresAt);

  const sent = await sendTelegramMessage(user.telegram_id, `Ваш код для входа/сброса PIN: ${otp}. Действует 10 минут.`);
  
  if (sent) {
    res.json({ success: true, message: 'OTP sent via Telegram' });
  } else {
    res.status(500).json({ error: 'Failed to send Telegram message' });
  }
});

// Reset PIN with OTP
app.post('/api/auth/reset-pin', async (req, res) => {
  const { userId, otp, newPin } = req.body;
  
  const otpRecord: any = db.prepare('SELECT * FROM otps WHERE user_id = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 1').get(userId, otp);
  
  if (!otpRecord) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const hash = await bcrypt.hash(newPin, 10);
  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hash, userId);
  db.prepare('DELETE FROM otps WHERE user_id = ?').run(userId); // Clear OTPs

  res.json({ success: true });
});

// 3. Friend Search
app.get('/api/friends/search', (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string') return res.json({ results: [] });

  const searchParam = `%${query}%`;
  const users = db.prepare('SELECT id, username, app_id FROM users WHERE username LIKE ? OR id = ? LIMIT 10').all(searchParam, query);
  
  res.json({ results: users });
});

// Add Friend
app.post('/api/friends/add', (req, res) => {
  const { userId, friendId } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(userId, friendId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// Get Friends
app.get('/api/friends/:userId', (req, res) => {
  const { userId } = req.params;
  const friends = db.prepare(`
    SELECT u.id, u.username 
    FROM friends f 
    JOIN users u ON f.friend_id = u.id 
    WHERE f.user_id = ?
  `).all(userId);
  res.json({ friends });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
