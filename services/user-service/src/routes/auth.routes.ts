import { Router } from 'express';

import * as AuthController from '../controllers/auth.controller';

const router = Router();

// Public — JWT gerekmez (gateway bypass eder)
router.post('/register',        AuthController.register);
router.post('/verify-email',    AuthController.verifyEmail);
router.post('/resend-code',     AuthController.resendCode);
router.post('/login',           AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password',  AuthController.resetPassword);

export default router;
