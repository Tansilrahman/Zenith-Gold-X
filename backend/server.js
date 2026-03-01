/**
 * server.js — Zenith Gold X™ Production Backend
 *
 * Phase Coverage:
 *  Phase 1  — Database via schema.sql
 *  Phase 2  — Safe DB wrapper (dbWrapper.js)
 *  Phase 3  — Transaction safety (withTransaction)
 *  Phase 4  — Input validation guards
 *  Phase 5  — JWT 7d + structured login response
 *  Phase 6  — Global error handler + unhandledRejection
 *  Phase 7  — Null crash protection
 *  Phase 8  — All guarantees enforced
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

import { initDb } from './models/dbWrapper.js';
import authRoutes from './routes/authRoutes.js';
import wasteRoutes from './routes/wasteRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import gardenRoutes from './routes/gardenRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';

// ---------------------------------------------------------------
// PHASE 1 — Startup Validation
// ---------------------------------------------------------------
if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('[FATAL] GOOGLE_AI_API_KEY not set in .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5005;

// ---------------------------------------------------------------
// PHASE 4 — Request limits + Middleware
// ---------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Try again later.' }
});

app.use(globalLimiter);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Handle oversized payloads cleanly (413 instead of 500)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Maximum 10MB allowed.' });
  }
  next(err);
});

// ---------------------------------------------------------------
// Static file serving (uploaded images)
// ---------------------------------------------------------------
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ---------------------------------------------------------------
// Routes
// ---------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/garden', gardenRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api', analyticsRoutes);

app.get('/api', (_req, res) => {
  res.json({ message: 'Zenith Gold X API is running', status: 'ok' });
});

// ---------------------------------------------------------------
// Monolithic Frontend Serving (For Judges/Vercel/Render)
// ---------------------------------------------------------------
const frontendDist = path.join(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    } else {
      res.status(404).json({ message: 'Endpoint not found' });
    }
  });
}

// ---------------------------------------------------------------
// PHASE 6 — Global Error Handler (catches everything)
// ---------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// ---------------------------------------------------------------
// PHASE 6 — Unhandled Rejection / Exception Guards
// ---------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  process.exit(1);
});

// ---------------------------------------------------------------
// PHASE 1 — Async Startup: DB first, then listen
// ---------------------------------------------------------------
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[FATAL] Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
