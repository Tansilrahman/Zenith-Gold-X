import { db, safeGet, safeAll, safeRun } from '../models/database.js';
import { logAudit } from './auditService.js';

const processReward = async ({ activityId, citizenId, workerId, weightKg }) => {
    // Validation 
    if (!weightKg || !Number.isFinite(Number(weightKg)) || weightKg <= 0 || weightKg > 50) {
        throw new Error('Valid weightBetween 0.1 and 50 is required');
    }

    const ratePerKg = 10;
    const baseValue = Math.floor(Number(weightKg) * ratePerKg);
    const citizenReward = Math.floor(baseValue * 0.35);

    try {
        await db.exec('BEGIN EXCLUSIVE TRANSACTION');

        // 1. Re-fetch submission specifically inside transaction for atomic state check
        const submission = await safeGet(`SELECT * FROM WasteSubmissions WHERE id = ? AND workerVerified = 0`, [activityId]);
        if (!submission) {
            await db.exec('ROLLBACK');
            throw new Error('Submission not found or already verified.');
        }

        // 2. Compute reserve mathematically inside transaction
        // Include baseValue of current submission — it enters the economy right now
        const baseRes = await safeGet(`SELECT SUM(baseValue) as total FROM WasteSubmissions WHERE collectionStatus = 'COLLECTED'`);
        const distRes = await safeGet(`SELECT SUM(citizenReward + workerReward) as total FROM IncentiveLogs`);

        let reserve = (baseRes?.total || 0) + baseValue - (distRes?.total || 0);

        if (reserve < citizenReward) {
            await db.exec('ROLLBACK');
            logAudit({ actionType: 'RESERVE_BLOCK', userId: workerId, referenceId: activityId, metadata: { reserve, required: citizenReward } });
            throw new Error('Insufficient sustainability reserve for payout.');
        }

        // 3. Tag WasteSubmissions as Verified
        const updateRes = await safeRun(
            `UPDATE WasteSubmissions SET workerVerified = 1, workerId = ?, weightKg = ?, baseValue = ?, collectionStatus = 'COLLECTED' WHERE id = ? AND workerVerified = 0`,
            [workerId, Number(weightKg), baseValue, activityId]
        );

        if (updateRes.changes === 0) {
            await db.exec('ROLLBACK');
            throw new Error('Concurrency conflict: already verified.');
        }

        // 4. Add reward to Citizen wallet
        await safeRun(`UPDATE users SET walletBalance = walletBalance + ? WHERE id = ?`, [citizenReward, citizenId]);
        reserve -= citizenReward;

        // 5. Increment Worker count
        await safeRun(`UPDATE users SET successfulCollectionsCount = successfulCollectionsCount + 1 WHERE id = ?`, [workerId]);

        // 6. Fetch Worker for Milestone Check
        const worker = await safeGet(`SELECT successfulCollectionsCount FROM users WHERE id = ?`, [workerId]);

        let workerBonus = 0;
        let milestoneStatus = 'NONE';

        if (worker && worker.successfulCollectionsCount > 0 && worker.successfulCollectionsCount % 10 === 0) {
            const milestoneNumber = Math.floor(worker.successfulCollectionsCount / 10);

            // Deduct from reserve check
            if (reserve >= 150) {
                workerBonus = 150;
                await safeRun(`UPDATE users SET walletBalance = walletBalance + ? WHERE id = ?`, [workerBonus, workerId]);
                reserve -= 150;
                milestoneStatus = 'PAID';
                logAudit({ actionType: 'MILESTONE_UNLOCKED', userId: workerId, referenceId: milestoneNumber, metadata: { amount: 150 } });
            } else {
                await safeRun(`INSERT OR IGNORE INTO MilestoneQueue (workerId, amount, milestoneNumber, status) VALUES (?, 150, ?, 'PENDING')`, [workerId, milestoneNumber]);
                milestoneStatus = 'QUEUED';
                logAudit({ actionType: 'MILESTONE_QUEUED', userId: workerId, referenceId: milestoneNumber, metadata: { reserve } });
            }

            // Flush queue if reserve permits
            if (reserve > 0) {
                const pendingPayouts = await safeAll(`SELECT * FROM MilestoneQueue WHERE status = 'PENDING' ORDER BY createdAt ASC`);
                if (pendingPayouts) {
                    for (const payout of pendingPayouts) {
                        if (reserve >= payout.amount) {
                            await safeRun(`UPDATE MilestoneQueue SET status = 'PAID' WHERE id = ? AND status = 'PENDING'`, [payout.id]);
                            await safeRun(`UPDATE users SET walletBalance = walletBalance + ? WHERE id = ?`, [payout.amount, payout.workerId]);
                            await safeRun(`INSERT INTO IncentiveLogs (activityType, activityId, citizenId, workerId, citizenReward, workerReward) VALUES ('QUEUE_PAYOUT', ?, 0, ?, 0, ?)`, [payout.id, payout.workerId, payout.amount]);
                            reserve -= payout.amount;
                            logAudit({ actionType: 'QUEUE_FLUSHED', userId: payout.workerId, referenceId: payout.id, metadata: { amount: payout.amount } });
                        } else break;
                    }
                }
            }
        }

        // 7. Insert IncentiveLog
        await safeRun(
            `INSERT INTO IncentiveLogs (activityType, activityId, citizenId, workerId, citizenReward, workerReward) VALUES ('WASTE', ?, ?, ?, ?, ?)`,
            [activityId, citizenId, workerId, citizenReward, workerBonus]
        );

        logAudit({
            actionType: 'WORKER_VERIFICATION',
            userId: workerId,
            referenceId: activityId,
            metadata: { citizenId, weightKg, baseValue, citizenReward, workerBonus, milestoneStatus }
        });

        await db.exec('COMMIT');
        return { baseValue, citizenReward, workerBonus };

    } catch (error) {
        try { await db.exec('ROLLBACK'); } catch (e) { }
        console.error('Reward Processing Error:', error.message);
        throw error;
    }
};

export { processReward };
