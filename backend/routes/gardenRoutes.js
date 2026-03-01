import express from 'express';
import multer from 'multer';
import { getGardenStatus, startGarden, updateGarden, claimReward } from '../controllers/gardenController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => cb(null, `garden-${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
    // Accept any image format (JPEG, PNG, WebP, HEIC, etc.)
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed.'), false);
    }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 6 * 1024 * 1024 } });

router.use(verifyToken);
// Garden feature is only for Citizens
router.use(requireRole(['Citizen']));

router.get('/status', getGardenStatus);
router.post('/start', upload.single('image'), startGarden);
router.post('/update', upload.single('image'), updateGarden);
router.post('/claim', claimReward);

export default router;
