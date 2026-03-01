-- ============================================================
-- Zenith Gold X™ — Canonical Database Schema
-- Phase 1: All tables, constraints, and indexes
-- ============================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  name                      TEXT    NOT NULL,
  email                     TEXT    UNIQUE NOT NULL,
  passwordHash              TEXT    NOT NULL,
  role                      TEXT    CHECK(role IN ('Citizen','Worker','Admin')) NOT NULL,
  walletBalance             INTEGER DEFAULT 0,
  successfulCollectionsCount INTEGER DEFAULT 0,
  hasCompletedGarden        INTEGER DEFAULT 0,
  createdAt                 DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- Waste Submissions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS WasteSubmissions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  userId              INTEGER NOT NULL,
  imagePath           TEXT    NOT NULL,
  imageHash           TEXT    NOT NULL UNIQUE,
  selectedCategory    TEXT    NOT NULL,
  predictedCategory   TEXT,
  confidenceScore     INTEGER,
  latitude            REAL    NOT NULL,
  longitude           REAL    NOT NULL,
  city                TEXT    DEFAULT 'Madurai',
  submissionTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  workerId            INTEGER,
  weightKg            REAL    DEFAULT 0,
  baseValue           INTEGER DEFAULT 0,
  workerVerified      INTEGER DEFAULT 0,
  collectionStatus    TEXT    DEFAULT 'PENDING',
  FOREIGN KEY (userId)   REFERENCES users(id),
  FOREIGN KEY (workerId) REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- Incentive Logs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS IncentiveLogs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  activityType  TEXT    NOT NULL,
  activityId    INTEGER NOT NULL,
  citizenId     INTEGER NOT NULL,
  workerId      INTEGER NOT NULL,
  citizenReward INTEGER DEFAULT 0,
  workerReward  INTEGER DEFAULT 0,
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (citizenId) REFERENCES users(id),
  FOREIGN KEY (workerId)  REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- Withdrawals
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Withdrawals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  userId     INTEGER NOT NULL,
  zgxAmount  INTEGER NOT NULL,
  rupeeValue INTEGER NOT NULL,
  status     TEXT    DEFAULT 'pending',
  createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- Terrace Gardens
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TerraceGardens (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  userId            INTEGER NOT NULL UNIQUE,
  baselineImagePath TEXT    NOT NULL,
  baselineHash      TEXT    NOT NULL UNIQUE,
  latitude          REAL    NOT NULL,
  longitude         REAL    NOT NULL,
  startDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
  growthCount       INTEGER DEFAULT 0,
  milestoneUnlocked INTEGER DEFAULT 0,
  rewardGiven       INTEGER DEFAULT 0,
  createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- Garden Growth Logs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS GardenGrowthLogs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  gardenId  INTEGER NOT NULL,
  imagePath TEXT    NOT NULL,
  imageHash TEXT    NOT NULL UNIQUE,
  latitude  REAL    NOT NULL,
  longitude REAL    NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gardenId) REFERENCES TerraceGardens(id)
);

-- ----------------------------------------------------------------
-- Milestone Queue (Worker Bonus Payout Buffer)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MilestoneQueue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId        INTEGER NOT NULL,
  amount          INTEGER NOT NULL,
  milestoneNumber INTEGER NOT NULL,
  status          TEXT    DEFAULT 'PENDING',
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workerId) REFERENCES users(id),
  UNIQUE (workerId, milestoneNumber)
);

-- ----------------------------------------------------------------
-- System Audit Logs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SystemAuditLogs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actionType  TEXT    NOT NULL,
  userId      INTEGER,
  role        TEXT,
  referenceId TEXT,
  metadata    TEXT,
  createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- System Metrics (AI quality tracking)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SystemMetrics (
  metricKey   TEXT PRIMARY KEY,
  metricValue REAL DEFAULT 0
);

INSERT OR IGNORE INTO SystemMetrics(metricKey, metricValue) VALUES ('totalAISubmissions', 0);
INSERT OR IGNORE INTO SystemMetrics(metricKey, metricValue) VALUES ('totalAIRejections',  0);
INSERT OR IGNORE INTO SystemMetrics(metricKey, metricValue) VALUES ('totalConfidenceSum', 0);

-- ----------------------------------------------------------------
-- Indexes (Phase 1)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_userId          ON WasteSubmissions(userId);
CREATE INDEX IF NOT EXISTS idx_workerVerified  ON WasteSubmissions(workerVerified);
CREATE INDEX IF NOT EXISTS idx_imageHash       ON WasteSubmissions(imageHash);
CREATE INDEX IF NOT EXISTS idx_createdAt       ON WasteSubmissions(submissionTimestamp);
CREATE INDEX IF NOT EXISTS idx_waste_worker    ON WasteSubmissions(workerId);
CREATE INDEX IF NOT EXISTS idx_waste_city      ON WasteSubmissions(city);
CREATE INDEX IF NOT EXISTS idx_audit_type      ON SystemAuditLogs(actionType);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON SystemAuditLogs(userId);
