import { Router } from 'express';
import * as ctrl from '../controllers/internal.controller';

const router = Router();

// Called by Recipe Service to add a nutrition log entry
router.post('/log', ctrl.createLog);

export default router;
