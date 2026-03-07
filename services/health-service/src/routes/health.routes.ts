import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as HealthController from '../controllers/health.controller';

const router = Router();

router.use(requireAuth);

router.post('/sync',    HealthController.syncHealth);
router.get('/today',   HealthController.getToday);
router.get('/history', HealthController.getHistory);
router.post('/manual', HealthController.logManual);

export default router;
