/**
 * withdrawalController.js — Phase 3+4+7+8 Hardened
 *
 * Guarantees:
 *  - No negative wallet (Phase 7)
 *  - No double withdraw (Phase 8 — BEGIN IMMEDIATE via withTransaction)
 *  - Input validation before any DB call (Phase 4)
 *  - Structured JSON always (Phase 2)
 *  - No raw SQLite errors exposed (Phase 2)
 */

import { safeGet, safeAll, safeRun, withTransaction } from '../models/database.js';
import { logAudit } from '../services/auditService.js';

// ---------------------------------------------------------------
// Phase 4 — Input validation helper
// ---------------------------------------------------------------
function validateAmount(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 100) return null;
    return n;
}

// ---------------------------------------------------------------
// POST /api/withdrawals/withdraw
// Phase 3: BEGIN IMMEDIATE → check balance → deduct → insert → COMMIT
// Phase 4: Reject amount < 100, reject null/NaN
// Phase 7: walletBalance always coerced to Number, never negative
// Phase 8: Prevents double-withdraw via exclusive transaction
// ---------------------------------------------------------------
const requestWithdrawal = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    const amount = validateAmount(req.body.zgxAmount);
    if (!amount) {
        return res.status(400).json({ message: 'Minimum withdrawal is 100 ZGX.' });
    }

    try {
        const result = await withTransaction(async () => {
            // Phase 7: null-safe user fetch
            const user = await safeGet('SELECT walletBalance FROM users WHERE id = ?', [userId]);
            if (!user) throw { status: 404, message: 'User not found.' };

            // Phase 7: always coerce to safe number
            const balance = Math.max(0, Number(user.walletBalance) || 0);
            if (balance < amount) throw { status: 400, message: 'Insufficient ZGX balance.' };

            // Phase 8: atomic deduction — prevents negative wallet
            await safeRun(
                'UPDATE users SET walletBalance = walletBalance - ? WHERE id = ? AND walletBalance >= ?',
                [amount, userId, amount]
            );

            const inserted = await safeRun(
                'INSERT INTO Withdrawals (userId, zgxAmount, rupeeValue, status) VALUES (?, ?, ?, ?)',
                [userId, amount, amount, 'pending']
            );

            return { withdrawalId: inserted.lastID };
        });

        logAudit({ actionType: 'WITHDRAWAL_REQUESTED', userId, referenceId: result.withdrawalId, metadata: { amount } });
        return res.status(200).json({ message: 'Withdrawal request submitted successfully.', rupeeValue: amount });

    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        console.error('[WITHDRAWAL]', err.message);
        return res.status(500).json({ message: 'Withdrawal failed.' });
    }
};

// ---------------------------------------------------------------
// GET /api/withdrawals/history
// ---------------------------------------------------------------
const getWithdrawals = async (req, res) => {
    try {
        const { id: userId, role } = req.user;

        const rows = role === 'Admin'
            ? await safeAll('SELECT w.*, u.name as userName FROM Withdrawals w JOIN users u ON w.userId = u.id ORDER BY w.createdAt DESC')
            : await safeAll('SELECT w.*, u.name as userName FROM Withdrawals w JOIN users u ON w.userId = u.id WHERE w.userId = ? ORDER BY w.createdAt DESC', [userId]);

        return res.status(200).json(rows ?? []);
    } catch (err) {
        console.error('[GET WITHDRAWALS]', err.message);
        return res.status(500).json({ message: 'Failed to fetch withdrawals.' });
    }
};

// ---------------------------------------------------------------
// POST /api/withdrawals/process — Admin only
// Phase 3: BEGIN IMMEDIATE → verify pending → approve/reject → COMMIT
// ---------------------------------------------------------------
const processWithdrawal = async (req, res) => {
    if (req.user?.role !== 'Admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }

    const { withdrawalId, status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }
    if (!withdrawalId) {
        return res.status(400).json({ message: 'withdrawalId is required.' });
    }

    try {
        await withTransaction(async () => {
            const row = await safeGet('SELECT * FROM Withdrawals WHERE id = ?', [withdrawalId]);
            if (!row) throw { status: 404, message: 'Withdrawal not found.' };
            if (row.status !== 'pending') throw { status: 400, message: 'Withdrawal already processed.' };

            if (status === 'rejected') {
                await safeRun('UPDATE users SET walletBalance = walletBalance + ? WHERE id = ?', [row.zgxAmount, row.userId]);
            }
            await safeRun('UPDATE Withdrawals SET status = ? WHERE id = ?', [status, withdrawalId]);
        });

        logAudit({ actionType: `WITHDRAWAL_${status.toUpperCase()}`, userId: req.user.id, referenceId: withdrawalId });
        return res.status(200).json({ message: `Withdrawal ${status}.` });

    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        console.error('[PROCESS WITHDRAWAL]', err.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export { requestWithdrawal, getWithdrawals, processWithdrawal };
