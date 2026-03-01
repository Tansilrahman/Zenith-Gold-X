import { safeGet, safeAll } from '../models/database.js';

const getLeaderboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        const citizensQuery = `
            SELECT id, name, email, walletBalance 
            FROM users 
            WHERE role = 'Citizen' 
            ORDER BY walletBalance DESC 
            LIMIT ? OFFSET ?
        `;

        const workersQuery = `
            SELECT id, name, email, walletBalance, successfulCollectionsCount 
            FROM users 
            WHERE role = 'Worker' 
            ORDER BY successfulCollectionsCount DESC 
            LIMIT ? OFFSET ?
        `;

        const [topCitizens, topWorkers] = await Promise.all([
            safeAll(citizensQuery, [limit, offset]),
            safeAll(workersQuery, [limit, offset])
        ]);

        res.status(200).json({ topCitizens, topWorkers, page, limit });
    } catch (error) {
        console.error('Leaderboard Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAdminAnalytics = async (req, res) => {
    try {
        const city = req.query.city;
        const cityFilter = city ? ` AND city = ?` : '';
        const cityParams = city ? [city] : [];

        const queries = {
            totalUsers: [`SELECT COUNT(*) as count FROM users WHERE role = 'Citizen'`, []],
            totalWorkers: [`SELECT COUNT(*) as count FROM users WHERE role = 'Worker'`, []],
            totalSubmissions: [`SELECT COUNT(*) as count FROM WasteSubmissions WHERE 1=1${cityFilter}`, cityParams],
            totalCollected: [`SELECT COUNT(*) as count FROM WasteSubmissions WHERE collectionStatus = 'COLLECTED'${cityFilter}`, cityParams],
            totalWeightCollected: [`SELECT SUM(IFNULL(weightKg, 0)) as count FROM WasteSubmissions WHERE collectionStatus = 'COLLECTED'${cityFilter}`, cityParams],
            totalZGXDistributed: [`SELECT SUM(IFNULL(citizenReward, 0) + IFNULL(workerReward, 0)) as count FROM IncentiveLogs`, []],
            duplicateAttempts: [`SELECT COUNT(*) as count FROM WasteSubmissions WHERE imageHash IN (SELECT imageHash FROM WasteSubmissions GROUP BY imageHash HAVING COUNT(*) > 1)${cityFilter}`, cityParams],
            submissionsLast24Hours: [`SELECT COUNT(*) as count FROM WasteSubmissions WHERE submissionTimestamp >= datetime('now', '-1 day')${cityFilter}`, cityParams],
            totalBaseValue: [`SELECT SUM(IFNULL(baseValue, 0)) as count FROM WasteSubmissions WHERE collectionStatus = 'COLLECTED'${cityFilter}`, cityParams],
            totalCitizenRewards: [`SELECT SUM(IFNULL(citizenReward, 0)) as count FROM IncentiveLogs`, []],
            totalWorkerRewards: [`SELECT SUM(IFNULL(workerReward, 0)) as count FROM IncentiveLogs`, []],
            totalActiveGardens: [`SELECT COUNT(*) as count FROM TerraceGardens WHERE milestoneUnlocked = 0`, []],
            totalCompletedGardens: [`SELECT COUNT(*) as count FROM TerraceGardens WHERE milestoneUnlocked = 1`, []],
            totalGardenRewards: [`SELECT SUM(IFNULL(citizenReward, 0)) as count FROM IncentiveLogs WHERE activityType = 'GARDEN'`, []]
        };

        const keys = Object.keys(queries);
        const results = await Promise.all(keys.map(key => safeGet(queries[key][0], queries[key][1])));

        const metrics = {};
        keys.forEach((key, i) => {
            metrics[key] = results[i] ? (results[i].count || 0) : 0;
        });

        // Compute additional fields
        metrics.sustainabilityReserve = (metrics.totalBaseValue || 0) - (metrics.totalZGXDistributed || 0);
        metrics.landfillDiversionEstimate = (metrics.totalWeightCollected || 0) * 0.6;

        const totalBase = metrics.totalBaseValue || 1;
        metrics.reserveRatio = ((metrics.sustainabilityReserve / totalBase) * 100).toFixed(1);

        if (metrics.sustainabilityReserve < 0) {
            metrics.healthStatus = "CRITICAL: RESERVE IMBALANCE";
        } else if (metrics.reserveRatio > 40) {
            metrics.healthStatus = "Healthy";
        } else if (metrics.reserveRatio >= 20) {
            metrics.healthStatus = "Monitor";
        } else {
            metrics.healthStatus = "Risk";
        }

        // AI Metrics
        const systemMetrics = await safeAll(`SELECT * FROM SystemMetrics`);
        const aiData = {};
        if (systemMetrics) {
            systemMetrics.forEach(r => aiData[r.metricKey] = r.metricValue);
        }

        metrics.totalAISubmissions = aiData.totalAISubmissions || 0;
        metrics.totalAIRejections = aiData.totalAIRejections || 0;
        const totalConfidence = aiData.totalConfidenceSum || 0;
        metrics.averageConfidenceScore = metrics.totalAISubmissions > 0
            ? (totalConfidence / metrics.totalAISubmissions).toFixed(1)
            : 0;

        res.status(200).json(metrics);
    } catch (error) {
        console.error('Admin Analytics Error:', error.message);
        res.status(500).json({ message: 'Failed to load analytics' });
    }
};

export { getLeaderboard, getAdminAnalytics };
