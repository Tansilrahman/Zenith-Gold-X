/**
 * dbWrapper.js — Phase 2: Safe DB Wrapper
 *
 * Rules:
 *  - All DB calls are wrapped in try/catch
 *  - Never expose raw SQLite errors externally
 *  - Parameterized queries only — never dynamic SQL
 *  - Structured JSON errors always
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const schemaPath = path.resolve(process.cwd(), 'schema.sql');

export let db;

// ---------------------------------------------------------------
// initDb — opens DB and applies schema.sql
// ---------------------------------------------------------------
export async function initDb() {
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Enable WAL mode for concurrent read performance
    await db.exec('PRAGMA journal_mode = WAL');
    await db.exec('PRAGMA foreign_keys = ON');

    // Apply canonical schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Split on semicolons and execute each statement individually
    const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
        try {
            await db.exec(stmt + ';');
        } catch (err) {
            // Ignore "already exists" and migration errors gracefully
            if (!err.message.includes('already exists') &&
                !err.message.includes('duplicate column')) {
                console.warn('[SCHEMA WARN]', err.message.substring(0, 80));
            }
        }
    }

    console.log('[DB] Connected and schema applied.');

    // ---------------------------------------------------------------
    // Safe column migrations — add missing columns to existing tables
    // Silently ignored if column already exists
    // ---------------------------------------------------------------
    const migrations = [
        `ALTER TABLE users ADD COLUMN hasCompletedGarden INTEGER DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN walletBalance INTEGER DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN successfulCollectionsCount INTEGER DEFAULT 0`,
        `ALTER TABLE WasteSubmissions ADD COLUMN city TEXT DEFAULT 'Madurai'`,
        `ALTER TABLE WasteSubmissions ADD COLUMN baseValue INTEGER DEFAULT 0`,
    ];

    for (const m of migrations) {
        try {
            await db.exec(m);
        } catch (_) {
            // Column already exists — this is expected and safe
        }
    }
}

// ---------------------------------------------------------------
// Phase 2 — Safe wrappers (parameterized only)
// ---------------------------------------------------------------

/** Fetch one row. Returns null if not found — never throws null crash. */
export async function safeGet(query, params = []) {
    try {
        const row = await db.get(query, params);
        return row ?? null;
    } catch (err) {
        console.error('[DB GET ERROR]', err.message);
        throw new Error('Database read failure');
    }
}

/** Fetch all rows. Returns empty array if none. */
export async function safeAll(query, params = []) {
    try {
        const rows = await db.all(query, params);
        return Array.isArray(rows) ? rows : [];
    } catch (err) {
        console.error('[DB ALL ERROR]', err.message);
        throw new Error('Database read failure');
    }
}

/** Execute insert/update/delete. Returns { lastID, changes }. */
export async function safeRun(query, params = []) {
    try {
        return await db.run(query, params);
    } catch (err) {
        console.error('[DB RUN ERROR]', err.message);
        throw new Error('Database write failure');
    }
}

// ---------------------------------------------------------------
// Phase 3 — Transaction helpers
// ---------------------------------------------------------------

/**
 * Run a callback inside BEGIN IMMEDIATE TRANSACTION.
 * Automatically ROLLBACK on any error.
 *
 * Usage:
 *   const result = await withTransaction(async () => {
 *     await safeRun(...);
 *     return { success: true };
 *   });
 */
export async function withTransaction(fn) {
    await db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
        const result = await fn();
        await db.exec('COMMIT');
        return result;
    } catch (err) {
        try { await db.exec('ROLLBACK'); } catch (_) { }
        throw err;
    }
}

// ---------------------------------------------------------------
// Phase 7 — Null-safe coercions
// ---------------------------------------------------------------

/** Wallet always returns a safe non-negative integer */
export function safeWallet(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** Worker count always returns a safe non-negative integer */
export function safeCount(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
