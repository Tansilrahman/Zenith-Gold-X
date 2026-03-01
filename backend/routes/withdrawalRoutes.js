import express from 'express';
import { requestWithdrawal, getWithdrawals, processWithdrawal } from '../controllers/withdrawalController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/withdraw', verifyToken, requestWithdrawal);
router.get('/history', verifyToken, getWithdrawals);
router.post('/process', verifyToken, requireRole(['Admin']), processWithdrawal);

export default router;
