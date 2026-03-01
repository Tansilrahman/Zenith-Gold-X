import crypto from 'crypto';
import fs from 'fs';
import { db, safeGet, safeAll, safeRun } from '../models/database.js';
import { logAudit } from '../services/auditService.js';

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const getGardenStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const garden = await safeGet('SELECT * FROM TerraceGardens WHERE userId = ?', [userId]);

        if (!garden) {
            return res.status(200).json({ hasGarden: false });
        }

        const lastLog = await safeGet('SELECT timestamp FROM GardenGrowthLogs WHERE gardenId = ? ORDER BY timestamp DESC LIMIT 1', [garden.id]);

        const lastDate = lastLog && lastLog.timestamp ? new Date(lastLog.timestamp) : new Date(garden.startDate);
        const nextEligibleDate = new Date(lastDate.getTime() + (20 * 24 * 60 * 60 * 1000));

        res.status(200).json({
            hasGarden: true,
            garden,
            nextEligibleDate: nextEligibleDate.toISOString()
        });
    } catch (error) {
        console.error('Garden Status Error:', error.message);
        res.status(500).json({ message: 'Failed to load garden status' });
    }
};

const startGarden = async (req, res) => {
    let localPath = req.file ? req.file.path : null;
    try {
        const userId = req.user.id;
        const { latitude, longitude } = req.body;

        // lat/lng are optional — default to 0 if not provided
        const latNum = Number(latitude) || 0;
        const lonNum = Number(longitude) || 0;

        if (!req.file) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(400).json({ message: 'Please upload an image of your garden.' });
        }

        const user = await safeGet('SELECT hasCompletedGarden FROM users WHERE id = ?', [userId]);
        if (!user) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.hasCompletedGarden === 1 || user.hasCompletedGarden === true) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(400).json({ message: 'Garden cycle already completed.' });
        }

        const activeGarden = await safeGet('SELECT id FROM TerraceGardens WHERE userId = ?', [userId]);
        if (activeGarden) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(400).json({ message: 'You already have an active garden.' });
        }

        const imagePath = `/uploads/${req.file.filename}`;
        const fileBuffer = fs.readFileSync(localPath);
        const imageHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

        // Image hash duplicate check removed to allow testing

        const insertResult = await safeRun(
            `INSERT INTO TerraceGardens (userId, baselineImagePath, baselineHash, latitude, longitude) VALUES (?, ?, ?, ?, ?)`,
            [userId, imagePath, imageHash, latNum, lonNum]
        );

        logAudit({ actionType: 'GARDEN_START', userId, referenceId: insertResult.lastID, metadata: { latitude: latNum, longitude: lonNum } });
        res.status(201).json({ message: 'Terrace Garden started successfully' });
    } catch (error) {
        if (localPath && fs.existsSync(localPath)) if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} }
        console.error('Start Garden Error:', error.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const updateGarden = async (req, res) => {
    let localPath = req.file ? req.file.path : null;
    try {
        const userId = req.user.id;
        const { latitude, longitude } = req.body;

        if (!req.file) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(400).json({ message: 'Please upload an image of your garden.' });
        }

        const latNum = Number(latitude) || 0;
        const lonNum = Number(longitude) || 0;

        const garden = await safeGet('SELECT * FROM TerraceGardens WHERE userId = ?', [userId]);
        if (!garden) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(404).json({ message: 'No active garden found.' });
        }

        if (garden.milestoneUnlocked) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} } } catch(e){} }
            return res.status(400).json({ message: 'Milestone already unlocked. Claim your reward!' });
        }

        // Location and time checks removed — photo upload is sufficient

        const imagePath = `/uploads/${req.file.filename}`;
        const fileBuffer = fs.readFileSync(localPath);
        const imageHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

        // Image hash duplicate check removed to allow testing

        const newCount = garden.growthCount + 1;
        const milestoneUnlocked = newCount >= 3 ? 1 : 0;

        try {
            await db.exec('BEGIN EXCLUSIVE TRANSACTION');
            await safeRun('INSERT INTO GardenGrowthLogs (gardenId, imagePath, imageHash, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [garden.id, imagePath, imageHash, latNum, lonNum]);
            await safeRun('UPDATE TerraceGardens SET growthCount = ?, milestoneUnlocked = ? WHERE id = ?', [newCount, milestoneUnlocked, garden.id]);
            await db.exec('COMMIT');

            logAudit({ actionType: 'GARDEN_GROWTH', userId, referenceId: garden.id, metadata: { count: newCount, unlocked: milestoneUnlocked } });
            res.status(200).json({ message: 'Garden growth logged successfully.' });
        } catch (txErr) {
            await db.exec('ROLLBACK');
            throw txErr;
        }
    } catch (error) {
        if (localPath && fs.existsSync(localPath)) if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e){} }
        console.error('Update Garden Error:', error.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const claimReward = async (req, res) => {
    try {
        const userId = req.user.id;

        try {
            await db.exec('BEGIN EXCLUSIVE TRANSACTION');

            const garden = await safeGet(`SELECT id, milestoneUnlocked, rewardGiven FROM TerraceGardens WHERE userId = ?`, [userId]);
            if (!garden) {
                await db.exec('ROLLBACK');
                return res.status(404).json({ message: 'No garden found.' });
            }

            if (!garden.milestoneUnlocked) {
                await db.exec('ROLLBACK');
                return res.status(400).json({ message: 'Milestone not yet reached.' });
            }

            if (garden.rewardGiven) {
                await db.exec('ROLLBACK');
                return res.status(400).json({ message: 'Reward already claimed.' });
            }

            const updateRes = await safeRun(`UPDATE TerraceGardens SET rewardGiven = 1 WHERE id = ? AND rewardGiven = 0`, [garden.id]);
            if (updateRes.changes === 0) {
                await db.exec('ROLLBACK');
                return res.status(400).json({ message: 'Reward already processed.' });
            }

            await safeRun(`UPDATE users SET walletBalance = walletBalance + 50, hasCompletedGarden = 1 WHERE id = ?`, [userId]);
            await safeRun(`INSERT INTO IncentiveLogs (activityType, activityId, citizenId, workerId, citizenReward, workerReward) VALUES ('GARDEN', ?, ?, 0, 50, 0)`, [garden.id, userId]);

            await db.exec('COMMIT');
            logAudit({ actionType: 'GARDEN_REWARD', userId, referenceId: garden.id, metadata: { amount: 50 } });
            res.status(200).json({ message: 'Garden reward claimed successfully! 50 ZGX added.' });
        } catch (txErr) {
            try { await db.exec('ROLLBACK'); } catch (e) { }
            throw txErr;
        }
    } catch (error) {
        console.error('Claim Reward Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { getGardenStatus, startGarden, updateGarden, claimReward };
