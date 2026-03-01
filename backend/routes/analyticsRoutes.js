import express from 'express';
import { getLeaderboard, getAdminAnalytics } from '../controllers/analyticsController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard', getLeaderboard);
router.get('/admin', verifyToken, requireRole(['Admin']), getAdminAnalytics);

export default router;
