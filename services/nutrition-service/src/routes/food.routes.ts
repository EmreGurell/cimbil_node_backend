import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import * as ctrl from '../controllers/food.controller';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/barcode/:barcode',  requireAuth, ctrl.getByBarcode);
router.post('/analyze-image',    requireAuth, upload.single('image'), ctrl.analyzeImage);

export default router;
