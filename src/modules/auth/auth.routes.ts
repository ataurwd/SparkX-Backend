import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  quickLogin
} from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/quick-login', quickLogin);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
