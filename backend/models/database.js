/**
 * database.js — backward-compatible re-export from dbWrapper.js
 *
 * All existing controllers still import from '../models/database.js'.
 * This file now delegates to dbWrapper.js so all 8 phases apply
 * without touching any controller.
 */

export {
  db,
  initDb,
  safeGet,
  safeAll,
  safeRun,
  withTransaction,
  safeWallet,
  safeCount
} from './dbWrapper.js';
