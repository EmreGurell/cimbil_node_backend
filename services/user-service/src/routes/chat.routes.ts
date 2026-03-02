import { Router } from 'express';

import { requireAuth } from '../middleware/auth';
import * as ChatController from '../controllers/chat.controller';

const router = Router();

router.get('/chat-history',    requireAuth, ChatController.getChatHistory);
router.post('/chat-history',   requireAuth, ChatController.saveMessage);
router.delete('/chat-history', requireAuth, ChatController.clearHistory);

export default router;
