import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import * as ProfileController from '../controllers/profile.controller';

const router = Router();

router.get('/me',      requireAuth, ProfileController.getMe);
router.post('/profile', requireAuth, ProfileController.upsertProfile);
router.put('/profile',  requireAuth, ProfileController.upsertProfile);
router.get('/profile',  requireAuth, ProfileController.getProfile);

export default router;
