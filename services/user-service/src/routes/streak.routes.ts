import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import * as StreakController from '../controllers/streak.controller';

const router = Router();

router.post('/streak/check', requireAuth, StreakController.checkStreak);

export default router;
