import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as ctrl from '../controllers/nutrition.controller';

const router = Router();

router.get('/get-by-date', requireAuth, ctrl.getByDate);
router.post('/log',        requireAuth, ctrl.createLog);
router.delete('/log/:id',  requireAuth, ctrl.deleteLog);
router.get('/history',     requireAuth, ctrl.getHistory);

export default router;
