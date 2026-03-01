import express from 'express';
import multer from 'multer';
import path from 'path';
import { submitWaste, getPendingWaste, verifyWaste, getHistory } from '../controllers/wasteController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();

// AI submission route: 10 requests per minute per userId
const submitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user.id, // limit by userId
    message: { message: "Too many submissions. Please try again later." }
});

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
    // Accept any image format — JPEG, PNG, WebP, HEIC, etc.
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply verifyToken to all specific routes individually or router-level
router.use(verifyToken);

router.post('/submit', requireRole(['Citizen']), submitLimiter, upload.single('image'), submitWaste);
router.get('/history', requireRole(['Citizen']), getHistory);
router.get('/pending', requireRole(['Worker']), getPendingWaste);
router.post('/verify/:id', requireRole(['Worker']), verifyWaste);

export default router;
