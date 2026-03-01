import { safeRun } from '../models/database.js';

/**
 * System Audit Logger
 * Log action without blocking core flow
 */
export const logAudit = async ({ actionType, userId = null, role = null, referenceId = null, metadata = {} }) => {
    try {
        const query = `
            INSERT INTO SystemAuditLogs (actionType, userId, role, referenceId, metadata)
            VALUES (?, ?, ?, ?, ?)
        `;
        const metaString = JSON.stringify(metadata);
        await safeRun(query, [actionType, userId, role, referenceId, metaString]);
    } catch (e) {
        console.error('[AUDIT LOG ERROR]', e.message);
    }
};
