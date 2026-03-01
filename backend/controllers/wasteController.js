import crypto from 'crypto';
import fs from 'fs';
import { db, safeGet, safeAll, safeRun } from '../models/database.js';
import { processReward } from '../services/rewardService.js';
import { analyzeWasteImageWithAI } from '../services/wasteService.js';
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

const submitWaste = async (req, res) => {
    let localPath = req.file ? req.file.path : null;
    try {
        const { selectedCategory, latitude, longitude } = req.body;
        const userId = req.user.id;

        if (!selectedCategory || latitude == null || longitude == null) {
            if (localPath && fs.existsSync(localPath)) { try { if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } } } catch (e) { } }
            return res.status(400).json({ message: 'Location required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Image required' });
        }

        const validCategories = ['Dry Waste', 'Wet Waste', 'Electronic Waste', 'Hazardous'];
        if (!validCategories.includes(selectedCategory)) {
            if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
            return res.status(400).json({ message: 'Invalid waste category selected.' });
        }

        const latNum = Number(latitude);
        const lonNum = Number(longitude);

        if (isNaN(latNum) || isNaN(lonNum)) {
            if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
            return res.status(400).json({ message: 'Invalid coordinates provided.' });
        }

        const fileBuffer = fs.readFileSync(localPath);
        if (fileBuffer.length > 8 * 1024 * 1024) {
            if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
            return res.status(400).json({ message: 'Image too large (max 8MB)' });
        }

        const imagePath = `/uploads/${req.file.filename}`;
        const originalName = req.file.originalname;
        const imageHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const city = req.body.city || 'Madurai';

        // Strict Duplication Check
        try {
            const existing = await safeGet(`SELECT id FROM WasteSubmissions WHERE imageHash = ?`, [imageHash]);
            if (existing) {
                if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
                return res.status(400).json({ message: 'Duplicate image detected' });
            }
        } catch (dbError) {
            if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
            console.error('DB Duplicate Check Error:', dbError.message);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // AI Analysis
        const aiValidation = await analyzeWasteImageWithAI(fileBuffer, originalName);
        if (!aiValidation.isWaste) {
            if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
            return res.status(400).json({ message: 'Image rejected: not valid waste material.' });
        }

        try {
            const insertResult = await safeRun(
                `INSERT INTO WasteSubmissions 
                (userId, imagePath, imageHash, selectedCategory, predictedCategory, confidenceScore, latitude, longitude, city, workerVerified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [userId, imagePath, imageHash, selectedCategory, aiValidation.wasteType, aiValidation.confidenceScore, latNum, lonNum, city]
            );

            logAudit({
                actionType: 'WASTE_SUBMISSION_ACCEPTED',
                userId,
                role: 'Citizen',
                referenceId: insertResult.lastID,
                metadata: { category: aiValidation.wasteType, confidence: aiValidation.confidenceScore, city }
            });

            return res.status(201).json({
                message: 'Waste submitted successfully',
                predictedCategory: aiValidation.wasteType,
                confidenceScore: aiValidation.confidenceScore
            });
        } catch (dbError) {
            if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
            console.error('DB Insert Error:', dbError.message);
            return res.status(500).json({ message: 'Upload failed' });
        }
    } catch (error) {
        if (localPath && fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch (e) { } }
        console.error('Submit Error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const getPendingWaste = async (req, res) => {
    try {
        const rows = await safeAll(`SELECT * FROM WasteSubmissions WHERE workerVerified = 0 ORDER BY submissionTimestamp DESC`);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Get Pending Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch pending submissions' });
    }
};

const verifyWaste = async (req, res) => {
    try {
        const wasteId = req.params.id;
        const workerId = req.user.id;
        const { weightKg, workerLatitude, workerLongitude } = req.body;

        if (!workerLatitude || !workerLongitude) {
            return res.status(400).json({ message: 'Worker geographical coordinates are mandatory.' });
        }

        const latNum = Number(workerLatitude);
        const lonNum = Number(workerLongitude);

        if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
            return res.status(400).json({ message: 'Invalid coordinates provided.' });
        }

        const submission = await safeGet(`SELECT * FROM WasteSubmissions WHERE id = ?`, [wasteId]);
        if (!submission) {
            return res.status(404).json({ message: 'Waste submission not found.' });
        }
        if (submission.workerVerified) {
            return res.status(400).json({ message: 'Already verified.' });
        }

        // Geo jump check (Log only)
        const lastJob = await safeGet(
            `SELECT latitude, longitude, submissionTimestamp FROM WasteSubmissions 
            WHERE workerId = ? AND workerVerified = 1 
            ORDER BY submissionTimestamp DESC LIMIT 1`,
            [workerId]
        );

        if (lastJob) {
            const timeDiffSec = (Date.now() - new Date(lastJob.submissionTimestamp).getTime()) / 1000;
            if (timeDiffSec < 60) {
                const jumpDist = getDistanceInMeters(lastJob.latitude, lastJob.longitude, latNum, lonNum);
                if (jumpDist > 5000) {
                    console.warn(`[SUSPICIOUS ACTIVITY] Worker ${workerId} jumped excessively.`);
                }
            }
        }

        const distance = getDistanceInMeters(submission.latitude, submission.longitude, latNum, lonNum);
        if (distance > 500) {
            return res.status(400).json({ message: 'Verification rejected. You must be within 500 meters.' });
        }

        const rewardSummary = await processReward({
            activityId: wasteId,
            citizenId: submission.userId,
            workerId: workerId,
            weightKg: parseFloat(weightKg)
        });

        res.status(200).json({
            message: 'Collection Verified',
            rewardSummary
        });
    } catch (error) {
        console.error('Verify Error:', error.message);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        const rows = await safeAll(
            `SELECT id, selectedCategory, predictedCategory, submissionTimestamp, collectionStatus, weightKg, baseValue, city 
            FROM WasteSubmissions WHERE userId = ? ORDER BY submissionTimestamp DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        res.status(200).json(Array.isArray(rows) ? rows : []);
    } catch (error) {
        console.error('History Fetch Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch history' });
    }
};

export { submitWaste, getPendingWaste, verifyWaste, getHistory };
